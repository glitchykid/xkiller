# Design system

Version 0.2.2 uses a compact, dark-only cyberpunk Glass Morphism interface with modern minimalist graphics. Scientific calculations are independent of presentation.

## Five-color palette

| Role | Color | Hex | Use |
| --- | --- | --- | --- |
| Primary 1 | Warm graphite | `#120E17` | Canvas, window background, dark glass |
| Primary 2 | Orchid purple | `#A84DE4` | Active navigation, glass illumination, instrument mark |
| Supporting 1 | Fuchsia | `#F46CBA` | Secondary illumination, negative results and falling candles |
| Supporting 2 | Emerald | `#65EDAD` | Positive results, rising candles, research labels |
| Accent | Lime | `#D7FF4F` | Primary actions, selected-state accents and small highlights |

Neutral text and lighter/darker variants support contrast; they are not additional brand colors. Blue, navy, and cyan are excluded. The EMA line uses a lighter orchid tint to separate it from both candle directions. Numerical signs and text accompany semantic colors.

## Minimal graphics and visible glass

The generated background has just a few large geometric planes and neon edges, with calm negative space. There is no busy cityscape, fake data, repeated circuitry, or continuous decorative animation. The image stays fixed behind the application and remains visible between panels. Panels use a 64% opaque dark fill, 20 px backdrop blur, thin translucent borders, restrained shadows, and rounded corners. Headers and the sidebar use their own dark translucent surfaces to keep navigation legible.

The generated X icon is a single recognizable mark. The model card's generated Ethereum illustration is displayed at 112 px high instead of dominating the research panel. These images are decorative, loaded locally, and do not represent market observations. [Asset locations and final prompts](ASSETS.md) record the generation workflow.

## Compact layout

- 58 px desktop top bar and 208 px navigation rail at full width.
- 12–16 px gaps between major cards, smaller panel headings, and 36 px primary controls.
- Tighter form rows, table cells, timeframe summaries, and model metadata.
- A 112 px minimum page heading with an uncluttered title and action area.
- A constrained price-chart height balances the chart with the compact model panel.

The desktop minimum remains 1024 × 720. At smaller browser widths, panels stack and navigation contracts; accessible labels remain present. Tables scroll within their own container. Long translations wrap without hiding important data. System fonts include Japanese, Korean, and Chinese fallbacks.

## Interaction and persistence

The app always renders dark, including the native window, controls, metadata, and initial canvas before mounting. There is no light palette or theme selector. The top-bar language selection applies immediately and persists independently of research data. Older light/dark settings are ignored, while a valid saved locale is retained.

Keyboard focus remains visible. Reduced-motion preferences disable transitions and the progress spinner animation. Hover states use restrained surface changes, and status is never communicated only by color.

Screenshots: [overview](images/overview.png), [compact overview](images/overview-compact.png), [compact simulation](images/simulation-compact.png), [trade journal](images/journal.png), [Chinese data page](images/data-compact.png), [Ukrainian training](images/training-uk.png), and [Japanese methodology](images/method.png).

## References

- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) and [nativeImage](https://www.electronjs.org/docs/latest/api/native-image).
- [CSS backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).
- [Electron Builder Windows configuration](https://www.electron.build/win/).
- [Localization implementation](LOCALIZATION.md).
