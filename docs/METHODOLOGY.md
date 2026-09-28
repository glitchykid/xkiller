# Research methodology

## Data and time

Instrument: Bybit ETHUSDT USDT-margined linear perpetual. Base resolution: 15 minutes. Import ends at the most recent complete 15-minute boundary according to the local system clock. Keep the clock synchronized. The importer requires exactly `days × 96` contiguous candles and rejects missing bars, invalid OHLC, nonfinite values, and incomplete bars. A failed import does not replace the committed dataset.

One-hour and four-hour buckets use UTC boundaries. Leading/trailing partial buckets are excluded. A higher-timeframe feature can enter a decision only after that entire candle has closed. The longest feature window is warmed up for at least 50 complete four-hour bars.

Funding is fetched from the public history endpoint over the same interval and deduplicated by timestamp. No funding events is an import failure. The importer does not assume a constant future settlement interval.

## Features

Each timeframe contributes eight numerical features:

1. `(EMA12 − EMA26) / close`.
2. `close / EMA26 − 1`.
3. Centered RSI14: `(RSI − 50) / 50`.
4. MACD(12,26,9) histogram divided by close.
5. Wilder-style ATR14 divided by close.
6. Bollinger z-score using a 20-bar mean and population standard deviation.
7. Volume divided by its trailing 20-bar average, minus one.
8. Four-bar close return.

EMA is seeded at the first observation. Wilder gain/loss and true-range accumulators use the first 14 observations for initialization and then recursive smoothing. Warm-up reduces initialization effects. The visible chart's EMA26 is seeded at the beginning of the displayed 100-bar window; the model uses the full available history.

There are 24 features. Means and standard deviations are fit only on the training fold. Prediction applies those saved values and clips standardized inputs to ±10. Normalization never uses validation or test statistics.

## Labels and training

For the decision at base candle `i`, the target return is:

```text
close[i + horizon] / open[i + 1] − 1
```

Return above the threshold is **long (2)**; below its negative is **short (0)**; the remaining range is **flat (1)**. Default horizon: four bars. Default threshold: ±0.3%. Labels describe price movement; they do not claim that movement exceeds all trading costs.

The model is three-class multinomial logistic regression, trained by deterministic full-batch gradient descent with L2 coefficient 0.002 (bias excluded). Initial weights are zero. Probabilities use numerically stable softmax. They are **not calibrated probabilities of profitable trades**.

Labeled rows are divided chronologically into 60% training, 20% validation, and 20% test. The last `horizon` rows before each train/validation boundary are removed from the preceding fold. This prevents forward-looking labels crossing into the following fold. The training scaler is fitted after this purge.

The best validation log-loss checkpoint is selected from epoch 1, every fifth epoch, and the final epoch. Test metrics are evaluated only after checkpoint selection. The majority-class baseline always predicts the most frequent class in training. Confusion matrix rows are actual classes and columns are predicted classes, in short/flat/long order.

Simulation begins with the signal at the first test row. The held-out tail is not used to fit the model. Repeated manual experiments against this tail do create researcher selection bias. This version does not implement nested evaluation, walk-forward folds, or an automatically protected final holdout.

## Execution and sizing

One position at a time. A flat-class prediction opens no trade. A directional prediction must be the most likely class and meet the configured probability threshold. Signals are calculated after a candle closes; new entries fill at the **next candle's open**, adjusted adversely by slippage. Existing positions ignore subsequent signals until an exit.

```text
stopDistance = max(previous ATR15m × stopAtr, entry × 0.001)
quantity = min(
    cash × riskPercent / 100 / (stopDistance + entry × (2 × feeRate + 2 × slippageRate)),
    cash × 0.90 × leverage / entry
)
```

Risk targets 0.1–2% of current cash; leverage is limited to 1–10×. A constant risk budget means that increasing leverage may not increase position size when the stop-risk bound already binds.

The stop is fixed at entry; take profit uses a configured reward/risk multiple. If both are touched in a candle, the stop takes precedence. A gap beyond the stop fills at the opening price. Profit targets fill at the target (no favorable gap assumption), with adverse slippage. The maximum holding period and dataset end force a close. Exit times for intrabar stop/take fills use the candle-end timestamp because the exact tick is unknown.

Fees apply to notional at both entry and exit. `1 bps = 0.01%`. Default per-side fees (5.5 bps), slippage (2 bps), and maintenance margin (0.5%) are editable assumptions, not a claim about a particular account's current terms.

Funding cost is `direction × quantity × barOpen × historicalRate`. Positive rates debit longs and credit shorts. A position opened at exactly the funding timestamp is treated as opened after settlement and is not charged for that event. Price at the opening candle is a valuation approximation.

Cash PnL is `direction × (exit − entry) × quantity − entryFee − exitFee − funding`. Funding is also posted to cash when settled; the trade ledger includes it for reconciliation without subtracting it twice.

## Drawdown and liquidation

Marked equity is cash plus unrealized PnL minus an estimated exit fee. Drawdown is measured at candle close against the previous peak. At or beyond the configured threshold the position is closed and no subsequent trades open. It is a halt rule, not a guaranteed loss cap: gaps, fees, and slippage can overshoot it.

Approximate liquidation distance is `entry × (1 / leverage − maintenancePercent / 100)`. Trades are skipped unless stop distance is less than 80% of that distance. Protective stops therefore precede the modeled liquidation barrier for ordinary continuous price paths. An opening gap beyond that barrier exits at the open and halts the run.

This is not Bybit's full liquidation engine. Mark price, risk tiers, cross/isolated collateral accounting, ADL, liquidation fees, instrument rounding, spread changes, depth, and partial fills are not implemented. Extreme gaps can produce negative simulated cash. No exchange-accurate liquidation or isolated-margin loss cap is claimed.

## Interpretation

Accuracy and log loss measure label prediction. Net return, fees, funding, trade count, win rate, profit factor, and equity drawdown describe one specific simulation. None alone demonstrates a robust trading edge. Profit factor is null when there are no losing trades; zero trades also yield a zero displayed win rate. Synthetic demo results are functional diagnostics, not market evidence.

Evaluate on fresh data and different regimes before drawing conclusions. This application intentionally has no route to live order placement.
