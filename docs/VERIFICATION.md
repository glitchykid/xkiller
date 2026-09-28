# Verification record

Verified locally on Windows x64 on 2026-09-28. This record describes functional checks, not evidence of a profitable strategy.

## Automated checks

- .NET 10 Release build: zero warnings and zero errors.
- Svelte/TypeScript diagnostics: zero errors and zero warnings.
- Vite production bundle and Electron main/preload bundles: successful.
- Seventeen deterministic C# checks pass:
  - Multi-timeframe features are identical when future candles are withheld.
  - Aggregation excludes unfinished and leading partial buckets.
  - Invalid OHLC and missing candles are rejected.
  - Normalization is fitted only on training data.
  - Training/validation labels are purged at fold boundaries.
  - Changes in the held-out future do not change model weights.
  - Predicted probabilities are finite and sum to one.
  - Cancellation interrupts training.
  - Nonfinite or out-of-range settings are rejected.
  - Signals execute at the next opening price.
  - Same-candle stop/take ambiguity resolves to the stop.
  - Long and short positions incur both fees and adverse slippage.
  - Positive funding debits longs and credits shorts.
  - Position size obeys modeled stop risk and the margin cap.
  - Drawdown halt prevents subsequent entries.
  - Dataset/model mismatches are rejected.
  - Cash, ledger PnL, equity, and costs reconcile.
- One client regression test verifies that nested reactive form proxies are serialized into cloneable plain data before crossing the Electron bridge. This catches a desktop-only defect that does not occur in the browser HTTP path.

- A second client regression check verifies that filesystem aliases resolve to the same trusted packaged document, while other archives, other documents, remote URLs, and modified URLs are rejected. This addresses Windows portable extraction paths without weakening sender checks.

Two additional client checks cover theme persistence, invalid preference files and writes, preservation of research files, system/browser/native preference precedence, blocked browser storage, and failed native writes. Run `npm run test` for all 21 checks. These are meaningful invariants and demonstrated integration regressions; no claim of exhaustive correctness is made.

## UI and integration

### Version 0.2.0 appearance update

All six sections were inspected with the new brutalist styling. Light/dark switching, selected theme button states, theme restoration after browser reload, chart palettes, numeric form validity, and responsive layouts were checked. The simulation at 1024 px and methodology at 760 px had no page-level horizontal overflow. Native Electron IPC returned the same selected theme as the renderer, wrote a separate `preferences.json`, and kept renderer Node access disabled. A simulation executed through the packaged UI completed with 14 trades and added a third run to an isolated copy of the existing research workspace, with no UI alerts or runtime errors.

The toolchain was verified against stable/LTS releases on 2026-09-28. TypeScript 7.0.2 checks Electron; Svelte Check 4.7.6 uses its supported TypeScript 6.0.3 API. All 21 automated checks passed, with zero Svelte/TypeScript diagnostics. The Windows package bundles Electron 44.4.5 and .NET 10.0.12.

The final portable EXE was launched from its actual temporary extraction directory. It restored the light preference and three research runs from the previous unpacked launch, then successfully saved dark mode through trusted IPC. Renderer Node access remained disabled and no alerts were present. The generated SHA-256 matched an independent file hash. The executable is unsigned. Main, muted, positive, and negative text tokens on panel backgrounds all exceeded 6.3:1 contrast in both themes; this is a targeted color check, not a full accessibility audit.

### Initial research workflow verification

Checked with an actual Chromium browser: initial synthetic labeling, overview, timeframe controls, data import, training, simulation, equity chart, trade journal, long-only filtering, and full CSV/JSON export payloads. No browser runtime errors were reported. A 760-pixel browser viewport did not overflow horizontally.

The C# API returned HTTP 401 without its authentication token and HTTP 400 for an invalid leverage value. Cancelling an active training request preserved the previously committed model and both simulation results. Restarting the development service restored the imported dataset, fitted model, and run history.

The standalone Electron build starts its self-contained C# service and renders the UI from local packaged assets. Training and simulation were executed through the packaged UI and persisted their results after the proxy-serialization fix. Renderer `require` is undefined and the narrow bridge is present. The package uses a local installed Electron distribution to avoid a Windows archive-renaming issue observed during packaging. Vite excludes runtime data, build outputs, and backend files from its watcher to avoid watching locked Chromium cache files.

## Bybit research run

One real public-history import was exercised through the UI:

| Item                             | Observed value                                                          |
| -------------------------------- | ----------------------------------------------------------------------- |
| Dataset identity                 | `581E2C4999547CDB`                                                      |
| Source                           | Bybit ETHUSDT linear perpetual                                          |
| Coverage (UTC)                   | 2026-06-30 14:00 to 2026-09-28 14:00                                    |
| Closed 15m candles               | 8,640                                                                   |
| Funding events                   | 270                                                                     |
| Model identity                   | `c9f1ce81`                                                              |
| Training                         | 120 epochs, learning rate 0.03, four-bar horizon, ±0.3% label threshold |
| Selected epoch                   | 120                                                                     |
| First held-out signal (UTC)      | 2026-09-12 05:45                                                        |
| Test examples                    | 1,566                                                                   |
| Test accuracy                    | 62.2605%                                                                |
| Majority-class baseline accuracy | 62.3244%                                                                |
| Test log loss                    | 0.91533                                                                 |

The model did **not** exceed the majority-class baseline on accuracy. This baseline implementation has no demonstrated predictive or economic edge.

Two simulations were used to verify the workflow, without further parameter search:

| Setting/result             | Default run | Execution verification run |
| -------------------------- | ----------- | -------------------------- |
| Probability threshold      | 0.50        | 0.34                       |
| Initial cash               | 10,000 USDT | 10,000 USDT                |
| Leverage                   | 3×          | 3×                         |
| Modeled stop risk          | 0.5%        | 0.5%                       |
| Trades                     | 0           | 14                         |
| Final cash                 | 10,000 USDT | 9,880.75 USDT              |
| Net return                 | 0.00%       | −1.19246%                  |
| Maximum bar-close drawdown | 0.00%       | 2.13369%                   |
| Win rate                   | No trades   | 50.0%                      |
| Total fees                 | 0           | 61.66504 USDT              |
| Net funding paid           | 0           | −0.69453 USDT (credit)     |

Lowering the threshold was solely an execution-path check. It produced a loss and is not a recommended trading setting. These are historical, parameter-specific results; they are neither a forecast nor a performance claim. The complete verification report and trade ledger were exported separately from the source repository.

## Remaining limitations

- The application is a working research MVP, with one simple supervised model and historical simulation.
- Exchange-grade liquidation, live paper execution, order routing, walk-forward evaluation, and calibrated probabilities are outside this version.
- The Windows executable is unsigned; code signing and automated update distribution are not configured.
- Local checks do not establish that remote GitHub Actions ran; its execution status must be checked separately in GitHub.
