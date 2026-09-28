import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import electron from 'electron';
import './build-electron.mjs';
const web = process.argv.includes('--web');
const dotnet = process.env.DOTNET_EXE || 'dotnet';
const built = spawnSync(
  dotnet,
  ['build', 'backend/Xkiller.Api', '--nologo', '-p:RestoreConfigFile=' + resolve('NuGet.Config')],
  { stdio: 'inherit' },
);
if (built.status !== 0) process.exit(built.status || 1);
const children = [];
let stopping = false;
function cleanup(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => cleanup());
process.on('SIGTERM', () => cleanup());
function start(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on('error', (e) => {
    console.error(e.message);
    cleanup(1);
  });
  child.on('exit', (code) => cleanup(code || 0));
  return child;
}
const token = randomBytes(32).toString('hex');
const env = {
  XKILLER_WEB: web ? '1' : '0',
  XKILLER_TOKEN: token,
  XKILLER_PORT: '5078',
  XKILLER_DATA: resolve('.local/workspace'),
  XKILLER_PARENT_PID: String(process.pid),
};
if (web) start(dotnet, ['backend/Xkiller.Api/bin/Debug/net10.0/Xkiller.Api.dll'], env);
start(process.execPath, ['node_modules/vite/bin/vite.js'], env);
if (!web) {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5173')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) cleanup(1);
  start(electron, ['.'], {
    XKILLER_DEV_URL: 'http://127.0.0.1:5173',
    XKILLER_DATA: resolve('.local/workspace'),
  });
}
