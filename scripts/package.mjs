import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { build, Platform, Arch } from 'electron-builder';
import electron from 'electron';
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
