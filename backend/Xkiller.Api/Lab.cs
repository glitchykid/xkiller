using System.Globalization;
using System.Text.Json;
using Xkiller.Core;

namespace Xkiller.Api;

public sealed record Job(string Id, string Kind, string Status, int Progress, string Message, string? Error = null);
public sealed record SavedState(int Version, MarketData Data, Model? Model, Backtest[] Runs, RiskOptions Risk);
public sealed class Lab
{
    private readonly object gate = new();
    private readonly string path;
    private readonly BybitClient bybit;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private SavedState state;
    private Analysis analysis;
    private Job? job;
    private CancellationTokenSource? cancellation;
    public Lab(BybitClient client)
    {
        bybit = client;
        string directory = Environment.GetEnvironmentVariable("XKILLER_DATA") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Xkiller");
        Directory.CreateDirectory(directory); path = Path.Combine(directory, "workspace.json");
        state = File.Exists(path) ? JsonSerializer.Deserialize<SavedState>(File.ReadAllText(path), JsonOptions) ?? throw new InvalidDataException("Cannot read workspace.") : new(1, Market.Demo(), null, [], new());
        if (state.Version != 1) throw new InvalidDataException("Unsupported workspace version. Preserve the file and use a compatible application.");
        Market.Validate(state.Data.Candles);
        analysis = Indicators.Build(state.Data.Candles);
    }
    public object Snapshot()
    {
        lock (gate)
        {
            var data = state.Data;
            var model = state.Model;
            var last = state.Runs.LastOrDefault();
            return new
            {
                data = new { data.Id, data.Source, data.ImportedAt, count = data.Candles.Length, start = data.Candles[0].Time, end = data.Candles[^1].End, fundingCount = data.Funding.Length, synthetic = data.Source.StartsWith("Synthetic") },
                charts = new Dictionary<string, Candle[]> { ["15m"] = data.Candles.TakeLast(100).ToArray(), ["1h"] = Market.Aggregate(data.Candles, 60).TakeLast(100).ToArray(), ["4h"] = Market.Aggregate(data.Candles, 240).TakeLast(100).ToArray() },
                analysis.Frames,
                model,
                prediction = model == null ? null : Learning.Predict(model, analysis.Rows[^1].Values),
                features = Indicators.FeatureNames,
                risk = state.Risk,
                job,
                runs = state.Runs.Select(r => new { r.Id, r.ModelId, r.CreatedAt, r.ReturnPercent, r.MaxDrawdownPercent, count = r.Trades.Length, r.FinalBalance, r.Halted }).Reverse(),
                result = last == null ? null : new { last.Id, last.ModelId, last.DataId, last.CreatedAt, last.Options, last.FinalBalance, last.ReturnPercent, last.MaxDrawdownPercent, last.WinRate, last.ProfitFactor, last.TotalFees, last.TotalFunding, last.Halted, count = last.Trades.Length, trades = last.Trades.TakeLast(100).Reverse(), equity = last.Equity.Where((_, i) => i % Math.Max(1, last.Equity.Length / 200) == 0 || i == last.Equity.Length - 1) }
            };
        }
    }
    public Job Import(int days) => Start("import", async ct =>
    {
        var data = await bybit.Download(days, Report, ct);
        var nextAnalysis = Indicators.Build(data.Candles);
        ct.ThrowIfCancellationRequested();
        lock (gate) { Commit(new(1, data, null, [], state.Risk)); analysis = nextAnalysis; }
    });
    public Job Demo() => Start("demo", ct =>
    {
        var data = Market.Demo(); var nextAnalysis = Indicators.Build(data.Candles);
        ct.ThrowIfCancellationRequested();
        lock (gate) { Commit(new(1, data, null, [], state.Risk)); analysis = nextAnalysis; }
        return Task.CompletedTask;
    });
    public Job Train(TrainingOptions options)
    {
        options.Validate();
        return Start("train", ct =>
        {
            var model = Learning.Train(state.Data, analysis, options, Report, ct);
            ct.ThrowIfCancellationRequested();
            lock (gate) Commit(state with { Model = model, Runs = [] });
            return Task.CompletedTask;
        });
    }
    public Job Simulate(RiskOptions risk)
    {
        risk.Validate();
        lock (gate) if (state.Model == null) throw new ArgumentException("Train a model first.");
        return Start("simulate", ct =>
        {
            var result = Simulation.Run(state.Data, analysis, state.Model!, risk, Report, ct);
            ct.ThrowIfCancellationRequested();
            lock (gate) Commit(state with { Risk = risk, Runs = state.Runs.Append(result).TakeLast(20).ToArray() });
            return Task.CompletedTask;
        });
    }
    public void Cancel() { lock (gate) cancellation?.Cancel(); }
    public object Export(string kind)
    {
        lock (gate)
        {
            if (kind == "model" && state.Model != null) return new { filename = $"xkiller-model-{state.Model.Id}.json", content = JsonSerializer.Serialize(state.Model, JsonOptions), mime = "application/json" };
            if (kind == "report" && state.Runs.Length > 0) return new { filename = $"xkiller-report-{state.Runs[^1].Id}.json", content = JsonSerializer.Serialize(new { source = state.Data.Source, dataset = state.Data.Id, model = state.Model, result = state.Runs[^1] }, JsonOptions), mime = "application/json" };
            if (kind == "trades" && state.Runs.Length > 0)
            {
                var lines = state.Runs[^1].Trades.Select(t => FormattableString.Invariant($"{t.EntryTime},{t.ExitTime},{t.Side},{t.Entry:F4},{t.Exit:F4},{t.Quantity:F6},{t.Pnl:F6},{t.Fees:F6},{t.Funding:F6},{t.Reason}"));
                return new { filename = $"xkiller-trades-{state.Runs[^1].Id}.csv", content = "entryTimeUtcMs,exitTimeUtcMs,side,entry,exit,quantityETH,pnlUSDT,feesUSDT,fundingUSDT,reason\n" + string.Join('\n', lines), mime = "text/csv" };
            }
            throw new ArgumentException("No result available for this export.");
        }
    }
    private Job Start(string kind, Func<CancellationToken, Task> action)
    {
        lock (gate)
        {
            if (job?.Status == "running") throw new InvalidOperationException("Another operation is running.");
            cancellation?.Dispose(); cancellation = new();
            var token = cancellation.Token;
            job = new(Guid.NewGuid().ToString("N")[..8], kind, "running", 0, "Starting…");
            _ = Task.Run(async () =>
            {
                try { await action(token); lock (gate) job = job! with { Status = "completed", Progress = 100, Message = "Completed" }; }
                catch (OperationCanceledException) { lock (gate) job = job! with { Status = "cancelled", Message = "Cancelled. Previous results retained." }; }
                catch (Exception ex) { lock (gate) job = job! with { Status = "failed", Message = "Operation failed. Previous results retained.", Error = ex.Message }; }
            });
            return job;
        }
    }
    private void Report(int value, string message) { lock (gate) job = job! with { Progress = value, Message = message }; }
    private void Commit(SavedState next)
    {
        File.WriteAllText(path + ".tmp", JsonSerializer.Serialize(next, JsonOptions));
        File.Move(path + ".tmp", path, true);
        state = next;
    }
}
