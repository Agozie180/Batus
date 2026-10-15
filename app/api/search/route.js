import { createQlooClient } from '../../../lib/qloo.js';
import { searchSample } from '../../../lib/sample.js';
import { limited, clientIp } from '../../../lib/ratelimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Artist typeahead. With a Qloo key this is live Qloo search, which also shows
// the person right away whether Qloo knows the artists they love.
export async function GET(request) {
  if (limited(clientIp(request), 90)) return Response.json({ results: [], source: 'limited' }, { status: 429 });
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 60);
  if (q.length < 2) return Response.json({ results: [], source: 'none' });

  const key = process.env.QLOO_API_KEY;
  if (!key) return Response.json({ results: searchSample(q).map(slim), source: 'sample' });
  try {
    const list = await createQlooClient({ apiKey: key }).searchEntities(q, 'artist', 6);
    return Response.json({ results: list.map(slim), source: 'qloo' }, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (err) {
    return Response.json({ results: [], source: 'error', message: err.message || 'Qloo search failed.' });
  }
}

const slim = (e) => ({ id: e.id, name: e.name, tags: e.tags || [], image: e.image || null });
