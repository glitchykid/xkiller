namespace Xkiller.Core;

/// <summary>Deterministic, L2-regularized multinomial logistic regression with temporal validation.</summary>
public static class Learning
{
    public static Model Train(MarketData data, Analysis analysis, TrainingOptions options, Action<int, string> progress, CancellationToken ct)
    {
        options.Validate();
        var rows = analysis.Rows.Where(r => r.CandleIndex + options.Horizon < data.Candles.Length).ToArray();
        int boundary = (int)(rows.Length * 0.6), testStart = (int)(rows.Length * 0.8);
        int trainEnd = boundary - options.Horizon, validationEnd = testStart - options.Horizon;
        if (trainEnd < 200 || validationEnd - boundary < 50) throw new ArgumentException("More history is required for chronological training.");
        int d = rows[0].Values.Length;
        var mean = new double[d]; var scale = new double[d];
        for (int j = 0; j < d; j++)
        {
            mean[j] = rows.Take(trainEnd).Average(r => r.Values[j]);
            scale[j] = Math.Max(1e-9, Math.Sqrt(rows.Take(trainEnd).Average(r => Math.Pow(r.Values[j] - mean[j], 2))));
        }
        var x = rows.Select(r => Normalize(r.Values, mean, scale)).ToArray();
        var y = rows.Select(r => Label(data.Candles[r.CandleIndex + options.Horizon].Close / data.Candles[r.CandleIndex + 1].Open - 1, options.LabelThreshold)).ToArray();
        int baseline = Enumerable.Range(0, 3).MaxBy(c => y.Take(trainEnd).Count(v => v == c));
        double[][] weights = Enumerable.Range(0, 3).Select(_ => new double[d + 1]).ToArray();
        double[][] best = weights.Select(w => w.ToArray()).ToArray();
        double bestLoss = double.MaxValue; int bestEpoch = 0;
        var curve = new List<LossPoint>();
        for (int epoch = 1; epoch <= options.Epochs; epoch++)
        {
            ct.ThrowIfCancellationRequested();
            var gradient = weights.Select(w => new double[w.Length]).ToArray();
            for (int i = 0; i < trainEnd; i++)
            {
                var p = Probabilities(weights, x[i]);
                for (int c = 0; c < 3; c++)
                {
                    double error = p[c] - (y[i] == c ? 1 : 0);
                    for (int j = 0; j <= d; j++) gradient[c][j] += error * x[i][j];
                }
            }
            for (int c = 0; c < 3; c++)
                for (int j = 0; j <= d; j++) weights[c][j] -= options.LearningRate * (gradient[c][j] / trainEnd + (j == d ? 0 : 0.002 * weights[c][j]));
            if (epoch == 1 || epoch % 5 == 0 || epoch == options.Epochs)
            {
                double trainLoss = Evaluate(weights, x, y, 0, trainEnd, baseline).LogLoss;
                double valLoss = Evaluate(weights, x, y, boundary, validationEnd, baseline).LogLoss;
                curve.Add(new(epoch, trainLoss, valLoss));
                if (valLoss < bestLoss) { bestLoss = valLoss; bestEpoch = epoch; best = weights.Select(w => w.ToArray()).ToArray(); }
                progress(epoch * 100 / options.Epochs, $"Epoch {epoch}/{options.Epochs} · validation loss {valLoss:F4}");
            }
        }
        return new(Guid.NewGuid().ToString("N")[..8], data.Id, DateTimeOffset.UtcNow, options, mean, scale, best, trainEnd, validationEnd, testStart, rows[testStart].Time,
            Evaluate(best, x, y, boundary, validationEnd, baseline), Evaluate(best, x, y, testStart, rows.Length, baseline), curve.ToArray(), bestEpoch);
    }
    public static int Label(double futureReturn, double threshold) => futureReturn > threshold ? 2 : futureReturn < -threshold ? 0 : 1;
    public static double[] Predict(Model model, double[] values) => Probabilities(model.Weights, Normalize(values, model.Mean, model.Scale));
    private static double[] Normalize(double[] values, double[] mean, double[] scale) => values.Select((v, j) => Math.Clamp((v - mean[j]) / scale[j], -10, 10)).Append(1d).ToArray();
    private static double[] Probabilities(double[][] weights, double[] x)
    {
        double[] logits = new double[3];
        for (int c = 0; c < 3; c++) for (int j = 0; j < x.Length; j++) logits[c] += weights[c][j] * x[j];
        double max = logits.Max(), sum = 0;
        for (int c = 0; c < 3; c++) { logits[c] = Math.Exp(logits[c] - max); sum += logits[c]; }
        return logits.Select(v => v / sum).ToArray();
    }
    private static Metrics Evaluate(double[][] w, double[][] x, int[] y, int start, int end, int baseline)
    {
        int correct = 0, baselineCorrect = 0; double loss = 0;
        int[][] confusion = [new int[3], new int[3], new int[3]];
        for (int i = start; i < end; i++)
        {
            var p = Probabilities(w, x[i]); int predicted = Array.IndexOf(p, p.Max());
            if (predicted == y[i]) correct++;
            if (baseline == y[i]) baselineCorrect++;
            confusion[y[i]][predicted]++;
            loss -= Math.Log(Math.Max(1e-15, p[y[i]]));
        }
        int n = end - start;
        return new(correct / (double)n, baselineCorrect / (double)n, loss / n, n, confusion);
    }
}
