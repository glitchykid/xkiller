# Xkiller

A local research lab for learning and testing ETHUSDT perpetual futures strategies on **Bybit**. Built with **C# / .NET 10**, **Electron**, **TypeScript**, and **Svelte 5**. The interface is in Russian; project documentation is in English.

Xkiller trains a real, reproducible classifier on technical indicators, then simulates its decisions on a later section of history. It is a research application, not a proven profitable trading system. **No exchange credentials or real order submission are implemented.**

![Xkiller dark brutalist workspace with imported Bybit data](docs/images/overview.png)

![Xkiller light brutalist workspace with the same research data](docs/images/overview-light.png)

## Download

Download the Windows x64 portable executable from [GitHub Releases](https://github.com/glitchykid/xkiller/releases/latest). It bundles Electron and the .NET runtime. Release assets include a SHA-256 checksum. Builds are currently unsigned.

## Appearance

Every screen supports **light and dark themes** through the controls in the top bar. The first desktop launch follows the system appearance. Selecting a theme saves it for future launches, including portable extraction into a different temporary directory. The visual language uses square panels, hard borders, offset shadows, bold headings, numbered navigation, and an acid-lime accent. Charts, forms, tables, status messages, and native window appearance follow the chosen theme.

The desktop preference is stored separately from research data. Browser development stores the theme in local storage. See the [design system](docs/DESIGN.md) for layout, accessibility, and implementation details.

## What works

- Public Bybit historical import: 30–360 days of closed 15-minute ETHUSDT linear perpetual candles and funding events, with pagination, continuity checks, bounded HTTP retries, cancellation, and atomic dataset replacement.
- Multi-timeframe analysis: 15m, 1h, 4h; EMA, RSI, MACD, ATR, Bollinger bands, relative volume, and momentum.
- Actual model training: L2-regularized three-class softmax regression implemented in C#, fitted feature scaling, chronological 60/20/20 split, purged boundaries, and validation-based epoch selection.
- Historical paper simulation: long/short/flat, next-bar entries, 1–10× leverage, risk-based position size, margin cap, ATR stops, take profit, maximum holding time, trading fees, slippage, funding, and a drawdown halt.
- Validation/test classification metrics, majority-class baseline, training curves, model coefficients, equity curve, full trade ledger, and up to 20 runs per current model.
- Local persistence; JSON model/report export and complete CSV trade export.
- Reproducible, prominently labeled synthetic demo for offline functional testing.
- Isolated Electron renderer, narrow IPC bridge, loopback-only C# service with a per-launch random authentication token, and self-contained Windows packaging.

## Run the desktop application

Requirements for development: **Node.js 24.21.0 LTS**, **.NET SDK 10.0.401 LTS**, and Windows x64. `.nvmrc` and `global.json` record the verified toolchain. Dependencies are pinned in `package-lock.json`. The Windows portable build bundles its own .NET runtime, so the end user does not need the SDK.

Verified stable dependencies: Electron 44.4.5, Svelte 5.57.1, Vite 8.3.1, and TypeScript 7.0.2. TypeScript 7 checks Electron and shared code through the `typescript-native` npm alias. Svelte Check 4.7.6 still requires the TypeScript 5/6 programmatic API, so TypeScript 6.0.3 is retained exclusively for that compatibility path. No peer dependency overrides or prerelease compilers are used.

```powershell
npm ci
npm run dev
```

`npm run dev` builds C#, starts Vite, and opens Electron. If the SDK is installed outside PATH, set `DOTNET_EXE` to its full executable path before running development or packaging scripts.

```powershell
$env:DOTNET_EXE = 'C:\path\to\dotnet.exe'
npm run dev
```

For browser-based local verification, run `npm run dev:web` and open `http://127.0.0.1:5173`. This development server is local only; do not expose or deploy its authenticated proxy publicly.

## First experiment

1. Open **Данные** and click **Загрузить данные Bybit**. The initial dataset is synthetic and clearly labeled.
2. Open **Обучение ИИ**. Choose a prediction horizon and movement threshold, then train.
3. Compare test accuracy with the majority-class baseline; inspect validation loss. A better classification score alone does not establish trading profitability.
4. Open **Симуляция**, review the execution assumptions and risk settings, and run the historical simulation.
5. Inspect the equity curve and **Журнал сделок**. Export the full JSON report and CSV ledger for independent analysis.

The default 0.50 probability threshold can produce zero trades. That is a valid outcome when the model mostly predicts the flat class. Lowering it changes the experiment; it is not evidence of a better strategy. Repeatedly tuning parameters against the same test interval consumes that interval's usefulness as an independent test.

Loading a new dataset resets the current model and its simulations. Retraining replaces the model and clears its simulations. Export valuable results before either action. Failed or cancelled jobs retain the previous committed workspace.

## Build and verify

```powershell
npm run check        # Svelte + TypeScript diagnostics
npm run test         # 17 C# checks + 4 client/Electron regression checks
npm run build        # UI, Electron bridge, C# service
npm run package      # Windows x64 portable application, including .NET runtime
```

Output: `release/Xkiller-0.2.0-x64.exe`. This build is unsigned. `release/win-unpacked/Xkiller.exe` is the unpacked application. GitHub Actions performs checks and uploads the portable executable as a workflow artifact.

To publish a new version, update `package.json` and its lockfile, add English notes at `docs/releases/<version>.md`, verify locally, commit, and push a matching `v<version>` tag. The release workflow validates the version, runs all tests and type checks, packages Windows x64, computes SHA-256, and publishes both assets using the repository's built-in `GITHUB_TOKEN`. No personal access token is required. Actions must be enabled and permitted to write releases.

## Data and state

- Development: `.local/workspace/workspace.json`.
- Packaged Electron: a `workspace` directory below Electron's `userData` location (normally `%APPDATA%\xkiller` or `%APPDATA%\Xkiller`).
- `XKILLER_DATA` overrides the workspace directory for isolated verification.
- Desktop appearance: `preferences.json` directly below Electron's `userData` directory. Theme writes are serialized and use atomic replacement. Missing or malformed appearance settings fall back to the system theme without touching research data.
- The workspace contains market history, funding, model parameters, risk settings, and simulation runs. Writes use a temporary file and atomic replacement; malformed existing files are preserved and cause startup to fail rather than silently resetting research.
- Nothing in `.local/`, `artifacts/`, `release/`, or dependency folders is committed.

## Project layout

```text
backend/Xkiller.Core/    Market data, indicators, training, simulation
backend/Xkiller.Api/     Local API, cancellable jobs, persistence
electron/               Process lifecycle, validated IPC, native exports
src/                    Svelte UI and reusable chart components
scripts/                Development and packaging orchestration
tests/Xkiller.Tests/     Deterministic scientific and accounting checks
docs/                   Architecture, methodology, verification record
```

Read [architecture](docs/ARCHITECTURE.md), [methodology and limitations](docs/METHODOLOGY.md), and [verification](docs/VERIFICATION.md) before interpreting results.

## Scope and limitations

This first vertical slice implements supervised research and historical simulation. It does not implement reinforcement learning, automatic hyperparameter search, continuous online retraining, live paper execution, testnet orders, or live trading. Such systems require additional execution, reconciliation, and validation work. There is no claim of an established trading edge.

The simulator uses OHLC bars rather than a tick/order-book replay. Liquidation and funding valuation are approximate; fee and maintenance-margin settings are user assumptions, not an automatic account-specific Bybit fee schedule. Consult the methodology for the precise formulas and omissions.

## Primary references

- [Bybit V5 historical candles](https://bybit-exchange.github.io/docs/v5/market/kline)
- [Bybit V5 funding history](https://bybit-exchange.github.io/docs/v5/market/history-fund-rate)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Svelte documentation](https://svelte.dev/docs/svelte/overview)
- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
