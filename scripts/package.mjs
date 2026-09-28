import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { build, Platform, Arch } from 'electron-builder';
import electron from 'electron';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
const result = spawnSync(
  process.env.DOTNET_EXE || 'dotnet',
  [
    'publish',
    'backend/Xkiller.Api',
    '-c',
    'Release',
    '-r',
    'win-x64',
    '--self-contained',
    'true',
    '-o',
    'artifacts/backend',
    '-p:RestoreConfigFile=' + resolve('NuGet.Config'),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status || 1);
await build({
  targets: Platform.WINDOWS.createTarget(['portable'], Arch.x64),
  config: { electronDist: dirname(electron) },
});
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const filename = `Xkiller-${version}-x64.exe`;
const hash = createHash('sha256');
for await (const chunk of createReadStream(resolve('release', filename))) hash.update(chunk);
await writeFile(resolve('release/SHA256SUMS.txt'), `${hash.digest('hex')}  ${filename}\n`);
console.log(`Portable executable and SHA256SUMS.txt are ready in release/.`);
