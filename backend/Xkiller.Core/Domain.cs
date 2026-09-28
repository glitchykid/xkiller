namespace Xkiller.Core;

public sealed record Candle(long Time, double Open, double High, double Low, double Close, double Volume, int Minutes = 15)
{
    public long End => Time + Minutes * 60_000L;
}
public sealed record Funding(long Time, double Rate);
public sealed record MarketData(string Id, string Source, DateTimeOffset ImportedAt, Candle[] Candles, Funding[] Funding);
public sealed record FeatureRow(int CandleIndex, long Time, double[] Values);
public sealed record FrameSnapshot(string Frame, double Price, double Ema12, double Ema26, double Rsi, double Macd, double Atr, double BandUpper, double BandLower, string Trend);
public sealed record Analysis(FeatureRow[] Rows, FrameSnapshot[] Frames);
public sealed record TrainingOptions(int Epochs = 120, double LearningRate = 0.03, int Horizon = 4, double LabelThreshold = 0.003)
{
    public void Validate()
    {
        if (Epochs is < 10 or > 500 || !double.IsFinite(LearningRate) || LearningRate is < 0.001 or > 0.2 || Horizon is < 1 or > 16 || !double.IsFinite(LabelThreshold) || LabelThreshold is < 0.001 or > 0.03)
            throw new ArgumentException("Invalid training parameters.");
    }
}
public sealed record Metrics(double Accuracy, double BaselineAccuracy, double LogLoss, int Samples, int[][] Confusion);
public sealed record LossPoint(int Epoch, double Train, double Validation);
public sealed record Model(string Id, string DataId, DateTimeOffset CreatedAt, TrainingOptions Options, double[] Mean, double[] Scale, double[][] Weights, int TrainEnd, int ValidationEnd, int TestStart, long TestStartTime, Metrics Validation, Metrics Test, LossPoint[] Loss, int BestEpoch);
public sealed record RiskOptions(double InitialBalance = 10_000, int Leverage = 3, double RiskPercent = 0.5, double StopAtr = 2, double RewardRisk = 2, double Confidence = 0.5, double FeeBps = 5.5, double SlippageBps = 2, double MaxDrawdownPercent = 15, int MaxHoldBars = 16, double MaintenancePercent = 0.5)
{
    public void Validate()
    {
        double[] numbers = [InitialBalance, RiskPercent, StopAtr, RewardRisk, Confidence, FeeBps, SlippageBps, MaxDrawdownPercent, MaintenancePercent];
        if (numbers.Any(x => !double.IsFinite(x)) || InitialBalance is < 100 or > 10_000_000 || Leverage is < 1 or > 10 || RiskPercent is < 0.1 or > 2 || StopAtr is < 1 or > 5 || RewardRisk is < 1 or > 5 || Confidence is < 0.34 or > 0.95 || FeeBps is < 0 or > 100 || SlippageBps is < 0 or > 100 || MaxDrawdownPercent is < 1 or > 50 || MaxHoldBars is < 1 or > 96 || MaintenancePercent is < 0.1 or > 5)
            throw new ArgumentException("Invalid risk parameters.");
    }
}
public sealed record Trade(long EntryTime, long ExitTime, string Side, double Entry, double Exit, double Quantity, double Pnl, double Fees, double Funding, string Reason);
public sealed record EquityPoint(long Time, double Equity);
public sealed record Backtest(string Id, string ModelId, string DataId, DateTimeOffset CreatedAt, RiskOptions Options, double FinalBalance, double ReturnPercent, double MaxDrawdownPercent, double WinRate, double? ProfitFactor, double TotalFees, double TotalFunding, bool Halted, Trade[] Trades, EquityPoint[] Equity);
