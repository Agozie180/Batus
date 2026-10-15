// Qloo client for the hackathon API (https://hackathon.api.qloo.com, header X-Api-Key).
//   GET /search       resolve a name to a Qloo entity (also powers typeahead)
//   GET /v2/tags      resolve a keyword to a taste tag
//   GET /v2/insights  taste-graph recommendations from entity and tag signals
//
// Built from how working Qloo clients behave in practice:
//  - the hackathon key allows about 5 requests per second, so every call goes
//    through a small gate (max 3 in flight, calls spaced >= 230 ms) and a 429 or
//    5xx is retried with backoff;
//  - Qloo answers 404 for "nothing found" and 400 for an unusable query;
//  - responses are cached for a few hours (taste data moves slowly) so repeat
//    check-ins do not spend the monthly quota (10,000 calls);
//  - the real HTTP status and message are kept on QlooError so the UI and
//    /api/diagnose can show the true reason instead of "unavailable".
// The key is never logged or placed in a URL.

const DEFAULT_BASE = 'https://hackathon.api.qloo.com';

export const TYPES = {
  artist: 'urn:entity:artist',
  album: 'urn:entity:album',
  podcast: 'urn:entity:podcast',
  tv_show: 'urn:entity:tv_show',
  movie: 'urn:entity:movie',
};

export class QlooError extends Error {
  constructor(message, status = 0, detail = '') {
    super(message);
    this.name = 'QlooError';
    this.status = status;
    this.detail = detail;
  }
}

export function explainStatus(status, detail = '') {
  if (status === 401 || status === 403) return 'Qloo refused the API key. Check QLOO_API_KEY (and redeploy after changing it).';
  if (status === 429) return "Qloo's rate limit was reached. Wait a few seconds and try again.";
  if (status === 400) return `Qloo could not use that request${detail ? `: ${detail}` : ''}.`;
  if (status === 404) return 'Qloo found nothing for that.';
  if (status === 0) return `Could not reach Qloo${detail ? ` (${detail})` : ''}.`;
  return `Qloo answered ${status}${detail ? `: ${detail}` : ''}.`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One shared gate per server instance.
const MAX_IN_FLIGHT = 3;
const GAP_MS = 230;
let inFlight = 0;
let lastStart = 0;
const waiting = [];
async function gate() {
  while (inFlight >= MAX_IN_FLIGHT) await new Promise((r) => waiting.push(r));
  inFlight += 1;
  const wait = lastStart + GAP_MS - Date.now();
  lastStart = Math.max(Date.now(), lastStart + GAP_MS);
  if (wait > 0) await sleep(wait);
  return () => {
    inFlight -= 1;
    waiting.shift()?.();
  };
}

const CACHE_TTL = 6 * 3600_000;
const CACHE_MAX = 400;
const cache = new Map();

export function createQlooClient({
  apiKey,
  baseUrl = process.env.QLOO_API_URL || DEFAULT_BASE,
  fetchImpl,
  timeoutMs = 15000,
  retries,
  gated,
  useCache,
} = {}) {
  if (!apiKey) throw new QlooError('QLOO_API_KEY is not set');
  // Injected fetch means a test: no pacing, no cache, no retries unless asked.
  const injected = Boolean(fetchImpl);
  fetchImpl = fetchImpl || globalThis.fetch;
  retries = retries ?? (injected ? 0 : 2);
  gated = gated ?? !injected;
  useCache = useCache ?? !injected;
  const stats = { calls: 0, cached: 0, last: null };

  async function get(path, params) {
    const url = new URL(path, baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const key = url.toString();
    const hit = useCache ? cache.get(key) : null;
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      stats.cached += 1;
      return hit.data;
    }

    let last;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) await sleep(600 * 2 ** (attempt - 1) + Math.random() * 250);
      const release = gated ? await gate() : () => {};
      stats.calls += 1;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchImpl(url, {
          headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
          signal: ctrl.signal,
          cache: 'no-store',
        });
        stats.last = { path, status: res.status };
        if (res.status === 404) return null; // Qloo: "no results"
        if (res.ok) {
          const data = await res.json();
          if (useCache) {
            cache.set(key, { at: Date.now(), data });
            if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
          }
          return data;
        }
        let detail = '';
        try {
          const body = await res.json();
          detail = String(body?.errors?.[0]?.message || body?.message || body?.error_msg || body?.error || '').slice(0, 200);
        } catch { /* not json */ }
        last = new QlooError(explainStatus(res.status, detail), res.status, detail);
        if (res.status !== 429 && res.status < 500) throw last; // not worth retrying
      } catch (err) {
        if (err instanceof QlooError) {
          if (err.status !== 429 && err.status < 500 && err.status !== 0) throw err;
          last = err;
        } else {
          const why = err?.name === 'AbortError' ? 'timed out' : 'network error';
          last = new QlooError(explainStatus(0, why), 0, why);
        }
      } finally {
        clearTimeout(timer);
        release();
      }
    }
    throw last;
  }

  const tagCache = new Map();

  return {
    stats,

    async searchEntities(query, type = 'artist', take = 5) {
      const data = await get('/search', { query, types: TYPES[type] || type, take });
      return readList(data).map((e) => toEntity(e, type)).filter((e) => e.id && e.name);
    },

    async searchArtist(name) {
      const hits = await this.searchEntities(name, 'artist', 5);
      const exact = hits.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return exact || hits[0] || null;
    },

    // Resolve a keyword to up to `max` taste tags. Music-genre tags are preferred
    // because those are what artist queries understand.
    async resolveTags(keyword, max = 1) {
      const ck = `${keyword}|${max}`;
      if (tagCache.has(ck)) return tagCache.get(ck);
      let list = [];
      for (const extra of [{}, { 'feature.semantic_search': true }]) {
        let data;
        try {
          data = await get('/v2/tags', { 'filter.query': keyword, take: 8, ...extra });
        } catch (err) {
          if (extra['feature.semantic_search']) break;
          throw err;
        }
        const raw = data?.results?.tags || (Array.isArray(data?.results) ? data.results : []);
        list = (Array.isArray(raw) ? raw : []).map(toTag).filter(Boolean);
        if (list.length) break;
      }
      const ranked = [...list.filter(isMusicTag), ...list.filter((t) => !isMusicTag(t))];
      const out = ranked.slice(0, max);
      tagCache.set(ck, out);
      return out;
    },

    async resolveTag(keyword) {
      return (await this.resolveTags(keyword, 1))[0] || null;
    },

    // Taste-graph recommendations of one entity type from entity and/or tag signals.
    async insights({ type = 'artist', entityIds = [], tagIds = [], location, take = 12, popularityMax }) {
      const data = await get('/v2/insights', {
        'filter.type': TYPES[type] || type,
        'signal.interests.entities': entityIds.join(','),
        'signal.interests.tags': tagIds.join(','),
        'signal.location.query': location,
        'filter.popularity.max': popularityMax,
        take,
      });
      return readList(data).map((e) => toEntity(e, type)).filter((e) => e.id && e.name);
    },
  };
}

export const isMusicTag = (t) => /^urn:tag:(genre:music|music)/.test(t.id);

function toTag(t) {
  const id = t?.tag_id || t?.id;
  if (!id) return null;
  return { id, name: t.name || String(id).split(':').pop() };
}

function readList(data) {
  if (!data) return [];
  const r = data.results;
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.entities)) return r.entities;
  if (Array.isArray(data.entities)) return data.entities;
  return [];
}

function toEntity(e, type) {
  const affinity = e.query?.affinity ?? e.affinity ?? null;
  const tags = Array.isArray(e.tags) ? e.tags.map((t) => t.name || t).filter((t) => typeof t === 'string') : [];
  const img = e.properties?.image?.url ?? e.properties?.images?.[0]?.url;
  return {
    id: e.entity_id || e.id,
    name: e.name,
    type,
    affinity: typeof affinity === 'number' ? affinity : null,
    popularity: typeof e.popularity === 'number' ? e.popularity : null,
    tags: tags.slice(0, 6),
    image: safeImage(img),
  };
}

// Image URLs come from a third party and end up in the page: allow https only.
function safeImage(url) {
  if (typeof url !== 'string' || url.length > 500) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function clearQlooCache() {
  cache.clear();
}
