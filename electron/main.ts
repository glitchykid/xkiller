import { app, BrowserWindow, ipcMain, dialog, session, nativeTheme } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { isTrustedDocument } from './trust';
import { readPreferences, writePreferences } from './preferences';
import { themeBackground } from '../shared/preferences';

let backend: ChildProcess | undefined;
let backendUrl = '';
const token = randomBytes(32).toString('hex');
const devUrl = !app.isPackaged ? process.env.XKILLER_DEV_URL : undefined;
if (devUrl && devUrl !== 'http://127.0.0.1:5173') throw new Error('Unexpected development origin');
const indexPath = join(__dirname, '../dist/index.html');
const expectedUrl = devUrl || pathToFileURL(indexPath).href;
const routes: Record<string, { method: string; path: string }> = {
  state: { method: 'GET', path: '/api/state' },
  import: { method: 'POST', path: '/api/import' },
  demo: { method: 'POST', path: '/api/demo' },
  train: { method: 'POST', path: '/api/train' },
  simulate: { method: 'POST', path: '/api/simulate' },
  cancel: { method: 'POST', path: '/api/cancel' },
};
function trusted(event: Electron.IpcMainInvokeEvent) {
  if (
    !event.senderFrame ||
    event.senderFrame !== event.sender.mainFrame ||
    !isTrustedDocument(event.senderFrame.url, expectedUrl)
  )
    throw new Error('Untrusted sender');
}
async function request(method: string, path: string, payload?: unknown) {
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  if (body && body.length > 16_384) throw new Error('Request too large');
  const response = await fetch(backendUrl + path, {
    method,
    headers: { 'X-Xkiller-Token': token, 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Backend request failed');
  return value;
}
async function startBackend() {
  const command = app.isPackaged
    ? join(process.resourcesPath, 'backend/Xkiller.Api.exe')
    : process.env.DOTNET_EXE || 'dotnet';
  const args = app.isPackaged
    ? []
    : [resolve('backend/Xkiller.Api/bin/Debug/net10.0/Xkiller.Api.dll')];
  backend = spawn(command, args, {
    windowsHide: true,
    env: {
      ...process.env,
      XKILLER_TOKEN: token,
      XKILLER_PORT: '0',
      XKILLER_PARENT_PID: String(process.pid),
      XKILLER_DATA: process.env.XKILLER_DATA || join(app.getPath('userData'), 'workspace'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const child = backend;
  await new Promise<void>((res, rej) => {
    let buffer = '',
      errors = '';
    const timer = setTimeout(() => rej(new Error('Backend startup timed out')), 60_000);
    child.stderr?.on('data', (chunk) => {
      errors = (errors + chunk.toString()).slice(-4000);
    });
    child.stdout?.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/XKILLER_READY (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        backendUrl = match[1];
        clearTimeout(timer);
        res();
      }
    });
    child.once('error', (err) => {
      clearTimeout(timer);
      rej(err);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      rej(new Error(`Backend exited (${code}). ${errors}`));
    });
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else
  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      const preferencesDirectory = app.getPath('userData');
      let preferences = await readPreferences(preferencesDirectory, {
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
        locale: 'ru',
      });
      nativeTheme.themeSource = preferences.theme;
      await startBackend();
      ipcMain.handle('preferences:get', (event) => {
        trusted(event);
        return preferences;
      });
      let pendingPreferences = Promise.resolve();
      ipcMain.handle('preferences:set', (event, value: unknown) => {
        trusted(event);
        const update = pendingPreferences.then(async () => {
          preferences = await writePreferences(preferencesDirectory, value);
          nativeTheme.themeSource = preferences.theme;
          for (const window of BrowserWindow.getAllWindows())
            window.setBackgroundColor(themeBackground(preferences.theme));
          return preferences;
        });
        pendingPreferences = update.then(
          () => {},
          () => {},
        );
        return update;
      });
      ipcMain.handle('lab:request', async (event, action: string, payload?: unknown) => {
        trusted(event);
        const route = Object.hasOwn(routes, action) ? routes[action] : undefined;
        if (!route) throw new Error('Unknown action');
        return request(route.method, route.path, payload);
      });
      ipcMain.handle('lab:export', async (event, kind: string) => {
        trusted(event);
        if (!['model', 'report', 'trades'].includes(kind)) throw new Error('Unknown export');
        const data = await request('GET', '/api/export/' + kind);
        const result = await dialog.showSaveDialog({ defaultPath: data.filename });
        if (result.canceled || !result.filePath) return false;
        await writeFile(result.filePath, data.content, 'utf8');
        return true;
      });
      const win = new BrowserWindow({
        width: 1480,
        height: 960,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: themeBackground(preferences.theme),
        title: 'Xkiller — ETH Research Lab',
        icon: join(__dirname, '../dist/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
          preload: join(__dirname, 'preload.cjs'),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
        },
      });
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-navigate', (event, url) => {
        if (!isTrustedDocument(url, expectedUrl)) event.preventDefault();
      });
      if (devUrl) await win.loadURL(devUrl);
      else await win.loadFile(indexPath);
      app.on('second-instance', () => {
        if (win.isMinimized()) win.restore();
        win.focus();
      });
    })
    .catch((error) => {
      dialog.showErrorBox('Xkiller could not start', String(error));
      app.quit();
    });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => backend?.kill());
