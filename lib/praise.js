// One check-in, start to finish. Used by the API route and by tests.

import { detectCrisis, CRISIS_RESPONSE } from './crisis.js';
import { recommend, cleanArtists, cleanList, MAX_SEEDS, MAX_SONGS } from './recommend.js';
import { composeMessage } from './companion.js';
import { runAgent } from './agent.js';
import { MODES } from './links.js';

export function cleanLocation(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function agentAvailable(env = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY && env.QLOO_API_KEY);
}

export async function handlePraise(body, deps = {}) {
  const text = typeof body?.text === 'string' ? body.text.slice(0, 1000) : '';
  const mode = MODES[body?.mode] ? body.mode : 'calm';

  // Safety gate first: no music logic and no LLM call runs if it fires.
  if (detectCrisis(text)) return { crisis: true, ...CRISIS_RESPONSE };

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

  const message = result.agentMessage || composeMessage({ text, mode, seed: deps.seed });
  delete result.agentMessage;
  return { crisis: false, mode, message, ...result };
}
