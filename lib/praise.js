// One check-in, start to finish. Used by the API route and by tests.

import { detectCrisis, CRISIS_RESPONSE } from './crisis.js';
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

  // Safety gate first: no music logic and no LLM call runs if it fires.
  const everything = [text, ...(Array.isArray(body?.songs) ? body.songs : []), ...(Array.isArray(body?.artists) ? body.artists.map((a) => (typeof a === 'string' ? a : a?.name)) : [])].filter((v) => typeof v === 'string').join(' . ');
  if (detectCrisis(everything)) return { crisis: true, ...CRISIS_RESPONSE };

  const artists = cleanArtists(body?.artists, MAX_SEEDS);
  const songs = cleanList(body?.songs, MAX_SONGS);
  const location = cleanLocation(body?.location);
  const qlooKey = deps.apiKey ?? process.env.QLOO_API_KEY;
  const anthropicKey = deps.anthropicKey ?? process.env.ANTHROPIC_API_KEY;

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

  // A set of real songs chosen for what this person is going through. Failure just means no set.
  if (result.picks?.length) {
    const allowText = body?.ai !== false && anthropicKey;
    try {
      const set = await pickSet({ picks: result.picks, text, mode, moodNames: result.moodTags || [], anthropicKey: allowText ? anthropicKey : '', fetchImpl: deps.fetchImpl, model: deps.model });
      if (set.concern) return { crisis: true, ...CRISIS_RESPONSE };
      result.set = set.songs;
      result.more = set.more;
      result.setBy = set.by;
      result.trace = [...(result.trace || []), set.note];
    } catch {
      result.set = [];
      result.setBy = 'none';
    }
  }

  const message = result.agentMessage || composeMessage({ text, mode, seed: deps.seed });
  delete result.agentMessage;
  return { crisis: false, theme, mode, message, ...result };
}
