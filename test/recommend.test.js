import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, assertGrounded, cleanList, cleanArtists } from '../lib/recommend.js';
import { router, qlooRoutes, ok, fail } from './helpers.js';

test('live path: Qloo artists, seeds dropped, mood tag + location sent, cross-domain extras', async () => {
  const log = [];
  const r = await recommend({
    artists: [{ name: 'Minister Prudence' }],
    songs: ['Bata'],
    mode: 'dance',
    location: 'Lagos',
    apiKey: 'test',
    fetchImpl: router(qlooRoutes, log),
  });
  assert.equal(r.source, 'qloo');
  assert.deepEqual(r.picks.map((p) => p.name), ['Dunsin Oyekan', 'Sinach']);
  assert.equal(r.picks[0].affinity, 0.91);
  assert.equal(r.picks[0].image, 'https://img/a1.jpg');
  assert.match(r.picks[0].links.youtube, /praise%20dance%20songs/);
  assert.deepEqual(r.extras.map((e) => e.name).sort(), ['Gentle Evenings', 'Morning Grace']);
  assert.equal(r.favourites[0].title, 'Bata');

  const artistQuery = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.equal(artistQuery.params['signal.location.query'], 'Lagos');
  assert.match(artistQuery.params['signal.interests.tags'], /tag-gospel/);
  assert.match(artistQuery.params['signal.interests.tags'], /tag-praise/); // dance mood
});

test('calm mode biases toward the worship tag', async () => {
  const log = [];
  await recommend({ artists: [{ name: 'Sinach' }], mode: 'calm', apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  const q = log.find((c) => c.path === '/v2/insights' && c.params['filter.type'] === 'urn:entity:artist');
  assert.match(q.params['signal.interests.tags'], /tag-worship/);
});

test('ids chosen from typeahead skip the search call', async () => {
  const log = [];
  await recommend({ artists: [{ name: 'Sinach', id: 'known-id' }], apiKey: 'k', fetchImpl: router(qlooRoutes, log) });
  assert.equal(log.filter((c) => c.path === '/search').length, 0);
  const q = log.find((c) => c.path === '/v2/insights');
  assert.match(q.params['signal.interests.entities'], /known-id/);
});

test('API key goes in the header, never the URL', async () => {
  const log = [];
  await recommend({ artists: [{ name: 'Sinach' }], apiKey: 'secret-key', fetchImpl: router(qlooRoutes, log) });
  assert.ok(log.length > 0);
  for (const c of log) {
    assert.equal(c.opts.headers['X-Api-Key'], 'secret-key');
    assert.ok(!JSON.stringify(c.params).includes('secret-key'));
  }
});

test('degrades: location rejected -> retries without it, then without tags', async () => {
  let calls = 0;
  const routes = {
    ...qlooRoutes,
    '/v2/insights': (u) => {
      if (u.searchParams.get('filter.type') !== 'urn:entity:artist') return qlooRoutes['/v2/insights'](u);
      calls += 1;
      if (u.searchParams.get('signal.location.query') || u.searchParams.get('signal.interests.tags')) return fail(400);
      return qlooRoutes['/v2/insights'](u);
    },
  };
  const r = await recommend({ artists: [{ name: 'Sinach' }], location: 'Lagos', apiKey: 'k', fetchImpl: router(routes) });
  assert.equal(calls, 3);
  assert.equal(r.source, 'qloo');
  assert.ok(r.picks.length > 0);
});

test('Qloo outage returns source=error but still gives the person their own songs', async () => {
  const r = await recommend({ artists: [{ name: 'Sinach' }], songs: ['Bata'], apiKey: 'k', fetchImpl: router({}) });
  assert.equal(r.source, 'error');
  assert.equal(r.picks.length, 0);
  assert.equal(r.favourites.length, 1);
});

test('artists Qloo does not know -> source=none with a plain explanation', async () => {
  const routes = { ...qlooRoutes, '/search': () => fail(404) };
  const r = await recommend({ artists: [{ name: 'Nobody Known' }], apiKey: 'k', fetchImpl: router(routes) });
  assert.equal(r.source, 'none');
  assert.match(r.trace.join(' '), /Qloo has no match/);
});

test('no key means labelled sample data, never presented as live', async () => {
  const r = await recommend({ artists: [{ name: 'Sinach' }], apiKey: '' });
  assert.equal(r.source, 'sample');
  assert.ok(r.picks.every((p) => p.name.toLowerCase() !== 'sinach'));
  assert.match(r.trace.join(' '), /sample/);
});

test('THESIS: an item that is neither a seed nor from Qloo is blocked', () => {
  assert.throws(() => assertGrounded([{ name: 'Invented Artist' }], ['Sinach']), /Ungrounded recommendation blocked/);
  assert.doesNotThrow(() => assertGrounded([{ name: 'sinach' }], ['Sinach']));
});

test('input cleaning trims, dedupes, caps and ignores junk', () => {
  assert.deepEqual(cleanList(['  Sinach ', 'sinach', 5, '', 'A', 'B', 'C'], 3), ['Sinach', 'A', 'B']);
  assert.deepEqual(cleanList('nope', 3), []);
  assert.deepEqual(cleanArtists(['Sinach', { name: 'sinach', id: 'x' }, { name: 'Mercy', id: 'm1' }, 7, null]), [{ name: 'Sinach' }, { name: 'Mercy', id: 'm1' }]);
});
