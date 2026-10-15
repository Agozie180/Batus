import test from 'node:test';
import assert from 'node:assert/strict';
import { topSongs, attachSongs } from '../lib/songs.js';
import { createQlooClient } from '../lib/qloo.js';
import { diagnose } from '../lib/diagnose.js';
import { handlePraise } from '../lib/praise.js';
import { router, itunesRoutes, qlooRoutes, ok, fail } from './helpers.js';

const routes = { 'itunes.apple.com/search': itunesRoutes['/search'], ...qlooRoutes };

test('songs: only the artist\'s own real tracks; karaoke, other artists and non-https previews are dropped', async () => {
  const songs = await topSongs('Adele', { fetchImpl: router(routes), useCache: false });
  assert.deepEqual(songs.map((s) => s.title), ['Adele Song One', 'Bad Preview']);
  assert.equal(songs[0].preview, 'https://audio/1.m4a');
  assert.equal(songs[0].art, 'https://img/300x300.jpg');
  assert.equal(songs[1].preview, null); // http preview rejected
});

test('songs: iTunes down means no songs, never an exception', async () => {
  assert.deepEqual(await topSongs('Adele', { fetchImpl: router({ 'itunes.apple.com/search': () => fail(500) }), useCache: false }), []);
  assert.deepEqual(await topSongs('Adele', { fetchImpl: async () => { throw new Error('offline'); }, useCache: false }), []);
});

test('songs are attached to artist picks only, capped', async () => {
  const picks = [{ type: 'artist', name: 'A' }, { type: 'podcast', name: 'P' }, { type: 'artist', name: 'B' }];
  const out = await attachSongs(picks, { fetchImpl: router(routes), max: 1, useCache: false });
  assert.equal(out[0].songs.length > 0, true);
  assert.equal(out[1].songs, undefined);
  assert.deepEqual(out[2].songs, []);
});

test('handlePraise returns real songs for Qloo-picked artists', async () => {
  const r = await handlePraise({ artists: [{ name: 'Adele' }], mode: 'release', ai: false }, { apiKey: 'k', anthropicKey: '', fetchImpl: router(routes) });
  assert.equal(r.source, 'qloo');
  assert.ok(r.picks[0].songs.length > 0);
  assert.match(r.picks[0].songs[0].title, /Song One/);
});

test('Qloo client retries a 429 then succeeds', async () => {
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? fail(429) : ok({ results: [{ entity_id: 'x', name: 'Adele' }] }));
  const q = createQlooClient({ apiKey: 'k', fetchImpl, retries: 2, gated: false });
  const hits = await q.searchEntities('Adele');
  assert.equal(hits[0].name, 'Adele');
  assert.equal(n, 2);
});

test('Qloo client does not retry a 401 and keeps the real status', async () => {
  let n = 0;
  const q = createQlooClient({ apiKey: 'k', fetchImpl: async () => { n++; return fail(401); }, retries: 2, gated: false });
  await assert.rejects(q.searchEntities('x'), (e) => e.status === 401 && /refused the API key/.test(e.message));
  assert.equal(n, 1);
});

test('diagnose reports each live step and never prints the key', async () => {
  const report = await diagnose({ env: { QLOO_API_KEY: 'super-secret-key-123' }, fetchImpl: router(routes) });
  const text = JSON.stringify(report);
  assert.ok(!text.includes('super-secret-key-123'));
  assert.ok(report.steps.some((s) => /search/.test(s.name) && s.ok));
  assert.ok(report.steps.some((s) => /Songs/.test(s.name) && s.ok));
});

test('diagnose says plainly when the key is missing', async () => {
  const report = await diagnose({ env: {}, fetchImpl: router(routes) });
  assert.equal(report.steps[0].ok, false);
  assert.match(report.steps[0].detail, /QLOO_API_KEY/);
});
