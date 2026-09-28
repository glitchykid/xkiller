using Xkiller.Core;

int passed = 0;
void Test(string name, Action test)
{
    try { test(); passed++; Console.WriteLine("PASS " + name); }
    catch (Exception e) { Console.Error.WriteLine("FAIL " + name + ": " + e); Environment.Exit(1); }
}
void Assert(bool condition, string message) { if (!condition) throw new Exception(message); }
void Near(double a, double b, double tolerance = 1e-8) => Assert(Math.Abs(a - b) < tolerance, $"Expected {b}, got {a}");
void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid input was accepted"); }
var data = Market.Demo(3000);
var analysis = Indicators.Build(data.Candles);
var options = new TrainingOptions(Epochs: 30);
var model = Learning.Train(data, analysis, options, (_, _) => { }, CancellationToken.None);

Test("15m, 1h, 4h features have no future leakage", () =>
{
    var prefix = Indicators.Build(data.Candles.Take(2037).ToArray());
    var full = analysis.Rows.Single(r => r.CandleIndex == 2036);
    foreach (var (a, b) in prefix.Rows[^1].Values.Zip(full.Values)) Near(a, b);
    Assert(full.Values.Length == 24, "Expected 24 features");
});
Test("Aggregation excludes unfinished and leading partial buckets", () =>
{
    var candles = data.Candles.Skip(1).Take(32).ToArray();
    var aggregated = Market.Aggregate(candles, 240);
    Assert(aggregated.Length == 1, "Partial buckets were included");
    Assert(aggregated[0].Time == data.Candles[16].Time && aggregated[0].End == data.Candles[31].End, "Wrong bucket times");
});
Test("Market rejects gaps and invalid OHLC", () =>
{
    Reject(() => Market.Validate(data.Candles.Where((_, i) => i != 1400).ToArray()));
    var changed = data.Candles.ToArray(); changed[100] = changed[100] with { High = 1 };
    Reject(() => Market.Validate(changed));
});
Test("Scaler is fitted only on training data", () =>
{
    for (int j = 0; j < 24; j++) Near(model.Mean[j], analysis.Rows.Take(model.TrainEnd).Average(r => r.Values[j]));
});
Test("Training and validation labels are purged before subsequent folds", () =>
{
    int labeled = analysis.Rows.Count(r => r.CandleIndex + options.Horizon < data.Candles.Length);
    int boundary = (int)(labeled * .6);
    Assert(analysis.Rows[model.TrainEnd - 1].CandleIndex + options.Horizon < analysis.Rows[boundary].CandleIndex, "Train labels overlap validation");
    Assert(analysis.Rows[model.ValidationEnd - 1].CandleIndex + options.Horizon < analysis.Rows[model.TestStart].CandleIndex, "Validation labels overlap test");
});
Test("Changing held-out future does not change trained weights", () =>
{
    var candles = data.Candles.Select((c, i) => i > 2800 ? c with { Open = c.Open * 1.3, Close = c.Close * 1.3, High = c.High * 1.3, Low = c.Low * 1.3 } : c).ToArray();
    var changed = Market.Create("Test", candles, data.Funding);
    var trained = Learning.Train(changed, Indicators.Build(candles), options, (_, _) => { }, CancellationToken.None);
    foreach (var (a, b) in model.Weights.SelectMany(x => x).Zip(trained.Weights.SelectMany(x => x))) Near(a, b);
});
Test("Softmax probabilities are finite and sum to one", () =>
{
    var prediction = Learning.Predict(model, analysis.Rows[^1].Values);
    Assert(prediction.All(x => double.IsFinite(x) && x >= 0 && x <= 1), "Invalid probability"); Near(prediction.Sum(), 1);
});
Test("Training cancellation interrupts work", () =>
{
    using var cts = new CancellationTokenSource(); cts.Cancel();
    try { Learning.Train(data, analysis, options, (_, _) => { }, cts.Token); } catch (OperationCanceledException) { return; }
    throw new Exception("Cancellation was ignored");
});
Test("Risk and training options reject unsafe or nonfinite values", () =>
{
    Reject(() => new RiskOptions(Leverage: 11).Validate()); Reject(() => new RiskOptions(RiskPercent: double.NaN).Validate());
    Reject(() => new TrainingOptions(Epochs: 0).Validate()); Reject(() => new TrainingOptions(LearningRate: double.PositiveInfinity).Validate());
});

(MarketData Data, Analysis Analysis, Model Model) Fixture(int direction, Candle[]? custom = null, Funding[]? funding = null)
{
    long start = data.Candles[0].Time;
    var candles = custom ?? Enumerable.Range(0, 5).Select(i => new Candle(start + Market.Step * i, 100, 101, 99, 100, 1000)).ToArray();
    var rows = candles.Select((c, i) => { var values = new double[24]; values[4] = .01; return new FeatureRow(i, c.End, values); }).ToArray();
    var weights = Enumerable.Range(0, 3).Select(_ => new double[25]).ToArray();
    weights[direction == 1 ? 2 : 0][24] = 20;
    return (new("fixture", "Test", DateTimeOffset.UtcNow, candles, funding ?? []), new(rows, []), model with { DataId = "fixture", Mean = new double[24], Scale = Enumerable.Repeat(1d, 24).ToArray(), Weights = weights, TestStart = 0 });
}
Backtest Sim((MarketData Data, Analysis Analysis, Model Model) f, RiskOptions? risk = null) => Simulation.Run(f.Data, f.Analysis, f.Model, risk ?? new(FeeBps: 0, SlippageBps: 0), (_, _) => { }, CancellationToken.None);
Test("Signal executes at next open, not signal close", () =>
{
    var f = Fixture(1); var c = f.Data.Candles.ToArray(); c[1] = c[1] with { Open = 110, High = 111, Low = 109, Close = 110 };
    var run = Sim(Fixture(1, c), new(FeeBps: 0, SlippageBps: 0, MaxHoldBars: 1));
    Near(run.Trades[0].Entry, 110); Assert(run.Trades[0].EntryTime == c[1].Time, "Wrong execution time");
});
Test("Same-bar stop and take executes stop first", () =>
{
    var f = Fixture(1); var c = f.Data.Candles.ToArray(); c[1] = c[1] with { High = 106, Low = 97 };
    var run = Sim(Fixture(1, c));
    Assert(run.Trades[0].Reason == "Stop loss", "Optimistic same-bar execution"); Near(run.Trades[0].Exit, 98);
    Near(run.Trades[0].Pnl, -50);
});
Test("Long and short pay both fees and adverse slippage", () =>
{
    foreach (int direction in new[] { 1, -1 })
    {
        var run = Sim(Fixture(direction), new(FeeBps: 10, SlippageBps: 10, MaxHoldBars: 1));
        Assert(run.Trades.All(t => t.Pnl < 0 && t.Fees > 0), "Costs missing on flat market");
        Near(run.FinalBalance, run.Options.InitialBalance + run.Trades.Sum(t => t.Pnl));
    }
});
Test("Positive funding debits longs and credits shorts", () =>
{
    foreach (int direction in new[] { 1, -1 })
    {
        var f = Fixture(direction); var funding = new[] { new Funding(f.Data.Candles[2].Time, .001) };
        var run = Sim(Fixture(direction, funding: funding));
        Near(run.TotalFunding, direction * 2.5); Near(run.FinalBalance, 10000 - direction * 2.5);
    }
});
Test("Position respects margin and modeled stop risk", () =>
{
    var run = Sim(Fixture(1), new(Leverage: 1, RiskPercent: 2, FeeBps: 0, SlippageBps: 0));
    Assert(run.Trades[0].Quantity * run.Trades[0].Entry <= 9000, "Margin cap exceeded");
    Assert(run.Trades[0].Quantity * 2 <= 200, "Stop risk exceeded");
});
Test("Drawdown halt stops further entries", () =>
{
    var f = Fixture(1); var c = f.Data.Candles.Select((c, i) => i > 0 ? c with { Low = 90 } : c).ToArray();
    var run = Sim(Fixture(1, c), new(RiskPercent: 2, MaxDrawdownPercent: 1, FeeBps: 0, SlippageBps: 0));
    Assert(run.Halted && run.Trades.Length == 1, "Risk halt did not stop subsequent entries");
});
Test("Model cannot run on a different dataset", () =>
{
    var f = Fixture(1); Reject(() => Simulation.Run(f.Data with { Id = "different" }, f.Analysis, f.Model, new(), (_, _) => { }, CancellationToken.None));
});
Test("Backtest reconciles cash, trade PnL, equity and costs", () =>
{
    var run = Simulation.Run(data, analysis, model, new(Confidence: .34), (_, _) => { }, CancellationToken.None);
    Near(run.FinalBalance, 10000 + run.Trades.Sum(t => t.Pnl), 1e-6);
    Near(run.Equity[^1].Equity, run.FinalBalance);
    Near(run.TotalFees, run.Trades.Sum(t => t.Fees));
    Assert(run.Equity.All(p => double.IsFinite(p.Equity)), "Nonfinite equity");
    Console.WriteLine($"  Integration result: {run.Trades.Length} trades, {run.ReturnPercent:F2}% net return (synthetic only)");
});
Console.WriteLine($"\n{passed} checks passed.");
