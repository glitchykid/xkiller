namespace Xkiller.Core;

public static class Indicators
{
    public static readonly string[] FeatureNames = new[] { "15m", "1h", "4h" }.SelectMany(tf => new[] { "EMA spread", "Price / EMA", "RSI", "MACD histogram", "ATR", "Bollinger z", "Relative volume", "Momentum" }.Select(n => $"{tf} · {n}")).ToArray();
    private sealed record Frame(Candle[] Candles, double[][] Values, FrameSnapshot Snapshot);

    public static Analysis Build(Candle[] candles)
    {
        var frames = new[] { Compute(candles, "15m"), Compute(Market.Aggregate(candles, 60), "1h"), Compute(Market.Aggregate(candles, 240), "4h") };
        int[] pointers = [0, 0, 0];
        var rows = new List<FeatureRow>();
        for (int i = 0; i < candles.Length; i++)
        {
            for (int f = 0; f < frames.Length; f++)
                while (pointers[f] + 1 < frames[f].Candles.Length && frames[f].Candles[pointers[f] + 1].End <= candles[i].End) pointers[f]++;
            if (pointers.Any(p => p < 49) || frames.Where((f, j) => f.Candles[pointers[j]].End > candles[i].End).Any()) continue;
            rows.Add(new(i, candles[i].End, frames.SelectMany((f, j) => f.Values[pointers[j]]).ToArray()));
        }
        return new(rows.ToArray(), frames.Select(f => f.Snapshot).ToArray());
    }
    public static double[] Ema(double[] source, int period)
    {
        var result = new double[source.Length];
        if (source.Length == 0) return result;
        result[0] = source[0];
        double alpha = 2d / (period + 1);
        for (int i = 1; i < source.Length; i++) result[i] = alpha * source[i] + (1 - alpha) * result[i - 1];
        return result;
    }
    private static Frame Compute(Candle[] candles, string name)
    {
        var closes = candles.Select(c => c.Close).ToArray();
        var fast = Ema(closes, 12);
        var slow = Ema(closes, 26);
        var macd = fast.Zip(slow, (a, b) => a - b).ToArray();
        var signal = Ema(macd, 9);
        var values = new double[candles.Length][];
        double gain = 0, loss = 0, atr = 0, rsi = 50, upper = 0, lower = 0;
        for (int i = 0; i < candles.Length; i++)
        {
            var c = candles[i];
            double delta = i == 0 ? 0 : c.Close - candles[i - 1].Close;
            double tr = i == 0 ? c.High - c.Low : Math.Max(c.High - c.Low, Math.Max(Math.Abs(c.High - candles[i - 1].Close), Math.Abs(c.Low - candles[i - 1].Close)));
            if (i < 14) { gain += Math.Max(delta, 0) / 14; loss += Math.Max(-delta, 0) / 14; atr += tr / 14; }
            else { gain = (gain * 13 + Math.Max(delta, 0)) / 14; loss = (loss * 13 + Math.Max(-delta, 0)) / 14; atr = (atr * 13 + tr) / 14; }
            rsi = gain + loss == 0 ? 50 : loss == 0 ? 100 : 100 - 100 / (1 + gain / loss);
            int begin = Math.Max(0, i - 19), count = i - begin + 1;
            double mean = 0, volume = 0;
            for (int j = begin; j <= i; j++) { mean += closes[j] / count; volume += candles[j].Volume / count; }
            double variance = 0;
            for (int j = begin; j <= i; j++) variance += Math.Pow(closes[j] - mean, 2) / count;
            double sd = Math.Sqrt(variance);
            upper = mean + 2 * sd; lower = mean - 2 * sd;
            values[i] = [(fast[i] - slow[i]) / c.Close, c.Close / slow[i] - 1, (rsi - 50) / 50, (macd[i] - signal[i]) / c.Close, atr / c.Close, sd == 0 ? 0 : (c.Close - mean) / sd, volume == 0 ? 0 : c.Volume / volume - 1, i < 4 ? 0 : c.Close / closes[i - 4] - 1];
        }
        return new(candles, values, new(name, closes[^1], fast[^1], slow[^1], rsi, macd[^1] - signal[^1], atr, upper, lower, fast[^1] > slow[^1] ? "Bullish" : "Bearish"));
    }
}
