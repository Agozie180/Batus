// Qloo client for the hackathon API.
//   GET /search       resolve a name to a Qloo entity (also powers typeahead)
//   GET /v2/tags      resolve a keyword to a taste tag
//   GET /v2/insights  taste-graph recommendations from seed signals
// Auth is the X-Api-Key header. The key is never logged or put in a URL.
//
// Response parsing is deliberately defensive: Qloo's response shapes have
// shifted between versions, so each reader accepts the known variants.

const DEFAULT_BASE = 'https://hackathon.api.qloo.com';

export const TYPES = {
  artist: 'urn:entity:artist',
  podcast: 'urn:entity:podcast',
  tv_show: 'urn:entity:tv_show',
  movie: 'urn:entity:movie',
};

export class QlooError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'QlooError';
    this.status = status;
  }
}

export function createQlooClient({
  apiKey,
  baseUrl = process.env.QLOO_API_URL || DEFAULT_BASE,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  if (!apiKey) throw new QlooError('QLOO_API_KEY is not set');

  async function get(path, params) {
    const url = new URL(path, baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      if (res.status === 404) return null; // Qloo uses 404 for "no results"
      if (!res.ok) throw new QlooError(`Qloo ${path} failed`, res.status);
      return await res.json();
    } catch (err) {
      if (err instanceof QlooError) throw err;
      throw new QlooError(`Qloo ${path} unreachable: ${err.name}`, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  const tagCache = new Map();

  return {
    async searchEntities(query, type = 'artist', take = 5) {
      const data = await get('/search', { query, types: TYPES[type] || type, take });
      return readList(data).map((e) => toEntity(e, type));
    },

    async searchArtist(name) {
      const [hit] = await this.searchEntities(name, 'artist', 1);
      return hit || null;
    },

    async resolveTag(keyword) {
      if (tagCache.has(keyword)) return tagCache.get(keyword);
      const data = await get('/v2/tags', { 'filter.query': keyword, take: 1 });
      const list = data?.results?.tags || data?.results || [];
      const tag = Array.isArray(list) ? list[0] : null;
      const id = tag?.id || tag?.tag_id;
      const out = id ? { id, name: tag.name || keyword } : null;
      tagCache.set(keyword, out);
      return out;
    },

    // Taste-graph recommendations of one entity type from seed signals.
    async insights({ type = 'artist', entityIds, tagIds = [], location, take = 12 }) {
      const data = await get('/v2/insights', {
        'filter.type': TYPES[type] || type,
        'signal.interests.entities': entityIds.join(','),
        'signal.interests.tags': tagIds.join(','),
        'signal.location.query': location,
        take,
      });
      return readList(data).map((e) => toEntity(e, type));
    },
  };
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
  const tags = Array.isArray(e.tags) ? e.tags.map((t) => t.name || t).filter(Boolean) : [];
  return {
    id: e.entity_id || e.id,
    name: e.name,
    type,
    affinity: typeof affinity === 'number' ? affinity : null,
    tags: tags.slice(0, 4),
    image: e.properties?.image?.url || null,
  };
}
