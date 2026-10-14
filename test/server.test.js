import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function withServer(fn) {
  delete process.env.QLOO_API_KEY;
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('health endpoint and static page', async () => {
  await withServer(async (base) => {
    const h = await (await fetch(`${base}/api/health`)).json();
    assert.equal(h.ok, true);
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Batus/);
  });
});

test('POST /api/praise returns a message and labelled sample picks', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/praise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'results came out', mode: 'calm', artists: ['Sinach'], songs: ['Bata'] }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.crisis, false);
    assert.equal(data.source, 'sample');
    assert.ok(data.message.opener);
    assert.ok(data.message.topic);
    assert.equal(data.favourites[0].title, 'Bata');
  });
});

test('rejects bad JSON, oversized bodies and path traversal', async () => {
  await withServer(async (base) => {
    const bad = await fetch(`${base}/api/praise`, { method: 'POST', body: '{nope' });
    assert.equal(bad.status, 400);
    const big = await fetch(`${base}/api/praise`, { method: 'POST', body: 'x'.repeat(20_000) }).catch(() => null);
    assert.ok(big === null || big.status === 413);
    const trav = await fetch(`${base}/..%2fpackage.json`);
    assert.notEqual(trav.status, 200);
  });
});
