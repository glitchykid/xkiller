# Generated visual assets

These project assets were generated with the built-in image generation tool on 2026-09-28, then copied into the repository. No external image service is needed at runtime. The original generation outputs remain outside the project; the committed files below are the application sources. Earlier visual experiments are not bundled.

| Asset | Saved path | Runtime use |
| --- | --- | --- |
| Minimal cyberpunk background | `src/assets/cyberpunk-glass.png` | Fixed backdrop behind translucent panels |
| Ethereum crystal and plates | `src/assets/eth-research-glass.png` | Decorative compact model illustration |
| Crystalline X source | `build/icon-source.png` | Source for application icons |
| Windows icon | `build/icon.ico` | Seven sizes embedded in the application and portable EXEs |
| Local PNG icon | `public/icon.png` | Window, sidebar and browser tab |

Run `node node_modules/electron/cli.js scripts/generate-icons.cjs` after changing the icon source. It encodes the source at 16, 24, 32, 48, 64, 128, and 256 px with alpha preserved. The script performs size/format conversion; it does not redraw the generated identity. Icon outputs are committed, so normal builds do not rerun generation. The EXE has icon/version resources but is unsigned.

## Final background prompt

Use case: stylized-concept. Create a modern MINIMALIST cyberpunk abstract background wallpaper, wide landscape 16:9, for a compact dark frosted-glass desktop dashboard. This is NOT a city scene and NOT a UI mockup. Composition: just three or four oversized sleek architectural glass planes and restrained thin neon light strips forming a calm asymmetrical geometric corridor, lots of dark negative space in the center. Matte warm graphite-black #120E17 dominates 75 percent. One broad warm orchid-purple #A84DE4 glow is the second primary. Supporting colors hot fuchsia #F46CBA and pure emerald green #65EDAD mark separate simple edges. One tiny acid-lime #D7FF4F segment is the accent. STRICTLY no blue, cyan, teal, navy, blue shadows or cool blue reflections. Dark smoky-plum shadows, smooth gradients, clean geometry, contemporary restrained cyberpunk industrial design. A few broad gentle reflections and frosted textures give the overlaid transparent interface depth. No tiny detail, no repeated circuitry, no particles, no complex grid, no buildings, no skyline, no figurative scene, no holographic symbols, no people, no text, no numbers, no icons, no logos. Elegant and memorable through composition and color, not ornamentation. Fill the frame, no border.

Transparency: false.

## Final icon prompt

Generate a finished square desktop application icon for Xkiller, a cyberpunk Ethereum research laboratory. STRICT NO BLUE OR CYAN OR TEAL OR NAVY ANYWHERE. A centered rounded-square warm graphite-black #120E17 glass tile with a single bold geometric X made of two intersecting thick prismatic glass ribbons: one warm orchid-purple #A84DE4 and one bright emerald-green #65EDAD. Thin hot-fuchsia #F46CBA refractive edge highlights, one small acid-lime #D7FF4F glowing diamond at their center. Pure warm purple and pure green reflections, never blue. Large simple solid silhouette legible at 16–32 pixels, symmetrical frontal orthographic view, tile occupies 92% of square canvas with generous 14% interior padding. Polished dark cyberpunk hardware, high contrast restrained neon edges. Transparent outside rounded tile, clean alpha edges, no other objects, no text, no watermark, no UI mockup.

Transparency: true.

## Final illustration prompt

Small premium decorative illustration for a compact cyberpunk financial research dashboard: one faceted translucent Ethereum diamond suspended over three thin floating glass data plates, with simple embossed abstract lines on the plates, orthographic three-quarter view, centered composition in a wide landscape image. Warm orchid-purple #A84DE4 and pure emerald-green #65EDAD prism glass, thin hot fuchsia #F46CBA edge light, sparse acid-lime #D7FF4F highlight. Deep warm graphite #120E17 shadows. STRICTLY NO BLUE, CYAN, TEAL, NAVY, icy blue, or blue reflections. Transparent background, no text, no numbers, no real market chart, no watermark. Strong clean silhouette, minimal floating objects, no tiny particles, elegant and legible when displayed 140 pixels tall.

Transparency: true. The final compact layout displays it at 112 px high.
