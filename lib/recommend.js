// Recommendation pipeline.
//
// THESIS (enforced in code, see assertGrounded): Batus never invents music.
// Every artist it suggests is either one the person gave us or one the Qloo
// taste graph returned for them. The wording layer is template-based and has
// no way to add an artist.

import { createQlooClient } from './qloo.js';
import { artistLinks, songLinks } from './links.js';
import { SAMPLE_ARTISTS } from './sample.js';

const MAX_SEEDS = 6;
const MAX_SONGS = 5;
const MAX_NAME = 80;

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

export function assertGrounded(picks, allowedNames) {
  const allowed = new Set(allowedNames.map((n) => n.toLowerCase()));
  for (const p of picks) {
    if (!allowed.has(p.name.toLowerCase())) {
      throw new Error(`Ungrounded recommendation blocked: "${p.name}"`);
    }
  }
}

export async function recommend({
  seeds,
  songs = [],
  mode = 'calm',
  apiKey = process.env.QLOO_API_KEY,
  fetchImpl,
  take = 8,
}) {
  const seedNames = cleanList(seeds, MAX_SEEDS);
  const songTitles = cleanList(songs, MAX_SONGS);
  const trace = [];

  const favourites = songTitles.map((title) => ({ title, links: songLinks(title) }));

  if (seedNames.length === 0) {
    return { source: 'none', picks: [], favourites, trace: ['No artists given; showing your own songs only.'] };
  }

  let source = 'qloo';
  let entities = [];

  if (!apiKey) {
    source = 'sample';
    trace.push('No QLOO_API_KEY set: showing clearly-labelled sample data, not live Qloo.');
    entities = SAMPLE_ARTISTS.filter(
      (a) => !seedNames.some((s) => s.toLowerCase() === a.name.toLowerCase()),
    ).slice(0, take);
  } else {
    try {
      const qloo = createQlooClient({ apiKey, fetchImpl });

      const resolved = (
        await Promise.all(
          seedNames.map(async (name) => {
            const hit = await qloo.searchArtist(name);
            trace.push(hit ? `Resolved "${name}" in Qloo.` : `Qloo has no match for "${name}".`);
            return hit;
          }),
        )
      ).filter(Boolean);

      if (resolved.length === 0) {
        source = 'none';
        trace.push('None of your artists were found in Qloo.');
      } else {
        const entityIds = resolved.map((r) => r.id);
        let tagIds = [];
        try {
          const tag = await qloo.resolveTag('gospel');
          if (tag) {
            tagIds = [tag.id];
            trace.push(`Biased toward the "${tag.name}" taste tag.`);
          }
        } catch {
          trace.push('Tag lookup unavailable; used artist signals only.');
        }

        try {
          entities = await qloo.artistInsights({ entityIds, tagIds, take: take + seedNames.length });
        } catch (err) {
          if (tagIds.length === 0) throw err;
          trace.push('Tag-biased query failed; retried with artist signals only.');
          entities = await qloo.artistInsights({ entityIds, take: take + seedNames.length });
        }
        entities = entities.filter(
          (e) => e.name && !seedNames.some((s) => s.toLowerCase() === e.name.toLowerCase()),
        );
        trace.push(`Qloo returned ${entities.length} taste-matched artists.`);
      }
    } catch (err) {
      source = 'error';
      trace.push(`Qloo request failed (${err.status || 'network'}).`);
      entities = [];
    }
  }

  const picks = entities.slice(0, take).map((e) => ({
    name: e.name,
    affinity: e.affinity,
    tags: e.tags,
    image: e.image,
    links: artistLinks(e.name, mode),
  }));

  assertGrounded(picks, [...entities.map((e) => e.name), ...seedNames]);

  return { source, picks, favourites, trace };
}
