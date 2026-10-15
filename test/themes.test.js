import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePair, moodTags, themeOf } from '../lib/themes.js';
import { recommend } from '../lib/recommend.js';
import { composeMessage } from '../lib/companion.js';
import { detectCrisis } from '../lib/crisis.js';
import { handlePraise } from '../lib/praise.js';
import { artistLinks } from '../lib/links.js';
import { router, qlooRoutes } from './helpers.js';

test('resolvePair never trusts the client: bad theme/mode combos are repaired', () => {
  assert.deepEqual(resolvePair('heartbreak', 'release'), { theme: 'heartbreak', mode: 'release' });
  assert.deepEqual(resolvePair('heartbreak', 'calm'), { theme: 'heartbreak', mode: 'release' });
  assert.deepEqual(resolvePair('worry', 'heal'), { theme: 'worry', mode: 'calm' });
  assert.deepEqual(resolvePair(undefined, 'heal'), { theme: 'heartbreak', mode: 'heal' });
  assert.deepEqual(resolvePair('nonsense', 'nonsense'), { theme: 'worry', mode: 'calm' });
});

test('heartbreak modes use heartbreak tags, not gospel', async () => {
  assert.equal(themeOf('release'), 'heartbreak');
  assert.ok(!moodTags('release').includes('gospel'));
  const log = [];
  await recommend({ artists: [{ name: 'Tems' }], mode: 'release', apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.match(q.params['signal.interests.tags'], /genre:music:sad/);
  assert.doesNotMatch(q.params['signal.interests.tags'], /genre:music:upbeat/);
});

test('"Move on" asks Qloo for uplifting tags', async () => {
  const log = [];
  await recommend({ artists: [{ name: 'Tems' }], mode: 'heal', apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.match(q.params['signal.interests.tags'], /genre:music:empowering/);
});

test('play links use heartbreak wording for heartbreak modes', () => {
  assert.match(artistLinks('Tems', 'release').youtube, /heartbreak%20songs/);
  assert.match(artistLinks('Tems', 'heal').youtube, /moving%20on/);
});

test('sample mode returns heartbreak artists (not gospel-only) for heartbreak', async () => {
  const r = await recommend({ artists: [{ name: 'Tems' }], mode: 'release', apiKey: '' });
  assert.equal(r.source, 'sample');
  assert.ok(r.picks.length > 0);
  assert.ok(r.picks.every((p) => p.name !== 'Tems'));
  assert.ok(r.picks.some((p) => p.tags.includes('afrobeats') || p.tags.includes('r&b')));
});

test('heartbreak wording acknowledges a breakup and never urges contacting an ex', () => {
  const m = composeMessage({ text: 'She broke up with me last night', mode: 'release', seed: 0 });
  assert.match(m.topic, /breakup/i);
  const all = JSON.stringify([0, 1, 2].map((s) => composeMessage({ text: 'I miss her', mode: 'heal', seed: s })));
  assert.doesNotMatch(all, /call (her|him|them)|text (her|him|them) (now|back)/i);
  assert.match(composeMessage({ text: 'I still miss him so much', mode: 'release', seed: 1 }).topic, /wait until after the song/);
});

test('safety gate: heartbreak-adjacent crisis phrases are caught, ordinary heartbreak is not', () => {
  for (const t of ["I can't live without her", 'there is nothing to live for', 'my life is over', 'I just want the pain to stop']) {
    assert.equal(detectCrisis(t), true, t);
  }
  for (const t of ['She broke up with me', 'He cheated and I am hurting', 'I miss her so much', 'We split last week and I cry every night']) {
    assert.equal(detectCrisis(t), false, t);
  }
});

test('handlePraise carries the theme through and repairs a mismatched mode', async () => {
  const out = await handlePraise({ theme: 'heartbreak', mode: 'calm', text: 'we broke up', artists: ['Tems'] }, { apiKey: '', anthropicKey: '' });
  assert.equal(out.theme, 'heartbreak');
  assert.equal(out.mode, 'release');
  assert.match(out.message.opener, /hurts|strong/i);
});
