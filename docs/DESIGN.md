# Design system

Version 0.2.4 uses a dense, dark minimalist interface with Gunmetal as the primary color. Internal tabs and adaptive table pages keep content within the desktop viewport. Scientific calculations are independent of presentation.

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

The app icon is fully opaque. Internal icons use sixteen generated raster glyphs in a transparent PNG atlas, tinted through their alpha masks; they are not SVGs or icon-font outlines. The source is packed with high-quality resampling and transparent gutters to avoid neighboring-cell bleed. Bitmap scaling uses smooth browser interpolation, chart geometry uses `geometricPrecision`, and text requests antialiasing. No pixelated/crisp-edge mode is enabled. Data charts remain interactive SVG plots, separate from the raster icon system.

## Compact layout

- 38 px top bar and 176 px navigation rail, contracting to 56 px below 1200 px.
- 8 px gaps between major cards, 30 px primary controls and a 32 px page heading.
- Four-column training settings and three-column simulation settings; all eleven risk fields remain in one visible form.
- Charts use the remaining viewport height; adjacent model metadata stays compact.
- Internal tabs have visible selection and keyboard focus, linked ARIA labels, roving tab stops and Arrow/Home/End navigation.
- Tables use 34 px rows and a shared pager. The observed content height determines the number of rows, capped at 16, with page clamping after filtering or resizing. Execution and cost columns occupy separate journal views.

The default native window is 1180 × 760 and the desktop minimum remains 1024 × 720. The layout is verified down to a 1024 × 660 renderer area, allowing for native chrome. Supported desktop views fit without page or table scrolling; this is achieved by layout and pagination, not clipping overflow. Long translations wrap. System fonts include Japanese, Korean and Chinese fallbacks. Smaller mobile layouts and arbitrary browser zoom levels are outside the desktop fit guarantee.

| Section | Internal views |
| --- | --- |
| Overview | Market, Timeframes |
| Training | Settings, Quality, Features |
| Simulation | Settings, Result, History |
| Journal | Execution, Costs & exit |
| Data | Import, Dataset, Demo |
| Methodology | Research, Assumptions |

Form values and selected views survive navigation for the current session. Completing training, simulation or import selects the corresponding result view. The journal retains its current page during state polling; a new result or side filter resets it. CSV export remains complete regardless of the visible page.

## Interaction and persistence

The app always renders dark, including the native window, controls, metadata and initial canvas before mounting. The top-bar language selection applies immediately and persists independently of research data. Older light/dark settings are ignored while a valid saved locale is retained.

Keyboard focus remains visible. Reduced-motion preferences disable transitions and the progress spinner animation. Hover states use subtle surface changes; status is never communicated only by color.

Screenshots: [overview](images/overview.png), [compact overview](images/overview-compact.png), [simulation settings](images/simulation-compact.png), [simulation result](images/simulation-result.png), [trade journal](images/journal.png), [Chinese data page](images/data-compact.png), [Ukrainian training](images/training-uk.png), and [Japanese methodology](images/method.png).

## References

- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) and [nativeImage](https://www.electronjs.org/docs/latest/api/native-image).
- [Electron Builder Windows configuration](https://www.electron.build/win/).
- [Localization implementation](LOCALIZATION.md).
- [Svelte dimension bindings](https://svelte.dev/docs/svelte/bind#Dimensions) and [bindable props](https://svelte.dev/docs/svelte/$bindable).
- [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
- [CSS raster image scaling](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering), [alpha masks](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-mode), and [chart shape rendering](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/shape-rendering).
