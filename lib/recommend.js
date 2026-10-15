// Deterministic recommendation pipeline (also the fallback when the AI agent is
// off or fails).
//
// THESIS (enforced in code, see assertGrounded): Batus never invents music.
// Every artist, show or podcast it suggests is either something the person gave
// us or something the Qloo taste graph returned for them. The wording layer has
// no way to add one.

import { createQlooClient } from './qloo.js';
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
  const empty = { picks: [], extras: [], favourites };

  if (seeds.length === 0) {
    return { source: 'none', ...empty, trace: ['No artists given; showing your own songs only.'] };
  }

  // ---- No key: clearly-labelled sample mode ----
  if (!apiKey) {
    trace.push('No QLOO_API_KEY set: showing clearly-labelled sample data, not live Qloo.');
    const picks = SAMPLE_ARTISTS.filter((a) => a.themes.includes(themeOf(mode)) && !seeds.some((s) => same(s.name, a.name)))
      .slice(0, take)
      .map((e) => toPick(e, mode));
    const extras = SAMPLE_EXTRAS.map((e) => toPick(e, mode));
    assertGrounded([...picks, ...extras], [...SAMPLE_ARTISTS, ...SAMPLE_EXTRAS].map((e) => e.name));
    return { source: 'sample', picks, extras, favourites, trace };
  }

  // ---- Live Qloo ----
  let qloo;
  try {
    qloo = createQlooClient({ apiKey, fetchImpl });
  } catch {
    return { source: 'error', ...empty, trace: ['Qloo client could not start.'] };
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

    if (resolved.length === 0) {
      return { source: 'none', ...empty, trace: [...trace, 'None of your artists were found in Qloo.'] };
    }
    const entityIds = resolved.map((r) => r.id);

    // 2. Taste tags: gospel for the genre, plus a mood tag (worship vs praise).
    const tagIds = [];
    for (const kw of moodTags(mode)) {
      try {
        const tag = await qloo.resolveTag(kw);
        if (tag) {
          tagIds.push(tag.id);
          trace.push(`Taste tag "${tag.name}" added.`);
        }
      } catch {
        trace.push(`Tag "${kw}" unavailable; continued without it.`);
      }
    }

    // 3. Insights, with graceful degradation: full -> no location -> no tags.
    const attempts = [
      { tagIds, location },
      { tagIds, location: '' },
      { tagIds: [], location: '' },
    ].filter((a, i, arr) => (i === 0 || a.location !== arr[i - 1].location || a.tagIds.length !== arr[i - 1].tagIds.length));
    let entities = [];
    let lastErr;
    for (const a of attempts) {
      try {
        entities = await qloo.insights({ type: 'artist', entityIds, tagIds: a.tagIds, location: a.location, take: take + seeds.length });
        if (a.location) trace.push(`Weighted by popularity near ${a.location}.`);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        trace.push('A Qloo query variant failed; retrying with fewer signals.');
      }
    }
    if (lastErr) throw lastErr;

    entities = entities.filter((e) => e.name && !seeds.some((s) => same(s.name, e.name)));
    trace.push(`Qloo returned ${entities.length} taste-matched artists.`);
    const picks = entities.slice(0, take).map((e) => toPick(e, mode));

    // 4. Beyond music: something to listen to and something to watch, from the same taste signals.
    const extras = await fetchExtras(qloo, entityIds, mode, trace);

    assertGrounded(
      [...picks, ...extras],
      [...entities.map((e) => e.name), ...extras.map((e) => e.name)],
    );
    return { source: 'qloo', picks, extras, favourites, trace };
  } catch (err) {
    return { source: 'error', ...empty, trace: [...trace, `Qloo request failed (${err.status ?? 'network'}).`] };
  }
}
