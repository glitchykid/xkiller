namespace Xkiller.Core;

public static class Simulation
{
    private sealed class Position
    {
        public required int Direction { get; init; }
        public required int Index { get; init; }
        public required long Time { get; init; }
        public required double Entry { get; init; }
        public required double Quantity { get; init; }
        public required double Stop { get; init; }
        public required double Take { get; init; }
        public required double Liquidation { get; init; }
        public required double EntryFee { get; init; }
        public double Funding { get; set; }
    }
    public static Backtest Run(MarketData data, Analysis analysis, Model model, RiskOptions risk, Action<int, string> progress, CancellationToken ct)
    {
        risk.Validate();
        if (model.DataId != data.Id) throw new ArgumentException("Model and market data do not match. Retrain first.");
        var rows = analysis.Rows.ToDictionary(r => r.CandleIndex);
        int start = analysis.Rows[model.TestStart].CandleIndex + 1;
        double balance = risk.InitialBalance, peak = balance, maxDd = 0, feeRate = risk.FeeBps / 10_000, slip = risk.SlippageBps / 10_000;
        bool halted = false;
        Position? position = null;
        var trades = new List<Trade>();
        var equity = new List<EquityPoint> { new(data.Candles[start].Time, balance) };
        int fundingIndex = 0;
        while (fundingIndex < data.Funding.Length && data.Funding[fundingIndex].Time < data.Candles[start].Time) fundingIndex++;

        void Close(double rawPrice, long time, string reason)
        {
            var p = position!;
            double exit = rawPrice * (1 - p.Direction * slip);
            double fee = exit * p.Quantity * feeRate;
            double gross = p.Direction * (exit - p.Entry) * p.Quantity;
            balance += gross - fee;
            trades.Add(new(p.Time, time, p.Direction == 1 ? "Long" : "Short", p.Entry, exit, p.Quantity, gross - fee - p.EntryFee - p.Funding, fee + p.EntryFee, p.Funding, reason));
            position = null;
        }
        void Observe(double marked)
        {
            peak = Math.Max(peak, marked);
            maxDd = Math.Max(maxDd, (peak - marked) / peak * 100);
        }
        for (int i = start; i < data.Candles.Length; i++)
        {
            ct.ThrowIfCancellationRequested();
            var c = data.Candles[i];
            if (position == null && !halted && i < data.Candles.Length - 1 && rows.TryGetValue(i - 1, out var signal))
            {
                var probabilities = Learning.Predict(model, signal.Values);
                int action = Array.IndexOf(probabilities, probabilities.Max());
                if (action != 1 && probabilities[action] >= risk.Confidence)
                {
                    int direction = action == 2 ? 1 : -1;
                    double entry = c.Open * (1 + direction * slip);
                    double stopDistance = Math.Max(signal.Values[4] * data.Candles[i - 1].Close * risk.StopAtr, entry * 0.001);
                    double liquidationDistance = entry * (1d / risk.Leverage - risk.MaintenancePercent / 100);
                    if (stopDistance < liquidationDistance * 0.8)
                    {
                        double quantity = Math.Min(balance * risk.RiskPercent / 100 / (stopDistance + entry * (2 * feeRate + 2 * slip)), balance * 0.9 * risk.Leverage / entry);
                        double entryFee = entry * quantity * feeRate;
                        balance -= entryFee;
                        position = new() { Direction = direction, Index = i, Time = c.Time, Entry = entry, Quantity = quantity, Stop = entry - direction * stopDistance, Take = entry + direction * stopDistance * risk.RewardRisk, Liquidation = entry - direction * liquidationDistance, EntryFee = entryFee };
                    }
                }
            }
            // Funding is settled at the opening timestamp. A position opened exactly at settlement is treated as opened afterwards.
            while (fundingIndex < data.Funding.Length && data.Funding[fundingIndex].Time < c.End)
            {
                var f = data.Funding[fundingIndex++];
                if (position != null && f.Time > position.Time)
                {
                    double charge = position.Direction * c.Open * position.Quantity * f.Rate;
                    balance -= charge; position.Funding += charge;
                }
            }
            if (position != null)
            {
                var p = position;
                bool longSide = p.Direction == 1;
                bool liquidationGap = longSide ? c.Open <= p.Liquidation : c.Open >= p.Liquidation;
                bool stop = longSide ? c.Low <= p.Stop : c.High >= p.Stop;
                bool take = longSide ? c.High >= p.Take : c.Low <= p.Take;
                if (liquidationGap) { Close(c.Open, c.Time, "Liquidation gap (approx.)"); halted = true; }
                else if (stop) Close(longSide ? Math.Min(c.Open, p.Stop) : Math.Max(c.Open, p.Stop), c.End, "Stop loss");
                else if (take) Close(p.Take, c.End, "Take profit");
                else if (i - p.Index + 1 >= risk.MaxHoldBars || i == data.Candles.Length - 1) Close(c.Close, c.End, "Time exit");
            }
            double marked = balance + (position == null ? 0 : position.Direction * (c.Close - position.Entry) * position.Quantity - c.Close * position.Quantity * feeRate);
            Observe(marked);
            if ((peak - marked) / peak * 100 >= risk.MaxDrawdownPercent || balance <= 0)
            {
                if (position != null) Close(c.Close, c.End, "Drawdown limit");
                halted = true; marked = balance; Observe(marked);
            }
            equity.Add(new(c.End, marked));
            if (i % 100 == 0) progress((i - start) * 100 / (data.Candles.Length - start), $"Simulated {i - start:N0} bars · {trades.Count} trades");
        }
        double profits = trades.Where(t => t.Pnl > 0).Sum(t => t.Pnl), losses = -trades.Where(t => t.Pnl < 0).Sum(t => t.Pnl);
        return new(Guid.NewGuid().ToString("N")[..8], model.Id, data.Id, DateTimeOffset.UtcNow, risk, balance, (balance / risk.InitialBalance - 1) * 100, maxDd,
            trades.Count == 0 ? 0 : trades.Count(t => t.Pnl > 0) / (double)trades.Count, losses == 0 ? null : profits / losses,
            trades.Sum(t => t.Fees), trades.Sum(t => t.Funding), halted, trades.ToArray(), equity.ToArray());
    }
}
