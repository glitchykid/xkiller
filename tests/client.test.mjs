import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform, build } from 'esbuild';
import { parse } from 'svelte/compiler';

async function loadModule(path) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

test('release metadata agrees with the app version and pinned registry artifacts', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].version, manifest.version);
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved?.startsWith('https://registry.npmjs.org/')) continue;
    const artifact = decodeURIComponent(new URL(entry.resolved).pathname);
    assert.ok(artifact.endsWith(`-${entry.version}.tgz`), `${path}: version ${entry.version} disagrees with ${artifact}`);
  }
});

test('legacy themes are discarded while language and safe fallbacks are retained', async () => {
  const { normalizePreferences, validatePreferences } = await loadModule('shared/preferences.ts');
  const fallback = { locale: 'ru' };
  assert.deepEqual(normalizePreferences({ theme: 'light' }, fallback), { locale: 'ru' });
  assert.deepEqual(normalizePreferences({ theme: 'light', locale: 'ko' }, fallback), { locale: 'ko' });
  assert.deepEqual(normalizePreferences(null, fallback), fallback);
  assert.throws(() => validatePreferences({ theme: 'dark', locale: '../../file' }));
  assert.throws(() => validatePreferences({ theme: 'dark' }));
  assert.deepEqual(validatePreferences({ theme: 'light', locale: 'ja', ignored: true }), { locale: 'ja' });
});

test('language persists without legacy theme fields or changes to research data', async () => {
  const { readPreferences, writePreferences } = await loadModule('electron/preferences.ts');
  const base = resolve('.local');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'preferences-'));
  const fallback = { locale: 'ru' };
  try {
    await writeFile(join(root, 'workspace.json'), 'research-data-fixture');
    await writeFile(join(root, 'preferences.json'), '{"theme":"light","locale":"ja"}');
    assert.deepEqual(await readPreferences(root, fallback), { locale: 'ja' });
    await writePreferences(root, { locale: 'zh' });
    assert.deepEqual(await readPreferences(root, fallback), { locale: 'zh' });
    assert.deepEqual(JSON.parse(await readFile(join(root, 'preferences.json'), 'utf8')), { locale: 'zh' });
    await assert.rejects(writePreferences(root, { locale: 'invalid' }));
    assert.deepEqual(await readPreferences(root, fallback), { locale: 'zh' });
    assert.equal(await readFile(join(root, 'workspace.json'), 'utf8'), 'research-data-fixture');
    await writeFile(join(root, 'preferences.json'), '{broken');
    assert.deepEqual(await readPreferences(root, fallback), fallback);
  } finally {
    if (!resolve(root).startsWith(base + sep)) throw new Error('Unexpected test directory');
    await rm(root, { recursive: true, force: true });
  }
});

test('every statically translated UI message exists in all six locales', async () => {
  const { messages } = await loadModule('src/lib/messages.ts');
  for (const path of ['src/App.svelte', 'src/lib/PriceChart.svelte', 'src/lib/LineChart.svelte', 'src/lib/AppearanceControls.svelte', 'src/lib/Pager.svelte', 'src/lib/Tabs.svelte']) {
    const ast = parse(await readFile(path, 'utf8'), { modern: true });
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'CallExpression' && node.callee?.name === 't' && typeof node.arguments[0]?.value === 'string') {
        assert.ok(Object.hasOwn(messages, node.arguments[0].value), `${path}: ${node.arguments[0].value}`);
      }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
    visit(ast);
  }
  for (const [key, translations] of Object.entries(messages)) {
    assert.equal(translations.length, 6, key);
    const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    for (const text of translations) {
      assert.ok(text.trim().length, key);
      assert.deepEqual(placeholders(text), placeholders(translations[0]), key);
    }
  }
});

test('job completion handles instant first jobs without replaying saved or repeated results', async () => {
  const { jobKey, completedJob } = await loadModule('src/lib/jobs.ts');
  const done = { id: 'job-1', kind: 'simulate', status: 'completed' };
  assert.equal(completedJob('', done, 'simulate'), true, 'a submitted job may complete before the first poll');
  assert.equal(completedJob('', done, ''), false, 'loading a saved result is not a new completion');
  assert.equal(completedJob('', done, 'train'), false, 'an unrelated operation must not trigger the result view');
  assert.equal(completedJob('job-1:running', done, ''), true);
  assert.equal(completedJob(jobKey(done), done, 'simulate'), false, 'polling must not repeat completion');
  for (const status of ['running', 'failed', 'cancelled'])
    assert.equal(completedJob('job-1:running', { ...done, status }, 'simulate'), false);
  assert.equal(completedJob('job-1:running', null, 'simulate'), false);
  assert.equal(completedJob(jobKey(done), { ...done, id: 'job-2' }, ''), true);
});

test('pagination retains every record and clamps after filtering or resizing', async () => {
  const { paginate } = await loadModule('src/lib/pagination.ts');
  const records = Array.from({ length: 14 }, (_, id) => ({ id }));
  for (const size of [1, 7, 9, 16]) {
    const { pages } = paginate(records, 0, size);
    const all = Array.from({ length: pages }, (_, page) => paginate(records, page, size).items).flat();
    assert.deepEqual(all, records);
  }
  assert.deepEqual(paginate(records, 99, 9).items, records.slice(9));
  assert.equal(paginate(records.slice(0, 3), 1, 9).page, 0);
  assert.equal(paginate(records, 1, 16).page, 0);
  assert.deepEqual(paginate([], 8, 9), { page: 0, pages: 1, total: 0, start: 0, items: [] });
  assert.deepEqual(paginate(records, -1, 0).items, [records[0]]);
});

test('localization substitutes values and preserves unknown diagnostic details', async () => {
  const { translate } = await loadModule('shared/localization.ts');
  assert.equal(translate('Обзор рынка', 'ja'), '市場概要');
  assert.equal(translate('Обзор рынка', 'ko'), '시장 개요');
  assert.equal(translate('Operation progress', 'zh', { progress: 0 }), '已完成 0%');
  assert.equal(translate('{v0} — {v1} · исторические данные', 'en', { v0: 'A', v1: 'B' }), 'A — B · historical data');
  assert.equal(translate('Bybit: upstream diagnostic', 'uk'), 'Bybit: upstream diagnostic');
});

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
