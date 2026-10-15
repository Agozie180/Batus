import test from 'node:test';
import assert from 'node:assert/strict';
import { topSongs, attachSongs } from '../lib/songs.js';
import { pickSet } from '../lib/songpick.js';
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

test('handlePraise returns a mood-matched set of real songs when Claude is off', async () => {
  const r = await handlePraise({ artists: [{ name: 'Adele' }], mode: 'release', ai: false }, { apiKey: 'k', anthropicKey: '', fetchImpl: router(routes) });
  assert.equal(r.source, 'qloo');
  assert.equal(r.setBy, 'mood-match');
  assert.ok(r.set.length > 0);
  assert.ok(r.set.every((s) => s.id && s.title && s.why));
});

function claudeRoute(ids) {
  return { 'api.anthropic.com/v1/messages': () => ok({ content: [{ type: 'tool_use', name: 'choose_songs', input: { songs: ids.map((id) => ({ id, why: 'Fits your situation' })) } }] }) };
}
const pickRoutes = (songs) => ({
  ...routes,
  'itunes.apple.com/search': (u) => ok({ results: songs.map((t, i) => ({ kind: 'song', trackId: 900 + i, trackName: t, artistName: u.searchParams.get('term'), previewUrl: 'https://a/p.m4a' })) }),
});

test('Claude chooses by id: the situation-fitting song wins, invented ids are dropped', async () => {
  const fetchImpl = router({ ...pickRoutes(['Tears Tonight', 'Dance Floor', 'Goodbye Again', 'Quiet Rain']), ...claudeRoute(['901', '999999', '902', '903']) });
  const out = await pickSet({ picks: [{ type: 'artist', name: 'Adele' }], text: 'she left me', mode: 'release', anthropicKey: 'k', fetchImpl, useCache: false });
  assert.equal(out.by, 'claude');
  assert.deepEqual(out.songs.map((s) => s.id), ['901', '902', '903']); // 999999 was never a candidate
  assert.equal(out.songs[0].why, 'Fits your situation');
});

test('without Claude, mood words in titles pick the songs (heartbreak vs dance differ)', async () => {
  const fetchImpl = router(pickRoutes(['Dance Floor Joy', 'Tears and Goodbye', 'Plain Title', 'Lonely Rain']));
  const sad = await pickSet({ picks: [{ type: 'artist', name: 'Adele' }], mode: 'release', fetchImpl, useCache: false });
  const fun = await pickSet({ picks: [{ type: 'artist', name: 'Adele' }], mode: 'dance', fetchImpl, useCache: false });
  assert.match(sad.songs[0].title, /Tears|Lonely/);
  assert.match(fun.songs[0].title, /Dance/);
  assert.equal(sad.by, 'mood-match');
});

test('Claude failure falls back to mood matching, never to nothing', async () => {
  const fetchImpl = router({ ...pickRoutes(['Tears Tonight', 'Goodbye']), 'api.anthropic.com/v1/messages': () => fail(500) });
  const out = await pickSet({ picks: [{ type: 'artist', name: 'Adele' }], mode: 'release', anthropicKey: 'k', fetchImpl, useCache: false });
  assert.equal(out.by, 'mood-match');
  assert.ok(out.songs.length > 0);
  assert.match(out.note, /unavailable/);
});

test('the check-in text is not sent to Claude when the person turns AI off', async () => {
  const seen = [];
  const fetchImpl = router({ ...routes, 'api.anthropic.com/v1/messages': (u, o) => { seen.push(o.body); return fail(500); } });
  await handlePraise({ artists: [{ name: 'Adele' }], mode: 'release', ai: false, text: 'private words' }, { apiKey: 'k', anthropicKey: 'ak', fetchImpl });
  assert.equal(seen.length, 0);
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

test('no-AI reasons come from Qloo (mood tag + taste match), never from a word in the title', async () => {
  const r = await handlePraise({ artists: [{ name: 'Adele' }], mode: 'release', ai: false }, { apiKey: 'k', anthropicKey: '', fetchImpl: router({ ...routes, 'itunes.apple.com/search': (u) => ok({ results: [{ kind: 'song', trackId: 5, trackName: 'Pour Me Water', artistName: u.searchParams.get('term'), previewUrl: 'https://a/p.m4a' }] }) }) });
  assert.ok(r.set.length > 0);
  assert.match(r.set[0].why, /Qloo mood: sad/);
  assert.doesNotMatch(r.set[0].why, /water/i);
});

test('an artist Qloo does not know is reported back by name', async () => {
  const routes2 = { ...routes, '/search': (u) => (u.searchParams.get('query') === 'zzqxv' ? fail(404) : qlooRoutes['/search'](u)) };
  const r = await handlePraise({ artists: [{ name: 'zzqxv' }, { name: 'Adele' }], mode: 'release', ai: false }, { apiKey: 'k', anthropicKey: '', fetchImpl: router(routes2) });
  assert.deepEqual(r.unmatched, ['zzqxv']);
});

test('extra songs are offered beyond the set', async () => {
  const many = Array.from({ length: 20 }, (_, i) => `Song ${i}`);
  const r = await pickSet({ picks: [{ type: 'artist', name: 'Adele' }], mode: 'release', fetchImpl: router({ 'itunes.apple.com/search': (u) => ok({ results: many.map((t, i) => ({ kind: 'song', trackId: 700 + i, trackName: t, artistName: u.searchParams.get('term') })) }) }), useCache: false });
  assert.ok(r.more.length > 0);
  assert.ok(r.more.every((m) => !r.songs.some((s) => s.id === m.id)));
});
