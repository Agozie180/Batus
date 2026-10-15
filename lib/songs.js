// Real songs for a Qloo-chosen artist, from the public Apple iTunes Search API
// (no key, no account). Qloo returns taste (artists, shows, podcasts), not
// tracks; this is where the actual songs and 30-second previews come from.
//
// Grounding: songs are looked up by the artist name Qloo returned and kept only
// if the catalogue entry's artist matches. The AI never supplies a song title.

const ENDPOINT = process.env.ITUNES_API_URL || 'https://itunes.apple.com/search';
const TTL = 6 * 3600_000;
const cache = new Map();

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function httpsOnly(url) {
  if (typeof url !== 'string' || url.length > 600) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// A song title that is a remix/live/karaoke version is rarely what someone in a
// hard moment wants first.
const NOISE = /\b(karaoke|instrumental|tribute|made famous|originally performed|remix|live at|live from)\b/i;

export function toSong(r, artistName) {
  if (!r || r.kind !== 'song' || !r.trackId || !r.trackName) return null;
  const a = norm(r.artistName);
  const want = norm(artistName);
  if (!a || !want || !(a === want || a.includes(want) || want.includes(a))) return null;
  if (NOISE.test(r.trackName)) return null;
  return {
    id: String(r.trackId),
    title: String(r.trackName).slice(0, 120),
    artist: String(r.artistName).slice(0, 80),
    album: r.collectionName ? String(r.collectionName).slice(0, 120) : '',
    art: httpsOnly(r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : null),
    preview: httpsOnly(r.previewUrl),
    url: httpsOnly(r.trackViewUrl),
  };
}

export async function topSongs(artistName, { fetchImpl, limit = 4, timeoutMs = 6000, useCache } = {}) {
  useCache = useCache ?? !fetchImpl; // an injected fetch means a test: never share a cache
  fetchImpl = fetchImpl || globalThis.fetch;
  const key = `${norm(artistName)}|${limit}`;
  const hit = useCache ? cache.get(key) : null;
  if (hit && Date.now() - hit.at < TTL) return hit.songs;

  const url = new URL(ENDPOINT);
  url.searchParams.set('term', artistName);
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('attribute', 'artistTerm');
  url.searchParams.set('limit', '50');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = typeof res.json === 'function' ? await res.json() : JSON.parse(await res.text());
    const seen = new Set();
    const songs = [];
    for (const r of data?.results || []) {
      const s = toSong(r, artistName);
      if (!s) continue;
      const t = norm(s.title);
      if (seen.has(t)) continue;
      seen.add(t);
      songs.push(s);
      if (songs.length >= limit) break;
    }
    if (useCache) {
      cache.set(key, { at: Date.now(), songs });
      if (cache.size > 300) cache.delete(cache.keys().next().value);
    }
    return songs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Attach songs to the first `max` artist picks. Failures leave `songs: []`.
export async function attachSongs(picks, { fetchImpl, max = 6, perArtist = 4, useCache } = {}) {
  const out = picks.map((p) => ({ ...p }));
  let n = 0;
  const jobs = [];
  for (const p of out) {
    if (p.type !== 'artist') continue;
    if (n >= max) { p.songs = []; continue; }
    n += 1;
    jobs.push(() => topSongs(p.name, { fetchImpl, limit: perArtist, useCache }).then((s) => { p.songs = s; }));
  }
  // Small batches keep us polite to the public endpoint.
  for (let i = 0; i < jobs.length; i += 3) await Promise.all(jobs.slice(i, i + 3).map((j) => j()));
  return out;
}
