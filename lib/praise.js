// One check-in, start to finish. Used by the API route and by tests.

import { CRISIS_RESPONSE, CONCERN_NOTE } from './crisis.js';
import { assessSafety } from './safety.js';
import { signPayload, verifyPayload } from './token.js';
import { recommend, cleanArtists, cleanList, MAX_SEEDS, MAX_SONGS } from './recommend.js';
import { composeMessage } from './companion.js';
import { runAgent } from './agent.js';
import { resolvePair } from './themes.js';
import { pickSet } from './songpick.js';

export function cleanLocation(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function agentAvailable(env = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY && env.QLOO_API_KEY);
}

export async function handlePraise(body, deps = {}) {
  const text = typeof body?.text === 'string' ? body.text.slice(0, 1000) : '';
  const { theme, mode } = resolvePair(body?.theme, body?.mode);

  // Safety first: keywords, then Claude as a screener. No music logic runs on a crisis.
  const anthropicKey = deps.anthropicKey ?? process.env.ANTHROPIC_API_KEY;
  const extra = [...(Array.isArray(body?.songs) ? body.songs : []), ...(Array.isArray(body?.artists) ? body.artists.map((a) => (typeof a === 'string' ? a : a?.name)) : [])].filter((v) => typeof v === 'string').join(' . ');
  const safety = await assessSafety({ text, extra, ai: body?.ai !== false, anthropicKey, fetchImpl: deps.fetchImpl, model: deps.model });
  if (safety.level === 'crisis') return { crisis: true, ...CRISIS_RESPONSE };

  const artists = cleanArtists(body?.artists, MAX_SEEDS);
  const songs = cleanList(body?.songs, MAX_SONGS);
  const location = cleanLocation(body?.location);
  const qlooKey = deps.apiKey ?? process.env.QLOO_API_KEY;

  const wantsAgent = body?.ai !== false && qlooKey && anthropicKey && artists.length > 0;
  let result;
  let agentError = null;

  if (wantsAgent) {
    try {
      result = await runAgent({ text, mode, location, artists, songs, qlooKey, anthropicKey, fetchImpl: deps.fetchImpl, model: deps.model });
    } catch (err) {
      agentError = err.message;
    }
  }

  if (!result) {
    result = await recommend({ artists, songs, mode, location, apiKey: qlooKey, fetchImpl: deps.fetchImpl });
    result.agent = false;
    if (agentError) result.trace.unshift(`AI agent unavailable (${agentError}); used the standard Qloo pipeline.`);
  }

  // Second line of defence: the model may flag worrying words the keyword screen missed.
  if (result.concern) return { crisis: true, ...CRISIS_RESPONSE };

  // Songs: either inline, or deferred so the artists can appear first (the app calls /api/songs next).
  if (result.picks?.length) {
    if (body?.defer === true) {
      const payload = JSON.stringify({ picks: result.picks.filter((p) => p.type === 'artist').slice(0, 5).map((p) => ({ name: p.name, type: 'artist', affinity: p.affinity ?? null, tags: (p.tags || []).slice(0, 6) })), moodTags: result.moodTags || [], own: artists.map((a) => a.name).filter(Boolean).slice(0, 3) });
      result.songsPayload = payload;
      result.songsToken = signPayload(payload);
    } else {
      const set = await buildSet({ picks: result.picks, text, mode, moodNames: result.moodTags || [], ai: body?.ai !== false, anthropicKey, deps });
      if (set.concern) return { crisis: true, ...CRISIS_RESPONSE };
      Object.assign(result, { set: set.songs, more: set.more, setBy: set.by });
      result.trace = [...(result.trace || []), set.note].filter(Boolean);
    }
  }

  const message = result.agentMessage || composeMessage({ text, mode, seed: deps.seed });
  delete result.agentMessage;
  return { crisis: false, theme, mode, message, ...result, ...(safety.level === 'concern' ? { concernNote: CONCERN_NOTE } : {}) };
}


async function buildSet({ picks, own = [], exclude = [], text, mode, moodNames, ai, anthropicKey, deps }) {
  try {
    return await pickSet({ picks, own, exclude, text, mode, moodNames, anthropicKey: ai && anthropicKey ? anthropicKey : '', fetchImpl: deps.fetchImpl, model: deps.model });
  } catch {
    return { songs: [], more: [], by: 'none', note: '' };
  }
}

// Phase two of a check-in: songs for artists Qloo already returned. The artist list
// is signed by the server in phase one, so a client cannot ask for songs by anyone
// Qloo did not return.
export async function handleSongs(body, deps = {}) {
  const payload = typeof body?.payload === 'string' ? body.payload : '';
  if (!verifyPayload(payload, body?.token)) return { error: 'Invalid request.', status: 400 };
  let data;
  try { data = JSON.parse(payload); } catch { return { error: 'Invalid request.', status: 400 }; }
  const text = typeof body?.text === 'string' ? body.text.slice(0, 1000) : '';
  const { mode } = resolvePair(body?.theme, body?.mode);
  const anthropicKey = deps.anthropicKey ?? process.env.ANTHROPIC_API_KEY;

  const safety = await assessSafety({ text, ai: false });
  if (safety.level === 'crisis') return { crisis: true, ...CRISIS_RESPONSE };

  const picks = (Array.isArray(data.picks) ? data.picks : []).filter((p) => p && typeof p.name === 'string');
  const own = (Array.isArray(data.own) ? data.own : []).filter((n) => typeof n === 'string').slice(0, 3);
  const exclude = (Array.isArray(body?.exclude) ? body.exclude : []).map(String).filter((x) => /^\d{1,15}$/.test(x)).slice(0, 80);
  const set = await buildSet({ picks, own, exclude, text, mode, moodNames: Array.isArray(data.moodTags) ? data.moodTags : [], ai: body?.ai !== false, anthropicKey, deps });
  if (set.concern) return { crisis: true, ...CRISIS_RESPONSE };
  return { crisis: false, set: set.songs, more: set.more, setBy: set.by, note: set.note };
}
