import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCrisis } from '../lib/crisis.js';
import { handlePraise, cleanLocation } from '../lib/praise.js';
import { router, qlooRoutes, ok, fail } from './helpers.js';

test('detects crisis language', () => {
  for (const t of [
    'I want to kill myself', "I don't want to live anymore", 'I feel like ending my life',
    'there is no point in living', 'everyone is better off without me', 'I keep wanting to hurt myself', "I can't go on",
  ]) assert.equal(detectCrisis(t), true, t);
});

test('does not fire on ordinary worry', () => {
  for (const t of [
    "The hackathon results came out and I didn't win", "I'm worried about money and food",
    'I killed it at the demo today', "I can't sleep and my mind won't stop", '',
  ]) assert.equal(detectCrisis(t), false, t);
});

test('crisis gate stops everything: no Qloo call, no Claude call', async () => {
  let called = 0;
  const out = await handlePraise(
    { text: 'I want to end my life', artists: ['Sinach'] },
    { apiKey: 'k', anthropicKey: 'a', fetchImpl: () => { called += 1; throw new Error('must not be called'); } },
  );
  assert.equal(out.crisis, true);
  assert.equal(called, 0);
  assert.equal(out.picks, undefined);
});

test('no keys: sample mode, template message, topic acknowledged', async () => {
  const out = await handlePraise({ text: 'results came out', mode: 'calm', artists: ['Sinach'], songs: ['Bata'] }, { apiKey: '', anthropicKey: '' });
  assert.equal(out.crisis, false);
  assert.equal(out.source, 'sample');
  assert.equal(out.agent, false);
  assert.ok(out.message.opener && out.message.topic);
  assert.equal(out.favourites[0].title, 'Bata');
});

test('both keys: the Claude agent runs', async () => {
  const script = [
    [{ type: 'tool_use', id: '1', name: 'find_artist', input: { name: 'Sinach' } }],
    [{ type: 'tool_use', id: '2', name: 'taste_matches', input: { entity_ids: ['id-Sinach'], type: 'artist' } }],
    [{ type: 'tool_use', id: '3', name: 'finish', input: { message: 'One song. That is all.', next_step: 'Sip water.', music_ids: ['a1'] } }],
  ];
  let i = 0;
  const out = await handlePraise(
    { text: 'worried', artists: ['Sinach'] },
    { apiKey: 'q', anthropicKey: 'a', fetchImpl: router({ ...qlooRoutes, 'api.anthropic.com/v1/messages': () => ok({ content: script[i++] }) }) },
  );
  assert.equal(out.agent, true);
  assert.equal(out.message.opener, 'One song. That is all.');
  assert.equal(out.picks[0].name, 'Dunsin Oyekan');
});

test('agent failure falls back to the standard Qloo pipeline and says so', async () => {
  const out = await handlePraise(
    { text: 'worried', artists: ['Sinach'] },
    { apiKey: 'q', anthropicKey: 'a', fetchImpl: router({ ...qlooRoutes, 'api.anthropic.com/v1/messages': () => fail(500) }) },
  );
  assert.equal(out.agent, false);
  assert.equal(out.source, 'qloo');
  assert.ok(out.picks.length > 0);
  assert.match(out.trace[0], /AI agent unavailable/);
});

test('person can opt out of the AI writer (ai:false) and no Claude call is made', async () => {
  let claudeCalls = 0;
  const fetchImpl = router({ ...qlooRoutes, 'api.anthropic.com/v1/messages': () => { claudeCalls += 1; return ok({ content: [] }); } });
  const out = await handlePraise({ text: 'worried', artists: ['Sinach'], ai: false }, { apiKey: 'q', anthropicKey: 'a', fetchImpl });
  assert.equal(claudeCalls, 0);
  assert.equal(out.agent, false);
});

test('cleanLocation allows city names and strips everything else', () => {
  assert.equal(cleanLocation('Port Harcourt'), 'Port Harcourt');
  assert.equal(cleanLocation("Lagos<script>alert(1)</script>"), 'Lagosscriptalertscript');
  assert.equal(cleanLocation(42), '');
});

test('SAFETY: death wishes, slang and disguised spellings stop the music (no Qloo, no Claude)', async () => {
  const phrases = ['I wish for death', 'i wish i was dead', 'I want death', 'I wanna dieee', 'k1ll myself', 'I wish I would just not wake up', "I'm tired of living", 'I hope I die', 'kms', 'she left and I wish to die', 'I can’t go on'];
  for (const t of phrases) {
    let calls = 0;
    const out = await handlePraise({ text: t, artists: [{ name: 'Adele' }], mode: 'release' }, { apiKey: 'k', anthropicKey: 'a', fetchImpl: async () => { calls += 1; throw new Error('should not be called'); } });
    assert.equal(out.crisis, true, t);
    assert.equal(calls, 0, t);
    assert.ok(out.resources.length > 0);
  }
});

test('SAFETY: ordinary figures of speech and heartbreak do not trip the gate', () => {
  for (const t of ["I'd die for this song", "I'm dying of laughter", 'this deadline is killing me', 'I wish for a miracle', 'I wish I was home', 'She broke up with me and I cannot stop thinking about it.']) {
    assert.equal(detectCrisis(t), false, t);
  }
});

test('SAFETY: crisis words in the songs or artists fields are caught too', async () => {
  const out = await handlePraise({ text: '', songs: ['I want to kill myself'], artists: [] }, { apiKey: '', anthropicKey: '' });
  assert.equal(out.crisis, true);
});

test('SAFETY backstop: if Claude flags concern the person gets the crisis screen, not songs', async () => {
  const routes = {
    ...qlooRoutes,
    'itunes.apple.com/search': (u) => ok({ results: [{ kind: 'song', trackId: 1, trackName: 'T', artistName: u.searchParams.get('term'), previewUrl: 'https://a/p.m4a' }] }),
    'api.anthropic.com/v1/messages': () => ok({ content: [{ type: 'tool_use', name: 'choose_songs', input: { concern: true, songs: [] } }] }),
  };
  const out = await handlePraise({ text: 'nothing matters to me now, I am done with everything', artists: [], mode: 'release' }, { apiKey: 'k', anthropicKey: 'a', fetchImpl: router(routes) });
  assert.equal(out.crisis, true);
});
