# Design system

Version 0.2.1 uses Glass Morphism in light and dark themes across overview, training, simulation, journal, data, and methodology. Research calculations remain independent of appearance.

## Visual language

- Translucent panels with 20 px backdrop blur, quiet edge highlights, rounded corners, and soft shadows.
- A pearl-blue light canvas and a midnight-blue dark canvas, with restrained violet/cyan background gradients.
- Semantic CSS variables for surfaces, borders, readable text, positive/negative results, warnings, and chart lines. EMA, rising candles, and falling candles use distinct colors in both palettes.
- Segoe UI and system Japanese, Korean, and Chinese fallbacks; tabular market values use a system monospace family. No remote font requests are required.
- Consistent grouped controls, generous panel spacing, concise labels, and visible focus outlines.

The theme buttons and language selector live in the top bar. Selected buttons expose `aria-pressed`; navigation exposes the current page and keeps accessible labels when it contracts to icons. The initial theme follows the system, while a saved choice persists across restarts. Electron's native theme and background are set before window creation. Preference writes do not touch research data.

## Generated identity assets

`src/assets/eth-research-glass.png` is an original generated Ethereum crystal above three frosted data sheets. Its alpha channel lets the scene sit naturally on either palette. The decorative illustration is excluded from the accessibility tree; actual feature counts and timeframe labels remain selectable interface text. Illustrated charts are not market observations.

`build/icon-source.png` is the original generated crystalline X mark. `build/icon.ico` contains 16, 24, 32, 48, 64, 128, and 256 px variants for Windows. `public/icon.png` is the 256 px version used for the window, sidebar, and favicon. Run `node node_modules/electron/cli.js scripts/generate-icons.cjs` after replacing the source to encode both outputs with alpha preserved. Generated outputs are committed, so ordinary builds do not need image generation or icon conversion.

Electron Builder applies icon and version resources while `signExecutable: false` explicitly leaves the build unsigned. This is separate from the removed `signAndEditExecutable: false` setting, which would also suppress the application icon.

## Responsive behavior and accessibility

The desktop minimum is 1024 × 720. At smaller browser widths, panels stack, navigation contracts, and trade tables scroll inside their own container. The language and theme controls remain available. Reduced-motion preference disables animations and transitions. Results have signs and labels as well as semantic colors.

Verified views: [dark overview](images/overview.png), [light overview](images/overview-light.png), [compact simulation](images/simulation-compact.png), [trade journal](images/journal.png), [compact Chinese data page](images/data-compact.png), [Ukrainian training](images/training-uk.png), and [Japanese methodology](images/method.png).

## References

- [Svelte 5 state](https://svelte.dev/docs/svelte/$state) and [derived values](https://svelte.dev/docs/svelte/$derived).
- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme), [nativeImage](https://www.electronjs.org/docs/latest/api/native-image), and [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation).
- [Electron Builder Windows configuration](https://www.electron.build/win/).
- [Localization implementation](LOCALIZATION.md).
