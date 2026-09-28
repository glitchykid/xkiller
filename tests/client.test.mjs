import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
