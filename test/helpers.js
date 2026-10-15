export const ok = (body) => ({ ok: true, status: 200, json: async () => body });
export const fail = (status) => ({ ok: false, status, json: async () => ({}) });

// Route a mocked fetch by hostname + path.
export function router(routes, log = []) {
  return async (url, opts = {}) => {
    const u = new URL(url);
    log.push({ host: u.host, path: u.pathname, params: Object.fromEntries(u.searchParams), opts });
    const handler = routes[`${u.host}${u.pathname}`] || routes[u.pathname];
    return handler ? handler(u, opts) : fail(500);
  };
}

export const qlooRoutes = {
  '/search': (u) => {
    const name = u.searchParams.get('query');
    return ok({ results: [{ entity_id: `id-${name}`, name, tags: [{ name: 'gospel' }] }] });
  },
  '/v2/tags': (u) => ok({ results: { tags: [{ id: `tag-${u.searchParams.get('filter.query')}`, name: u.searchParams.get('filter.query') }] } }),
  '/v2/insights': (u) => {
    const type = u.searchParams.get('filter.type');
    if (type === 'urn:entity:podcast') return ok({ results: { entities: [{ entity_id: 'p1', name: 'Morning Grace', query: { affinity: 0.7 } }] } });
    if (type === 'urn:entity:tv_show') return ok({ results: { entities: [{ entity_id: 't1', name: 'Gentle Evenings', query: { affinity: 0.6 } }] } });
    return ok({
      results: {
        entities: [
          { entity_id: 'a1', name: 'Dunsin Oyekan', tags: [{ name: 'worship' }], query: { affinity: 0.91 }, properties: { image: { url: 'https://img/a1.jpg' } } },
          { entity_id: 'a2', name: 'Sinach', tags: [{ name: 'praise' }], query: { affinity: 0.84 } },
          { entity_id: 'a3', name: 'Minister Prudence', query: { affinity: 0.8 } }, // a seed: must be dropped
        ],
      },
    });
  },
};
