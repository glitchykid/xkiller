// Encode the generated source as Windows ICO and the local UI/favicon PNG.
// Electron's encoder preserves the source alpha channel at every icon size.
const { app, nativeImage } = require('electron');
const { writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
app
  .whenReady()
  .then(() => {
    const source = nativeImage.createFromPath(resolve('build/icon-source.png'));
    if (source.isEmpty()) throw new Error('Generated icon source is missing.');
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = sizes.map((size) =>
      source.resize({ width: size, height: size, quality: 'best' }).toPNG(),
    );
    const header = Buffer.alloc(6 + sizes.length * 16);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, index) => {
      const pos = 6 + index * 16;
      header[pos] = header[pos + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, pos + 4);
      header.writeUInt16LE(32, pos + 6);
      header.writeUInt32LE(images[index].length, pos + 8);
      header.writeUInt32LE(offset, pos + 12);
      offset += images[index].length;
    });
    writeFileSync('build/icon.ico', Buffer.concat([header, ...images]));
    mkdirSync('public', { recursive: true });
    writeFileSync('public/icon.png', images.at(-1));
    console.log('Generated icon encoded at 16–256 px for Windows and the UI.');
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
