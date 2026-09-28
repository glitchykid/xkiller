# Design system

Version 0.2.3 uses a compact, dark minimalist interface with Gunmetal as the primary color. Scientific calculations are independent of presentation.

## Palette and hierarchy

| Role | Color | Hex | Use |
| --- | --- | --- | --- |
| Primary | Gunmetal | `#2A3439` | Canvas, native window and startup background |
| Panel | Gunmetal shade | `#30393D` | Opaque research panels and metric cards |
| Chrome | Dark Gunmetal shade | `#252D30` | Navigation, top bar and data ribbon |
| Accent | Muted sage | `#B7CBBB` | Primary actions, selection and generated icon |
| Positive | Subdued green | `#A7C5B0` | Rising candles and positive results |
| Negative | Muted rose | `#D2A6A8` | Falling candles and negative results |
| Text | Neutral off-white | `#E8ECE9` | Main content |

Saturation is deliberately restrained. Numerical signs and labels accompany semantic colors. Research curves use a light neutral sage, distinct from both candle directions; warnings use a muted sand tone. Blue accents are excluded.

## Minimal surfaces and identity

Opaque panels, thin neutral borders, 8–10 px corner radii and clear type establish hierarchy. There is no backdrop blur, translucent wallpaper, multicolor panel gradient, glowing decoration or large research illustration. The canvas stays Gunmetal. Primary buttons stand out through a quiet sage fill; most controls and metadata use neutral surfaces.

The generated icon is a flat geometric X on a Gunmetal tile, with sage and off-white ribbons and a small negative-space break. It has no glass, facets or neon effects. It is bundled locally in the sidebar, native window, browser tab and both Windows executables. [Asset locations and final prompt](ASSETS.md) record its generation.

## Compact layout

- 58 px desktop top bar and 208 px navigation rail at full width.
- 12–16 px gaps between major cards and 36 px primary controls.
- An 88 px minimum page heading with an uncluttered title and action area.
- Tighter form rows, table cells, timeframe summaries and model metadata.
- A constrained price-chart height and a compact text-based model panel.

The desktop minimum remains 1024 × 720. At smaller browser widths, panels stack and navigation contracts; accessible labels remain present. Tables scroll within their own container. Long translations wrap without hiding important data. System fonts include Japanese, Korean and Chinese fallbacks.

## Interaction and persistence

The app always renders dark, including the native window, controls, metadata and initial canvas before mounting. The top-bar language selection applies immediately and persists independently of research data. Older light/dark settings are ignored while a valid saved locale is retained.

Keyboard focus remains visible. Reduced-motion preferences disable transitions and the progress spinner animation. Hover states use subtle surface changes; status is never communicated only by color.

Screenshots: [overview](images/overview.png), [compact overview](images/overview-compact.png), [compact simulation](images/simulation-compact.png), [trade journal](images/journal.png), [Chinese data page](images/data-compact.png), [Ukrainian training](images/training-uk.png), and [Japanese methodology](images/method.png).

## References

- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) and [nativeImage](https://www.electronjs.org/docs/latest/api/native-image).
- [Electron Builder Windows configuration](https://www.electron.build/win/).
- [Localization implementation](LOCALIZATION.md).
