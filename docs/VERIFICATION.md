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

Four additional client checks cover legacy/malformed preference migration, persistence without changing research data, static translation coverage in all six languages, matching placeholders, interpolation, and diagnostic fallbacks. A pagination check verifies complete, nonduplicated traversal across different capacities, partial and exact last pages, empty lists, clamping after filtering/resizing, and defensive bounds. A release metadata check compares root versions and each registry artifact with its declared version. Two native-image checks inspect every raster icon's alpha channel for transparent gutters, visible content and antialiased edges, and verify the app icon is completely opaque. A job-completion regression check covers instant first operations, saved results, repeated polling and unsuccessful job states. Run `npm run test` for all 28 current checks. These are meaningful invariants and demonstrated integration regressions; no claim of exhaustive correctness is made.

## UI and integration

### Version 0.2.4 viewport-fitting layout

All 28 automated checks passed. Translation coverage now includes the shared pager and tabs. Research calculations are unchanged.

All 15 internal views were inspected in all six languages at 1024 × 660, 1180 × 700 and 1480 × 900 renderer sizes: 270 combinations. Document width/height, descendant bounds, internal horizontal overflow and form validity were checked. Every document matched its viewport height, with no page or table scrolling, clipped controls, horizontal overflow, invalid form values or unexpected Russian labels in English/Korean/Japanese/Chinese content. The layout uses available height, tabs and pagination rather than hidden overflow.

At 1024 × 660, the same 90 combinations passed with a running job, 100 trade records and 20 history entries, then another 90 passed with a synthetic dataset and no model or results. These additional states were isolated browser fixtures; they did not change the saved workspace.

Interaction checks confirmed that all eleven risk fields survived tab navigation, an edited balance remained intact, Arrow/Home/End moved focus and selection together, all 14 actual trade records appeared across two pages without omission or duplication, background polling retained the selected page, switching journal views retained it, and a side filter reset it. No browser runtime errors were reported. Compact overview, settings, results, journal, Chinese import, Ukrainian training quality and Japanese methodology screenshots were refreshed.

The development guide requires a failing behavior test before new implementation or fixes, followed by the smallest correction and refactoring with passing tests.

The release-metadata test first reproduced an accidentally changed transitive dependency version; correcting that entry made it pass. The raster-asset tests first failed for the absent atlas, then detected unequal source cells before the generated artwork was packed into equal cells. They now confirm all sixteen transparent glyphs and the completely opaque application icon. The renderer exposes PNG alpha masks for icons, zero SVG icons in controls/navigation, `geometricPrecision` chart rendering and an antialiased text preference.

An instant-completion browser fixture reproduced a first simulation finishing before the initial job poll while the settings view stayed open. A regression test reproduced the same completion-detection failure. Tracking the submitted operation now recognizes that completion while suppressing saved, unrelated, repeated, running, failed and cancelled job states; the browser scenario passes after the fix.

The unpacked Electron application restored Japanese, dataset `581E2C4999547CDB`, model `c9f1ce81` and four existing runs. The 512 px raster atlas decoded from the packaged archive. The default native window measured 1180 × 760, with a 1164 × 721 renderer. At the native minimum of 1024 × 720, all 90 language/view combinations passed in the actual 1008 × 681 content area without overflow. A historical simulation launched from the Russian UI completed with 14 trades, opened the result tab automatically and saved a fifth run in the isolated verification workspace. Renderer Node access remained unavailable, with no alerts or runtime errors.

The final portable EXE then launched from its actual temporary extraction directory. It restored Russian, the same dataset/model and all five runs, including the latest 14-trade result. Its raster atlas decoded at 512 × 512 from the local archive, and controls/navigation contained no SVG icons. The saved history was accessible, the document matched the viewport, and there were no alerts or runtime errors. An independent SHA-256 matched the packaged checksum. Svelte/TypeScript reported zero errors and warnings, and the final production UI and self-contained .NET service built successfully. The executable is unsigned.

### Version 0.2.3 dark minimalist interface

All 23 existing automated checks passed. The six client checks were rerun after removing the decorative illustration; Svelte/TypeScript reported zero errors and warnings. No research calculations changed.

All six pages were exercised in all six languages at 1024 px (36 combinations). There was no page-level horizontal overflow, invalid form value, or unexpected Russian label in English/Korean/Japanese/Chinese content. Every screen used a dark Gunmetal canvas (`rgb(42, 52, 57)`) and no backdrop blur. The only image was the locally loaded application icon. The overview and compact simulation were visually inspected, and documentation screenshots were refreshed, including Japanese methodology, Ukrainian training and the Chinese data page at 760 px. No browser runtime errors were reported.

Computed panel backgrounds were opaque `rgb(48, 57, 61)` and the wallpaper was absent. Main, muted, positive, negative and chart text colors measured at least 5.49:1 against this panel; primary button text measured 8.65:1 against its sage fill. This targeted color check is not a full accessibility audit.

The actual Windows portable EXE opened from its temporary extraction directory, restored Russian, dataset 581E2C4999547CDB, model c9f1ce81 and four existing simulation runs. The new 256 px icon loaded from the packaged archive; the Gunmetal canvas and opaque panels matched the browser, with no wallpaper or blur. Switching to Japanese persisted a locale-only preference file and rendered the simulation page with the saved results. Renderer Node access remained unavailable; no runtime errors or alerts were reported. All seven generated icon sizes matched the embedded resources in both the application and portable EXEs byte-for-byte. An independent SHA-256 matched the generated checksum. The executable is unsigned.

### Version 0.2.2 compact dark cyberpunk interface

All 23 automated checks passed; Svelte/TypeScript reported zero errors and warnings. Preference checks now verify that legacy light/dark fields are discarded while language survives, and that locale-only saves leave research data untouched.

All six pages were inspected in all six locales at 1024 px (36 combinations): no page-level horizontal overflow, invalid form values, or unexpected Russian labels in English/Korean/Japanese/Chinese content. The renderer remained dark in every case. The compact overview was visually inspected at 1480 × 960 with a full document height of 1177 px. Compact simulation and Japanese methodology were inspected at 1024 px; the Chinese data page at 760 px. Generated imagery, green/fuchsia candles, orchid chart lines, lime actions, and blurred glass surfaces were visible. No browser runtime errors were reported.

A browser profile containing both the legacy light-theme key and a light/Japanese preference object still opened dark, retained Japanese, and exposed no theme switch. The unpacked Windows build also restored Japanese from a legacy light preference file. The generated background decoded locally at 1672 px wide, the panels retained their 64% dark fill, and the icon and Ethereum illustration loaded from bundled assets. The dataset 581E2C4999547CDB, model c9f1ce81, and four earlier runs were preserved. Changing language to English persisted only the locale. Renderer Node access remained unavailable.

The actual portable EXE was launched from its temporary extraction directory. It restored English, the same model, and all four runs. The 1672 px background, 1536 px illustration, and 256 px icon loaded from the packaged local archive. Changing to Russian persisted a locale-only preference file and kept the renderer dark. No runtime errors, alerts, or page-level horizontal overflow were reported; renderer Node access remained unavailable. All seven ICO variants matched the icon resources embedded in both the unpacked application and portable launcher byte-for-byte. An independent SHA-256 calculation matched the packaged checksum. The executable is unsigned.

### Version 0.2.1 glass interface, localization, and icons

All six pages were exercised in Russian, English, Ukrainian, Korean, Japanese, and Simplified Chinese at a 1024 px browser width. Forms passed native validity checks and there was no page-level horizontal overflow in any of the 36 combinations. The English, Korean, Japanese, and Chinese main content contained no leftover Russian labels. Both palettes were visually inspected at 1480 px; dark simulation and Japanese methodology were inspected at 1024 px and the light Chinese data page at 760 px. Browser reload restored the selected Chinese locale and light theme. No browser runtime errors were reported.

All 23 automated checks passed. The production package passed Svelte/TypeScript diagnostics with zero errors and warnings and built the self-contained .NET service successfully. The 1536 px generated Ethereum artwork and 256 px UI icon loaded from local assets. All seven generated ICO variants were compared byte-for-byte with the embedded resources of both the application EXE and portable launcher; both contained the correct generated icon. Windows product metadata reports Xkiller 0.2.1.0.

The unpacked desktop build read a legacy theme-only dark preference, defaulted to Russian, and retained the dataset, model, and three runs from an isolated research copy. Changing to Japanese and light mode persisted both settings through the trusted IPC bridge. A simulation launched from that Japanese UI completed with 14 trades and added a fourth run without alerts.

The actual portable EXE was then launched from its temporary extraction directory. It restored Japanese, light mode, model c9f1ce81, four runs, and the latest 14-trade result. Both local images loaded, renderer Node access was undefined, and the bridge was available. Changing to Korean and dark mode succeeded from the portable build. No runtime errors were reported. An independent SHA-256 calculation matched the packaged checksum. The executable remains unsigned.

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
