// Deterministic recommendation pipeline (also the fallback when the AI agent is
// off or fails).
//
// THESIS (enforced in code, see assertGrounded): Batus never invents music.
// Every artist, show or podcast it suggests is either something the person gave
// us or something the Qloo taste graph returned for them. The wording layer has
// no way to add one.

import { createQlooClient, isMusicTag } from './qloo.js';
import { artistLinks, songLinks, watchLinks, listenLinks } from './links.js';
import { SAMPLE_ARTISTS, SAMPLE_EXTRAS } from './sample.js';
import { moodTags, themeOf } from './themes.js';

export const MAX_SEEDS = 6;
export const MAX_SONGS = 5;
const MAX_NAME = 80;


const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export function cleanList(list, max) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const v = item.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

// Accepts ["Sinach", {name, id}] and returns [{name, id?}].
export function cleanArtists(list, max = MAX_SEEDS) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = typeof item === 'string' ? item : item?.name;
    const id = typeof item === 'object' && typeof item?.id === 'string' ? item.id.slice(0, 80) : undefined;
    if (typeof name !== 'string') continue;
    const v = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(id ? { name: v, id } : { name: v });
    if (out.length >= max) break;
  }
  return out;
}

export function assertGrounded(items, allowedNames) {
  const allowed = new Set(allowedNames.map((n) => n.toLowerCase()));
  for (const p of items) {
    if (!allowed.has(p.name.toLowerCase())) {
      throw new Error(`Ungrounded recommendation blocked: "${p.name}"`);
    }
  }
}

// The tags Qloo attached to the matches, most common first: a visible "taste
// signature" built only from Qloo data.
export function tasteSignature(items, max = 5) {
  const counts = new Map();
  for (const it of items) for (const t of it.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([t]) => t);
}

function toPick(e, mode) {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    affinity: e.affinity,
    tags: e.tags,
    image: e.image,
    links: e.type === 'artist' ? artistLinks(e.name, mode) : e.type === 'podcast' ? listenLinks(e.name) : watchLinks(e.name),
  };
}

// Podcast + TV suggestions from the same artist signals. Failures are skipped.
export async function fetchExtras(qloo, entityIds, mode, trace = []) {
  const extras = [];
  await Promise.all(
    [['podcast'], ['tv_show']].map(async ([type]) => {
      try {
        const list = await qloo.insights({ type, entityIds, tagIds: [], location: '', take: 3 });
        list.slice(0, 2).forEach((e) => extras.push(toPick(e, mode)));
        trace.push(`Qloo suggested ${Math.min(list.length, 2)} ${type.replace('_', ' ')}(s) from the same taste.`);
      } catch {
        trace.push(`Qloo ${type} suggestions unavailable; skipped.`);
      }
    }),
  );
  return extras;
}

export async function recommend({
  artists,
  songs = [],
  mode = 'calm',
  location = '',
  apiKey = process.env.QLOO_API_KEY,
  fetchImpl,
  take = 8,
}) {
  const seeds = cleanArtists(artists);
  const songTitles = cleanList(songs, MAX_SONGS);
  const trace = [];
  const favourites = songTitles.map((title) => ({ title, links: songLinks(title) }));
  const empty = { picks: [], extras: [], favourites, signature: [] };

  // ---- No key: clearly-labelled sample mode ----
  if (!apiKey) {
    trace.push('No QLOO_API_KEY set: showing clearly-labelled sample data, not live Qloo.');
    const picks = SAMPLE_ARTISTS.filter((a) => a.themes.includes(themeOf(mode)) && !seeds.some((s) => same(s.name, a.name)))
      .slice(0, take)
      .map((e) => toPick(e, mode));
    const extras = SAMPLE_EXTRAS.map((e) => toPick(e, mode));
    assertGrounded([...picks, ...extras], [...SAMPLE_ARTISTS, ...SAMPLE_EXTRAS].map((e) => e.name));
    return { source: 'sample', picks, extras, favourites, trace, signature: [] };
  }

  // ---- Live Qloo ----
  let qloo;
  try {
    qloo = createQlooClient({ apiKey, fetchImpl });
  } catch {
    return { source: 'error', ...empty, trace: ['Qloo client could not start.'], problem: { status: 0, message: 'Qloo client could not start.' } };
  }

  try {
    // 1. Resolve each artist to a Qloo entity (skip lookups we already have ids for).
    const resolved = (
      await Promise.all(
        seeds.map(async (s) => {
          if (s.id) {
            trace.push(`Used Qloo id for "${s.name}" (picked from search).`);
            return { id: s.id, name: s.name };
          }
          const hit = await qloo.searchArtist(s.name);
          trace.push(hit ? `Resolved "${s.name}" in Qloo.` : `Qloo has no match for "${s.name}".`);
          return hit;
        }),
      )
    ).filter(Boolean);
    const entityIds = resolved.map((r) => r.id);

    // 2. Mood: ask Qloo for matching music tags (first two that exist).
    const tagIds = [];
    for (const kw of moodTags(mode)) {
      if (tagIds.length >= 2) break;
      try {
        const tag = (await qloo.resolveTags(kw, 4)).find(isMusicTag);
        if (tag && !tagIds.includes(tag.id)) {
          tagIds.push(tag.id);
          trace.push(`Mood tag "${tag.name}" found in Qloo for "${kw}".`);
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) throw err;
        trace.push(`Tag "${kw}" unavailable; continued without it.`);
      }
    }
    if (tagIds.length === 0) trace.push('Qloo has no music mood tag for this mode; matching on your artists alone.');

    if (entityIds.length === 0 && tagIds.length === 0) {
      return { source: 'none', ...empty, trace: [...trace, seeds.length ? 'None of your artists were found in Qloo.' : 'Add an artist you love so Qloo has something to match.'] };
    }

    // 3. Insights, with graceful degradation: full -> no location -> no tags.
    const attempts = [
      { tagIds, location },
      { tagIds, location: '' },
      { tagIds: [], location: '' },
    ].filter((a, i, arr) => (i === 0 || a.location !== arr[i - 1].location || a.tagIds.length !== arr[i - 1].tagIds.length))
      .filter((a) => entityIds.length > 0 || a.tagIds.length > 0);
    let entities = [];
    let lastErr;
    for (const a of attempts) {
      try {
        const got = await qloo.insights({ type: 'artist', entityIds, tagIds: a.tagIds, location: a.location, take: take + seeds.length });
        lastErr = null;
        const usable = got.filter((e) => !seeds.some((s) => same(s.name, e.name)));
        if (usable.length === 0 && a !== attempts[attempts.length - 1]) {
          trace.push('Qloo returned nothing for that combination; retrying with fewer signals.');
          continue;
        }
        entities = got;
        if (a.location) trace.push(`Weighted by popularity near ${a.location}.`);
        if (a.tagIds.length) trace.push('Matched on your artists plus the mood tags above.');
        break;
      } catch (err) {
        lastErr = err;
        if (err.status === 401 || err.status === 403) throw err;
        trace.push('A Qloo query variant failed; retrying with fewer signals.');
      }
    }
    if (lastErr) throw lastErr;

    entities = entities.filter((e) => e.name && !seeds.some((s) => same(s.name, e.name)));
    trace.push(`Qloo returned ${entities.length} taste-matched artists.`);
    const picks = entities.slice(0, take).map((e) => toPick(e, mode));

    // 4. Beyond music: something to listen to and something to watch, from the same taste signals.
    const extraSeeds = entityIds.length ? entityIds : picks.slice(0, 3).map((p) => p.id);
    const extras = extraSeeds.length ? await fetchExtras(qloo, extraSeeds, mode, trace) : [];

    assertGrounded(
      [...picks, ...extras],
      [...entities.map((e) => e.name), ...extras.map((e) => e.name)],
    );
    return { source: picks.length ? 'qloo' : 'none', picks, extras, favourites, trace, signature: tasteSignature(picks) };
  } catch (err) {
    const status = err.status ?? 0;
    const message = err.message || 'Qloo request failed.';
    return { source: 'error', ...empty, trace: [...trace, `Qloo request failed (${status || 'network'}): ${message}`], problem: { status, message } };
  }
}
