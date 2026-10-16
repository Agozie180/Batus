// Real songs from the public Apple iTunes Search API (no key, no account).
// Qloo returns taste (artists, shows, podcasts), not tracks; this is where the
// actual songs and 30-second previews come from.
//
// IMPORTANT (this was the root of "the songs are always the same"): an artist's
// first search results are always their biggest hits, whatever the person feels.
// So we load the artist's DEEP catalogue (up to 200 tracks) and let the selector in
// songpick.js choose from all of it, by mood.
//
// Grounding: songs are looked up by the artist name and kept only if the
// catalogue entry's artist matches. The AI never supplies a song title.

const ENDPOINT = process.env.ITUNES_API_URL || 'https://itunes.apple.com/search';
const TTL = 6 * 3600_000;
const cache = new Map();

export const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function httpsOnly(url) {
  if (typeof url !== 'string' || url.length > 600) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Remix/live/karaoke versions are rarely what someone in a hard moment wants.
const NOISE = /\b(karaoke|instrumental|tribute|made famous|originally performed|remix|live at|live from|live in|demo|acoustic version|radio edit|sped up|slowed|reverb|cover)\b/i;

// "Hello (Remastered 2015)" and "Hello" are the same song.
export const baseTitle = (t) => norm(String(t).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s[-–]\s.*$/, ' '));

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
    genre: r.primaryGenreName ? String(r.primaryGenreName).slice(0, 40) : '',
    year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) || null : null,
    rank: 0, // position in the artist's catalogue results (0 = most prominent)
    art: httpsOnly(r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : null),
    preview: httpsOnly(r.previewUrl),
    url: httpsOnly(r.trackViewUrl),
  };
}

// The artist's deep catalogue, de-duplicated by song. Failure returns [].
export async function catalogue(artistName, { fetchImpl, limit = 200, timeoutMs = 8000, useCache } = {}) {
  const injected = Boolean(fetchImpl);
  useCache = useCache ?? !injected; // an injected fetch means a test: never share a cache
  fetchImpl = fetchImpl || globalThis.fetch;
  const key = norm(artistName);
  const hit = useCache ? cache.get(key) : null;
  if (hit && Date.now() - hit.at < TTL) return hit.songs;

  const url = new URL(ENDPOINT);
  url.searchParams.set('term', artistName);
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('attribute', 'artistTerm');
  url.searchParams.set('limit', String(limit));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // On Vercel, `next.revalidate` uses the shared data cache, so iTunes' per-IP rate limit
    // is not spent again for an artist someone else already loaded in the last 6 hours.
    const init = { signal: ctrl.signal, headers: { Accept: 'application/json' } };
    if (!injected) init.next = { revalidate: 21600 };
    const res = await fetchImpl(url, init);
    if (!res.ok) return [];
    const data = typeof res.json === 'function' ? await res.json() : JSON.parse(await res.text());
    const seen = new Set();
    const songs = [];
    for (const r of data?.results || []) {
      const s = toSong(r, artistName);
      if (!s) continue;
      const t = baseTitle(s.title);
      if (!t || seen.has(t)) continue;
      seen.add(t);
      s.rank = songs.length;
      songs.push(s);
    }
    if (useCache && songs.length) {
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

// An artist's most prominent songs (kept for callers that just want a few).
export async function topSongs(artistName, opts = {}) {
  const { limit = 4 } = opts;
  return (await catalogue(artistName, opts)).slice(0, limit);
}
