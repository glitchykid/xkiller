# Design system

Version 0.2.0 applies one brutalist visual system across overview, training, simulation, journal, data, and methodology. Research workflows and scientific calculations remain unchanged.

## Visual language

- Square corners, visible 1–2 px borders, hard offset shadows, and rectangular status markers.
- Large uppercase Arial headings; Consolas/Courier New for market values and technical labels. System fonts keep the portable application fully offline.
- Acid-lime action surfaces (`#d6ff38`) always use dark text. The light palette uses paper (`#f4f3ed`) and white panels; the dark palette uses graphite (`#141611`) and dark green-gray panels.
- Semantic tokens in `src/styles.css` define surfaces, text, borders, positive/negative results, warnings, and chart lines. SVG charts consume the same CSS variables. The EMA line is distinct from bullish and bearish candle colors.
- Charts use flat fills and grid lines. The model illustration presents the actual 24-feature / three-timeframe structure.

## Interaction and accessibility

The light/dark control is available before market data loads and on every page. Both buttons have explicit accessible names and `aria-pressed` state. Navigation exposes the current page and retains accessible labels when its text collapses into icons. Timeframe and trade filters expose selection state. Keyboard focus has a visible outline; reduced-motion preference disables the loading animation. Text and numerical signs accompany semantic colors.

The desktop window supports a minimum size of 1024 × 720. At smaller browser widths, panels stack, navigation contracts, and wide trade tables scroll inside their own container. Charts and forms keep their data density without forcing the whole page to scroll horizontally.

Verified layouts: [simulation](images/simulation-dark.png), [1024 px simulation](images/simulation-compact.png), [trade journal](images/journal-dark.png), [760 px data screen](images/data-compact.png), and [light methodology](images/method-light.png). The README shows both overview themes.

## Preference lifecycle

1. Electron reads `preferences.json` from `app.getPath('userData')`. Without a valid saved theme it uses `nativeTheme.shouldUseDarkColors`.
2. The renderer retrieves the preference through a narrow, trusted-sender IPC handler before mounting Svelte. The first mounted interface therefore uses the saved theme.
3. Selecting a theme validates the value, serializes native writes, atomically replaces the preference file, updates `nativeTheme.themeSource` and the window background, then updates renderer CSS tokens.
4. A failed save leaves the active theme unchanged and shows a retry message. Malformed appearance files do not reset or alter the research workspace.

The browser development fallback uses local storage and the system color preference. Native storage intentionally takes precedence over local storage: a portable application can have a different temporary `file:` origin on each launch.

## References

- [Svelte 5 state](https://svelte.dev/docs/svelte/$state) and [untrack](https://svelte.dev/docs/svelte/svelte#untrack).
- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) and [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation).
- [Svelte Check](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check) for the current TypeScript API compatibility boundary.
