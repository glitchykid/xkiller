# Generated icon

Version 0.2.3 uses one generated flat X monogram on an opaque Gunmetal square, with muted sage and off-white ribbons. It was created with the built-in image generation tool on 2026-09-28. The final icon is bundled locally and works offline.

| Asset | Saved path | Runtime use |
| --- | --- | --- |
| Generated icon source | `build/icon-source.png` | Source for all icon sizes |
| Windows icon | `build/icon.ico` | Seven sizes embedded in the app and portable launcher |
| Local PNG icon | `public/icon.png` | Native window, sidebar and browser tab |

The former decorative background and Ethereum illustration are removed from the application. Earlier artwork remains in Git history. No external image service is used at runtime.

Run `node node_modules/electron/cli.js scripts/generate-icons.cjs` after replacing the source. It encodes the image at 16, 24, 32, 48, 64, 128 and 256 px; it does not redraw the generated mark. The final source is opaque. Icon outputs are committed, so normal builds do not rerun generation. The executable has icon/version resources but is unsigned.

## Generation prompt

Use case: logo-brand. Create a finished modern MINIMALIST desktop app icon for Xkiller, a serious financial research application. Square canvas, a single rounded-square flat matte GUNMETAL #2A3439 tile, with one distinctive geometric X monogram centered inside. The X is formed by two clean broad diagonal ribbons with a tiny precise negative-space break at their intersection: one ribbon muted sage #B7CBBB, the other soft neutral off-white #E8ECE9. Symmetric, calm, understated, polished, legible at 16-32 pixels. Flat vector-like shapes rendered as a crisp raster, perfectly smooth edges, generous 20% inner breathing room. No 3D, no facets, no glass, no chrome, no shine, no bevel, no glow, no gradients, no texture, no decorative border, no drop shadow, no neon, no purple, pink, lime, blue, cyan or teal. Gunmetal should read as dark neutral metal gray. Rounded tile occupies 90% of canvas. Transparent outside the rounded tile with true clean alpha. No letters besides the X symbol, no text, no chart, no extra objects, no watermark.

The first image was used as the edit target for the final opaque version below. Only the final result is included in the application.

## Final edit prompt

Use case: precise-object-edit. Produce an OPAQUE square app icon from the supplied minimalist X design. Preserve only the exact X monogram shape and the muted sage/off-white colors. Replace the ENTIRE BACKGROUND, edge to edge of the square canvas, with one perfectly uniform solid Gunmetal #2A3439 color. Fill the previous rounded corners and all irregular dark/transparent patches with the same gunmetal color. The result must be fully opaque everywhere: no alpha, no transparency, no cutouts outside the X, no holes. Flat minimal geometry, no gradients, no texture, no shadows, no glows, no 3D, no border, no neon, no blue accents. One quiet X mark centered with generous clear space on a plain dark gunmetal square. This image is the finished icon, not a mockup.

Final transparency setting: false. Tool: built-in image generation, not the fallback CLI.
