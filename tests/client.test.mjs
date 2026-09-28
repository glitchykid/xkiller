import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform, build } from 'esbuild';

test('reactive form proxies cross the Electron bridge as plain cloneable data', async () => {
  const source = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { request } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const previousWindow = globalThis.window;
  const calls = [];
  globalThis.window = {
    xkiller: {
      request: async (action, payload) => {
        calls.push({ action, payload: structuredClone(payload) });
        return { ok: true };
      },
    },
  };
  try {
    const form = new Proxy({ leverage: 3, nested: new Proxy({ confidence: 0.5 }, {}) }, {});
    assert.throws(() => structuredClone(form));
    assert.deepEqual(await request('simulate', form), { ok: true });
    assert.deepEqual(calls[0], { action: 'simulate', payload: { leverage: 3, nested: { confidence: 0.5 } } });
    await request('state');
    assert.equal(calls[1].payload, undefined);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('desktop theme survives a new reader and rejects invalid writes without changing research', async () => {
  const bundled = await build({ entryPoints: ['electron/preferences.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
  const { readTheme, writeTheme } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  const base = resolve('.local');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, 'theme-persistence-'));
  try {
    await writeFile(join(directory, 'workspace.json'), 'research fixture');
    assert.equal(await readTheme(directory, 'dark'), 'dark');
    for (const theme of ['light', 'dark', 'light']) {
      await writeTheme(directory, theme);
      assert.equal(await readTheme(directory, theme === 'dark' ? 'light' : 'dark'), theme);
    }
    for (const theme of [null, {}, 'system', '../dark']) await assert.rejects(writeTheme(directory, theme), /Invalid theme/);
    assert.equal(await readTheme(directory, 'dark'), 'light');
    assert.equal(await readFile(join(directory, 'workspace.json'), 'utf8'), 'research fixture');
    for (const invalid of ['broken JSON', '{"theme":"unknown"}', 'null']) {
      await writeFile(join(directory, 'preferences.json'), invalid);
      assert.equal(await readTheme(directory, 'dark'), 'dark');
    }
  } finally {
    if (!resolve(directory).startsWith(base + sep)) throw new Error('Unexpected test directory');
    await rm(directory, { recursive: true, force: true });
  }
});

test('theme initialization respects system, browser preference, and the stable desktop preference', async () => {
  const source = await readFile(new URL('../src/lib/theme.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { initializeTheme, saveTheme } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const names = ['window', 'document', 'matchMedia', 'localStorage'];
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  let saved = null;
  const root = { dataset: {}, style: {} };
  const fixtures = [{}, { documentElement: root, querySelector: () => null }, () => ({ matches: true }), {
    getItem: () => saved,
    setItem: (_key, value) => { saved = value; },
  }];
  names.forEach((name, i) => Object.defineProperty(globalThis, name, { value: fixtures[i], writable: true, configurable: true }));
  try {
    assert.equal(await initializeTheme(), 'dark');
    saved = 'invalid';
    assert.equal(await initializeTheme(), 'dark');
    await saveTheme('light');
    assert.equal(await initializeTheme(), 'light');
    assert.equal(root.dataset.theme, 'light');
    globalThis.localStorage = { getItem: () => { throw new Error('Storage denied'); } };
    assert.equal(await initializeTheme(), 'dark');
    let nativeSaved = 'light';
    globalThis.window.xkiller = {
      getTheme: async () => nativeSaved,
      setTheme: async theme => { nativeSaved = theme; return theme; },
    };
    assert.equal(await initializeTheme(), 'light');
    await saveTheme('dark');
    assert.equal(nativeSaved, 'dark');
    assert.equal(root.style.colorScheme, 'dark');
    globalThis.window.xkiller.setTheme = async () => { throw new Error('Disk is read-only'); };
    await assert.rejects(saveTheme('light'), /read-only/);
    assert.equal(root.dataset.theme, 'dark');
  } finally {
    names.forEach((name, i) => {
      if (descriptors[i]) Object.defineProperty(globalThis, name, descriptors[i]);
      else delete globalThis[name];
    });
  }
});

test('IPC accepts filesystem aliases of its own document and rejects other documents', async () => {
  const source = await readFile(new URL('../electron/trust.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { isTrustedDocument } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const base = resolve('.local');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'ipc-trust-'));
  try {
    const actual = join(root, 'Application Directory');
    const alias = join(root, 'alias');
    await mkdir(actual);
    await writeFile(join(actual, 'app.asar'), 'archive path fixture');
    await writeFile(join(actual, 'other.asar'), 'other archive');
    await symlink(actual, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const document = (directory, file='index.html') => pathToFileURL(join(directory, 'app.asar', 'dist', file)).href;
    const expected = document(actual);
    assert.equal(isTrustedDocument(document(alias), expected), true);
    assert.equal(isTrustedDocument(document(actual, 'other.html'), expected), false);
    assert.equal(isTrustedDocument(expected.replace('app.asar', 'other.asar'), expected), false);
    assert.equal(isTrustedDocument(expected+'?untrusted=1', expected), false);
    assert.equal(isTrustedDocument('https://example.com', expected), false);
    assert.equal(isTrustedDocument('http://127.0.0.1:5173/', 'http://127.0.0.1:5173'), true);
    assert.equal(isTrustedDocument('http://127.0.0.1:5173/other', 'http://127.0.0.1:5173'), false);
  } finally {
    if (!resolve(root).startsWith(base + sep)) throw new Error('Unexpected test directory');
    await rm(root, { recursive: true, force: true });
  }
});
