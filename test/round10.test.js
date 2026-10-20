import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../lib/agent.js';
import { recommend } from '../lib/recommend.js';
import { catalogue } from '../lib/songs.js';
import { diagnose } from '../lib/diagnose.js';
import { handlePraise } from '../lib/praise.js';
import { router, qlooRoutes, itunesRoutes, ok, fail } from './helpers.js';

function claude(script, seen = []) {
  let i = 0;
  return (u, opts) => {
    seen.push(JSON.parse(opts.body));
    const reply = script[Math.min(i, script.length - 1)];
    i += 1;
    return ok({ content: reply, stop_reason: 'tool_use' });
  };
}
const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
const CLAUDE = 'api.anthropic.com/v1/messages';

const base = { text: 'I cannot stop thinking about money.', mode: 'calm', location: '', artists: [{ name: 'Minister Prudence' }], songs: [], qlooKey: 'qk', anthropicKey: 'ak' };

// ---------- agent ----------

test('agent: starts from the mood alone when the person gave no artists, and reports the Qloo mood tags', async () => {
  const log = [];
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'taste_matches', { entity_ids: [], type: 'artist' })],
      [use('c2', 'finish', { message: 'Rest your mind for one song.', next_step: 'Water.', music_ids: ['a1', 'a2'] })],
    ]),
  }, log);
  const r = await runAgent({ ...base, artists: [], fetchImpl });
  assert.equal(r.agent, true);
  assert.deepEqual(r.picks.map((p) => p.name), ['Dunsin Oyekan', 'Sinach']);
  assert.ok(r.moodTags.length >= 1, 'mood tag names are returned for the UI');
  assert.ok(r.steps.length >= 2);
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.equal(q.params['signal.interests.entities'], undefined);
  assert.match(q.params['signal.interests.tags'], /genre:music:/);
});

test('agent: mood alone is NOT a loophole when the person did give artists', async () => {
  const seen = [];
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'taste_matches', { entity_ids: [], type: 'artist' })],
      [use('c2', 'finish', { message: 'Hi', next_step: 'Rest', music_ids: ['nope'] })],
    ], seen),
  });
  await assert.rejects(() => runAgent({ ...base, fetchImpl }), /no valid music/);
  assert.match(seen[1].messages.at(-1).content[0].content, /No valid artist ids/);
});

test("agent: the person's chosen mood decides the Qloo tags; a model-supplied vibe is ignored", async () => {
  const log = [];
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'find_artist', { name: 'Minister Prudence' })],
      [use('c2', 'taste_matches', { entity_ids: ['id-Minister Prudence'], type: 'artist', vibe: 'dance' })],
      [use('c3', 'finish', { message: 'Hi', next_step: 'Rest', music_ids: ['a1'] })],
    ]),
  }, log);
  await runAgent({ ...base, mode: 'calm', fetchImpl });
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.match(q.params['signal.interests.tags'], /genre:music:acoustic/);
  assert.doesNotMatch(q.params['signal.interests.tags'], /afrobeats|dance/);
});

test('agent: the comfort kit has one Qloo-grounded pick per domain, filled in when the agent skips them', async () => {
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'find_artist', { name: 'Minister Prudence' })],
      [use('c2', 'taste_matches', { entity_ids: ['id-Minister Prudence'], type: 'artist' })],
      [use('c3', 'finish', { message: 'Hi', next_step: 'Rest', music_ids: ['a1'], read_ids: ['invented-book'] })],
    ]),
  });
  const r = await runAgent({ ...base, fetchImpl });
  assert.deepEqual(r.extras.map((e) => e.type), ['podcast', 'tv_show', 'movie', 'book']);
  assert.deepEqual(r.extras.map((e) => e.name), ['Morning Grace', 'Gentle Evenings', 'Quiet Hours', 'The Slow Morning']);
});

test('agent: finish in the same step as other tool calls still works (other calls run first)', async () => {
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'find_artist', { name: 'Minister Prudence' })],
      [use('c2', 'taste_matches', { entity_ids: ['id-Minister Prudence'], type: 'artist' }), use('c3', 'taste_matches', { entity_ids: ['id-Minister Prudence'], type: 'podcast' }), use('c4', 'finish', { message: 'Hi', next_step: 'Rest', music_ids: ['a1'], listen_ids: ['p1'] })],
    ]),
  });
  const r = await runAgent({ ...base, fetchImpl });
  assert.deepEqual(r.picks.map((p) => p.name), ['Dunsin Oyekan']);
  assert.equal(r.extras.find((e) => e.type === 'podcast').name, 'Morning Grace');
});

test('handlePraise: the agent runs with no artists at all (a judge who just taps the button)', async () => {
  const fetchImpl = router({
    ...qlooRoutes,
    [CLAUDE]: claude([
      [use('c1', 'taste_matches', { entity_ids: [], type: 'artist' })],
      [use('c2', 'finish', { message: 'You can rest here for a song.', next_step: 'Water.', music_ids: ['a1'] })],
    ]),
  });
  const r = await handlePraise({ text: '', mode: 'calm', artists: [], defer: true }, { fetchImpl, apiKey: 'qk', anthropicKey: 'ak' });
  assert.equal(r.agent, true);
  assert.equal(r.crisis, false);
  assert.ok(r.songsToken && r.songsPayload);
  assert.ok(JSON.parse(r.songsPayload).moodTags.length >= 1);
});

// ---------- Qloo: comfort kit and lesser-known filter ----------

test('recommend: the comfort kit asks Qloo for a podcast, a show, a film and a book, one each', async () => {
  const log = [];
  const r = await recommend({ artists: [{ name: 'Sinach' }], apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  assert.deepEqual(r.extras.map((e) => e.type).sort(), ['book', 'movie', 'podcast', 'tv_show']);
  for (const t of ['podcast', 'tv_show', 'movie', 'book']) {
    assert.ok(log.some((c) => c.path === '/v2/insights' && c.params['filter.type'] === `urn:entity:${t}`), `queried ${t}`);
  }
  assert.match(r.extras.find((e) => e.type === 'book').links.web, /book/);
});

test('recommend: "lesser-known" sends the Qloo popularity ceiling, and says so in the trace', async () => {
  const log = [];
  const r = await recommend({ artists: [{ name: 'Sinach' }], deeper: true, apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.equal(q.params['filter.popularity.max'], '0.6');
  assert.match(r.trace.join(' '), /lesser-known/);
  const normal = [];
  await recommend({ artists: [{ name: 'Sinach' }], apiKey: 'k', fetchImpl: router(qlooRoutes, normal) });
  assert.equal(normal.find((c) => c.path === '/v2/insights').params['filter.popularity.max'], undefined);
});

test('recommend: if Qloo rejects the popularity filter, Batus retries without it instead of failing', async () => {
  const routes = {
    ...qlooRoutes,
    '/v2/insights': (u) => {
      if (u.searchParams.get('filter.type') === 'urn:entity:artist' && u.searchParams.get('filter.popularity.max')) return fail(400);
      return qlooRoutes['/v2/insights'](u);
    },
  };
  const r = await recommend({ artists: [{ name: 'Sinach' }], deeper: true, apiKey: 'k', fetchImpl: router(routes) });
  assert.equal(r.source, 'qloo');
  assert.ok(r.picks.length > 0);
});

// ---------- songs: second source ----------

const dz = (artist, over = {}) => ({ id: 77, title: `${artist} Deezer Song`, link: 'https://www.deezer.com/track/77', preview: 'https://cdn/p.mp3', artist: { name: artist }, album: { title: 'LP', cover_medium: 'https://cdn/c.jpg' }, ...over });

test('songs: when Apple returns nothing, a second public source supplies real, artist-matched tracks', async () => {
  const fetchImpl = router({
    'itunes.apple.com/search': () => ok({ results: [] }),
    'api.deezer.com/search': () => ok({ data: [dz('Adele'), dz('Adele', { id: 78, title: 'Adele Remix', }), dz('Someone Else', { id: 79 }), dz('Adele', { id: 80, title: 'Hello', preview: 'http://insecure' })] }),
  });
  const songs = await catalogue('Adele', { fetchImpl, useCache: false });
  assert.deepEqual(songs.map((s) => s.title), ['Adele Deezer Song', 'Hello']);
  assert.equal(songs[0].id, 'dz77');
  assert.equal(songs[0].preview, 'https://cdn/p.mp3');
  assert.equal(songs[1].preview, null);
});

test('songs: Apple stays the first choice, and Deezer errors never throw', async () => {
  let deezerCalls = 0;
  const first = await catalogue('Adele', { fetchImpl: router({ 'itunes.apple.com/search': itunesRoutes['/search'], 'api.deezer.com/search': () => { deezerCalls += 1; return ok({ data: [] }); } }), useCache: false });
  assert.ok(first.length > 0);
  assert.equal(deezerCalls, 0);
  assert.deepEqual(await catalogue('Adele', { fetchImpl: router({ 'itunes.apple.com/search': () => fail(429), 'api.deezer.com/search': () => ok({ error: { type: 'Exception', code: 4 } }) }), useCache: false }), []);
  assert.deepEqual(await catalogue('Adele', { fetchImpl: async () => { throw new Error('offline'); }, useCache: false }), []);
});

// ---------- diagnose ----------

test('diagnose: never reveals anything about the Qloo key, and tests the Claude path when a key is set', async () => {
  const fetchImpl = router({
    ...qlooRoutes,
    'itunes.apple.com/search': itunesRoutes['/search'],
    [CLAUDE]: () => ok({ content: [{ type: 'tool_use', id: 'x', name: 'ping', input: { ok: true } }] }),
  });
  const rep = await diagnose({ env: { QLOO_API_KEY: 'super-secret-key-1234', ANTHROPIC_API_KEY: 'sk-ant' }, fetchImpl });
  const text = JSON.stringify(rep);
  assert.ok(!text.includes('super-secret-key-1234'));
  assert.ok(!/\d+ characters/.test(text));
  const c = rep.steps.find((s) => s.name.startsWith('Claude'));
  assert.equal(c.ok, true);
});

test('diagnose: a wrong Claude model name is reported plainly', async () => {
  const fetchImpl = router({ ...qlooRoutes, 'itunes.apple.com/search': itunesRoutes['/search'], [CLAUDE]: () => ({ ok: false, status: 404, json: async () => ({ error: { message: 'model: nope' } }) }) });
  const rep = await diagnose({ env: { QLOO_API_KEY: 'k', ANTHROPIC_API_KEY: 'sk', ANTHROPIC_MODEL: 'nope' }, fetchImpl });
  const c = rep.steps.find((s) => s.name.startsWith('Claude'));
  assert.equal(c.ok, false);
  assert.match(c.detail, /404.*"nope" not found/);
});
