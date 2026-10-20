// Live self-test of every outside call Batus depends on, with the real HTTP
// status and message. Open /api/diagnose after deploying to see exactly what works.
// The API key is never included in the output.

import { createQlooClient, QlooError, isMusicTag } from './qloo.js';
import { topSongs } from './songs.js';

async function step(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t, detail };
  } catch (err) {
    return { name, ok: false, ms: Date.now() - t, status: err instanceof QlooError ? err.status : undefined, detail: err.message || 'failed' };
  }
}

export async function diagnose({ env = process.env, fetchImpl } = {}) {
  const steps = [];
  const key = env.QLOO_API_KEY;
  steps.push({ name: 'QLOO_API_KEY is set', ok: Boolean(key), detail: key ? 'yes' : 'No. Add QLOO_API_KEY in your environment variables and redeploy.' });
  steps.push({ name: 'ANTHROPIC_API_KEY is set (optional)', ok: Boolean(env.ANTHROPIC_API_KEY), detail: env.ANTHROPIC_API_KEY ? 'yes' : 'no: the Claude agent is off, the app still works' });

  if (key) {
    const qloo = createQlooClient({ apiKey: key, fetchImpl, retries: 1, gated: true, useCache: false });
    let artist;
    steps.push(await step('Qloo /search (artist "Adele")', async () => {
      const hits = await qloo.searchEntities('Adele', 'artist', 3);
      if (!hits.length) throw new Error('Search worked but returned no artists.');
      artist = hits[0];
      return `${hits.length} result(s); first: ${artist.name}`;
    }));
    steps.push(await step('Qloo /v2/tags (keyword "sad")', async () => {
      const tags = await qloo.resolveTags('sad', 6);
      if (!tags.length) throw new Error('No tag found for "sad".');
      return tags.map((t) => `${t.name}${isMusicTag(t) ? ' [music]' : ''}`).join(', ');
    }));
    if (artist) {
      steps.push(await step('Qloo /v2/insights (artists like Adele)', async () => {
        const list = await qloo.insights({ type: 'artist', entityIds: [artist.id], take: 5 });
        if (!list.length) throw new Error('Insights worked but returned no artists.');
        return `${list.length} result(s): ${list.map((e) => e.name).join(', ')}`;
      }));
      steps.push(await step('Qloo /v2/insights (podcasts)', async () => {
        const list = await qloo.insights({ type: 'podcast', entityIds: [artist.id], take: 3 });
        return `${list.length} result(s)`;
      }));
    }
  }

  if (env.ANTHROPIC_API_KEY) {
    steps.push(await step('Claude (model + tool use)', async () => {
      const model = env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
      const doFetch = fetchImpl || globalThis.fetch;
      const res = await doFetch(env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: 40,
          tools: [{ name: 'ping', description: 'Reply that you are working.', input_schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } }],
          tool_choice: { type: 'tool', name: 'ping' },
          messages: [{ role: 'user', content: 'Call ping with ok=true.' }],
        }),
      });
      if (!res.ok) {
        let why = '';
        try { why = String((await res.json())?.error?.message || '').slice(0, 160); } catch { /* not json */ }
        throw new Error(`HTTP ${res.status}${res.status === 401 ? ' (key refused)' : res.status === 404 ? ` (model "${model}" not found on this account)` : ''}${why ? `: ${why}` : ''}`);
      }
      const data = await res.json();
      if (!(data.content || []).some((b) => b.type === 'tool_use')) throw new Error('Claude answered but did not use the tool.');
      return `model ${model} answered and used a tool`;
    }));
  }

  steps.push(await step('Songs lookup (iTunes Search, "Adele")', async () => {
    const songs = await topSongs('Adele', { fetchImpl, useCache: false, limit: 3 });
    if (!songs.length) throw new Error('No songs came back (the public iTunes Search API may be unreachable from this host).');
    return `${songs.length} song(s); first: ${songs[0].title}${songs[0].preview ? ' (with preview)' : ''}`;
  }));

  return { ok: steps.filter((s) => !s.optional).every((s) => s.ok || s.name.includes('optional')), steps };
}
