const assert = require('node:assert/strict');
const { app, nativeImage } = require('electron');
const { resolve } = require('node:path');

app.setPath('userData', resolve('.local/icon-tests'));
app.whenReady().then(() => {
  const atlas = nativeImage.createFromPath(resolve('public/ui-icons.png'));
  assert.ok(!atlas.isEmpty(), 'The raster UI atlas must exist and decode');
  const { width, height } = atlas.getSize();
  assert.equal(width, height, 'The atlas must be square');
  assert.equal(width % 4, 0, 'The atlas must contain sixteen equal cells');
  const side = width / 4;
  assert.ok(side >= 64, 'Icons must retain enough resolution for display scaling');
  const bitmap = atlas.toBitmap();
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      let visible = 0, smooth = 0;
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const alpha = bitmap[((row * side + y) * width + column * side + x) * 4 + 3];
          if (alpha > 0) visible++;
          if (alpha > 0 && alpha < 255) smooth++;
          if (x < 4 || y < 4 || x >= side - 4 || y >= side - 4)
            assert.equal(alpha, 0, `Icon ${row * 4 + column}: transparent padding must prevent neighboring bleed`);
        }
      }
      assert.ok(visible > side * side * 0.01 && visible < side * side * 0.55, `Icon ${row * 4 + column}: visible glyph without a filled background`);
      assert.ok(smooth > 0, `Icon ${row * 4 + column}: antialiased alpha edges are required`);
    }
  }
  console.log('PASS All sixteen raster UI icons have transparent padding and antialiased edges');
  for (const path of ['build/icon-source.png', 'public/icon.png']) {
    const image = nativeImage.createFromPath(resolve(path));
    assert.ok(!image.isEmpty(), `${path}: app icon must decode`);
    const bytes = image.toBitmap();
    for (let offset = 3; offset < bytes.length; offset += 4)
      assert.equal(bytes[offset], 255, `${path}: app icon must be fully opaque`);
  }
  console.log('PASS Application icon source and runtime PNG are fully opaque');
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});
