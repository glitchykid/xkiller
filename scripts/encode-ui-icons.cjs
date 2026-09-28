// Pack the generated raster glyphs into equal cells without redrawing them.
const { app, nativeImage } = require('electron');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

app.setPath('userData', resolve('.local/icon-encoder'));
app
  .whenReady()
  .then(() => {
    const source = nativeImage.createFromPath(resolve('build/ui-icons-source.png'));
    if (source.isEmpty()) throw new Error('Generated icon atlas is missing');
    const { width, height } = source.getSize();
    // The generated rows are optically spaced rather than a perfect pixel grid.
    // These cuts lie in transparent gutters of this specific source image.
    const rows = [0, 0.285, 0.52, 0.755, 1].map((value) => Math.round(value * height));
    const cell = 128,
      padding = 8,
      outputSide = cell * 4;
    const output = Buffer.alloc(outputSide * outputSide * 4);
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const x = Math.round((column * width) / 4);
        const tile = source.crop({
          x,
          y: rows[row],
          width: Math.round(((column + 1) * width) / 4) - x,
          height: rows[row + 1] - rows[row],
        });
        const size = tile.getSize(),
          bytes = tile.toBitmap();
        let left = size.width,
          right = -1,
          top = size.height,
          bottom = -1;
        for (let y = 0; y < size.height; y++)
          for (let x = 0; x < size.width; x++) {
            if (bytes[(y * size.width + x) * 4 + 3] === 0) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        if (right < left) throw new Error(`Empty generated icon ${row * 4 + column}`);
        const cropped = tile.crop({
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
        });
        const factor = (cell - 2 * padding) / Math.max(right - left + 1, bottom - top + 1);
        const icon = cropped.resize({
          width: Math.round((right - left + 1) * factor),
          height: Math.round((bottom - top + 1) * factor),
          quality: 'best',
        });
        const final = icon.getSize(),
          pixels = icon.toBitmap();
        const offsetX = column * cell + Math.floor((cell - final.width) / 2);
        const offsetY = row * cell + Math.floor((cell - final.height) / 2);
        for (let y = 0; y < final.height; y++)
          pixels.copy(
            output,
            ((offsetY + y) * outputSide + offsetX) * 4,
            y * final.width * 4,
            (y + 1) * final.width * 4,
          );
      }
    }
    writeFileSync(
      'public/ui-icons.png',
      nativeImage
        .createFromBitmap(output, { width: outputSide, height: outputSide, scaleFactor: 1 })
        .toPNG(),
    );
    console.log('Encoded sixteen transparent raster icons in a 512 px atlas');
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
