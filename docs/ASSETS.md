# Generated raster icons

The application icon, introduced in version 0.2.3, is a generated flat X monogram on an opaque Gunmetal square, with muted sage and off-white ribbons. It was created with the built-in image generation tool on 2026-09-28. Version 0.2.4 adds a transparent raster atlas for internal controls. All icons are bundled locally and work offline.

| Asset | Saved path | Runtime use |
| --- | --- | --- |
| Generated icon source | `build/icon-source.png` | Source for all icon sizes |
| Windows icon | `build/icon.ico` | Seven sizes embedded in the app and portable launcher |
| Local PNG icon | `public/icon.png` | Native window, sidebar and browser tab |
| Generated internal icon source | `build/ui-icons-source.png` | Transparent source for sixteen UI glyphs |
| Packed raster atlas | `public/ui-icons.png` | 512 × 512 PNG, sixteen 128 px cells, alpha-masked by `Icon.svelte` |

The former decorative background and Ethereum illustration are removed from the application. Earlier artwork remains in Git history. No external image service is used at runtime.

Run `node node_modules/electron/cli.js scripts/generate-icons.cjs` after replacing the source. It encodes the image at 16, 24, 32, 48, 64, 128 and 256 px; it does not redraw the generated mark. The final source is opaque. Icon outputs are committed, so normal builds do not rerun generation. The executable has icon/version resources but is unsigned.

## Generation prompt

Use case: logo-brand. Create a finished modern MINIMALIST desktop app icon for Xkiller, a serious financial research application. Square canvas, a single rounded-square flat matte GUNMETAL #2A3439 tile, with one distinctive geometric X monogram centered inside. The X is formed by two clean broad diagonal ribbons with a tiny precise negative-space break at their intersection: one ribbon muted sage #B7CBBB, the other soft neutral off-white #E8ECE9. Symmetric, calm, understated, polished, legible at 16-32 pixels. Flat vector-like shapes rendered as a crisp raster, perfectly smooth edges, generous 20% inner breathing room. No 3D, no facets, no glass, no chrome, no shine, no bevel, no glow, no gradients, no texture, no decorative border, no drop shadow, no neon, no purple, pink, lime, blue, cyan or teal. Gunmetal should read as dark neutral metal gray. Rounded tile occupies 90% of canvas. Transparent outside the rounded tile with true clean alpha. No letters besides the X symbol, no text, no chart, no extra objects, no watermark.

The first image was used as the edit target for the final opaque version below. Only the final result is included in the application.

## Final edit prompt

Use case: precise-object-edit. Produce an OPAQUE square app icon from the supplied minimalist X design. Preserve only the exact X monogram shape and the muted sage/off-white colors. Replace the ENTIRE BACKGROUND, edge to edge of the square canvas, with one perfectly uniform solid Gunmetal #2A3439 color. Fill the previous rounded corners and all irregular dark/transparent patches with the same gunmetal color. The result must be fully opaque everywhere: no alpha, no transparency, no cutouts outside the X, no holes. Flat minimal geometry, no gradients, no texture, no shadows, no glows, no 3D, no border, no neon, no blue accents. One quiet X mark centered with generous clear space on a plain dark gunmetal square. This image is the finished icon, not a mockup.

Final transparency setting: false. Tool: built-in image generation, not the fallback CLI.

## Version 0.2.4 internal icons

The internal symbols are generated raster artwork with true transparency, distinct from the opaque app icon. The atlas contains dashboard, brain, chart, list, database, right arrow, play, download, shield, information, check, close, lightning, sliders, globe and Ethereum glyphs. The renderer uses PNG alpha masks to inherit each control's text color. It contains no SVG icon paths or icon-font dependency. The application still uses SVG for interactive data plots.

The first white-line generation contained stray speckles and was rejected. The final cleanup generation below produced clean black glyphs with transparent alpha. Only that final source is committed. `node node_modules/electron/cli.js scripts/encode-ui-icons.cjs` crops along its transparent gutters, centers each glyph and resamples it at high quality into equal cells with 8 px padding. This encodes the generated artwork without redrawing its shapes. Normal builds use the committed atlas. `npm run test:assets` verifies all cell borders are transparent, each glyph is present with partially transparent antialiased edge pixels, and the application icon source and PNG remain completely opaque.

### Initial atlas prompt

Create one production-ready raster UI icon sprite atlas for Xkiller, a compact understated Gunmetal dark desktop research app. Square canvas with genuine transparent alpha background. A precise four-column by four-row grid of sixteen separate white line icons, one icon centered in each equal cell. No cell borders, background, tile, text, labels, numbers, guide lines, shadow, glow, gradients or colored accents. Equal spacing and scale, generous transparent margins, antialiased uniform rounded strokes and clean minimal geometry. Exact row-major content: dashboard four squares, brain, rising line chart, bulleted list; database cylinder, right arrow, play triangle, download; shield with check, information circle, check mark, close X; lightning, settings sliders, globe, Ethereum diamond. Transparent canvas between and inside hollow strokes. A raster sprite atlas, not an application mockup.

### Final cleanup prompt

Precise cleanup of the supplied 4x4 UI icon atlas. Completely remove every stray mark, speckle, texture and random hole. Redraw the same sixteen icon shapes in the same row-major ordering, aligned to equal cells, as clean solid black monochrome linework, uniform rounded strokes and smooth antialiased edges. Black icons on a truly transparent background with correct alpha. Every area outside the intended icon strokes must be fully transparent: no white, grey, checkerboard or haze. Outline icons with empty transparent interiors. Keep every icon isolated at the center of its cell with large transparent margins. No borders or labels. Row 1: dashboard four squares, brain, rising chart axes, three-bullet list. Row 2: database cylinder, right arrow, play triangle, download. Row 3: shield with check, information circle, check, close X. Row 4: lightning, horizontal sliders, globe, Ethereum diamond. No grunge, particles, glows, shadows, backgrounds, gradients, extra strokes or presentation. One polished transparent PNG sprite sheet.

Final transparency setting: true. Tool: built-in image generation and edit, not the fallback CLI. The source is 1254 × 1254; the runtime atlas is 512 × 512.
