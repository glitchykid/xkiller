import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

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
