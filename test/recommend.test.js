import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, assertGrounded, cleanList } from '../lib/recommend.js';

function mockFetch(routes) {
  return async (url) => {
    const u = new URL(url);
    const handler = routes[u.pathname];
    if (!handler) return { ok: false, status: 500, json: async () => ({}) };
    return handler(u);
  };
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

const goodRoutes = {
  '/search': (u) =>
    ok({ results: [{ entity_id: `id-${u.searchParams.get('query')}`, name: u.searchParams.get('query') }] }),
  '/v2/tags': () => ok({ results: { tags: [{ id: 'urn:tag:genre:music:gospel', name: 'Gospel' }] } }),
  '/v2/insights': () =>
    ok({
      results: {
        entities: [
          { entity_id: 'a1', name: 'Dunsin Oyekan', tags: [{ name: 'worship' }], query: { affinity: 0.91 } },
          { entity_id: 'a2', name: 'Sinach', tags: [{ name: 'praise' }], query: { affinity: 0.84 } },
          { entity_id: 'a3', name: 'Minister Prudence', query: { affinity: 0.8 } }, // a seed: must be dropped
        ],
      },
    }),
};

test('live path returns Qloo artists and drops the seeds', async () => {
  const r = await recommend({
    seeds: ['Minister Prudence'],
    songs: ['Bata'],
    mode: 'dance',
    apiKey: 'test',
    fetchImpl: mockFetch(goodRoutes),
  });
  assert.equal(r.source, 'qloo');
  assert.deepEqual(r.picks.map((p) => p.name), ['Dunsin Oyekan', 'Sinach']);
  assert.equal(r.picks[0].affinity, 0.91);
  assert.match(r.picks[0].links.youtube, /praise%20dance%20songs/);
  assert.equal(r.favourites[0].title, 'Bata');
});

test('sends the API key header and never puts it in the URL', async () => {
  let seen;
  const f = async (url, opts) => {
    seen = { url: String(url), key: opts.headers['X-Api-Key'] };
    return ok({ results: [] });
  };
  await recommend({ seeds: ['Sinach'], apiKey: 'secret-key', fetchImpl: f });
  assert.equal(seen.key, 'secret-key');
  assert.ok(!seen.url.includes('secret-key'));
});

test('falls back to artist-only signals when the tag query fails', async () => {
  let insightCalls = 0;
  const routes = {
    ...goodRoutes,
    '/v2/insights': (u) => {
      insightCalls += 1;
      if (u.searchParams.get('signal.interests.tags')) return { ok: false, status: 400, json: async () => ({}) };
      return goodRoutes['/v2/insights'](u);
    },
  };
  const r = await recommend({ seeds: ['Sinach'], apiKey: 'k', fetchImpl: mockFetch(routes) });
  assert.equal(insightCalls, 2);
  assert.equal(r.source, 'qloo');
  assert.ok(r.picks.length > 0);
});

test('Qloo outage degrades gracefully and still returns the person\'s own songs', async () => {
  const f = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const r = await recommend({ seeds: ['Sinach'], songs: ['Bata'], apiKey: 'k', fetchImpl: f });
  assert.equal(r.source, 'error');
  assert.equal(r.picks.length, 0);
  assert.equal(r.favourites.length, 1);
});

test('no key means labelled sample data, never presented as live', async () => {
  const r = await recommend({ seeds: ['Sinach'], apiKey: '' });
  assert.equal(r.source, 'sample');
  assert.ok(r.picks.every((p) => p.name.toLowerCase() !== 'sinach'));
  assert.ok(r.trace.join(' ').includes('sample'));
});

test('THESIS: an artist that is neither a seed nor from Qloo is blocked', () => {
  assert.throws(
    () => assertGrounded([{ name: 'Invented Artist' }], ['Sinach', 'Dunsin Oyekan']),
    /Ungrounded recommendation blocked/,
  );
  assert.doesNotThrow(() => assertGrounded([{ name: 'sinach' }], ['Sinach']));
});

test('cleanList trims, dedupes, caps and ignores junk', () => {
  assert.deepEqual(cleanList(['  Sinach ', 'sinach', 5, '', 'A', 'B', 'C'], 3), ['Sinach', 'A', 'B']);
  assert.deepEqual(cleanList('nope', 3), []);
});
