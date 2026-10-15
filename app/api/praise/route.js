import { handlePraise } from '../../../lib/praise.js';
import { limited, clientIp } from '../../../lib/ratelimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BODY = 10_000;

export async function POST(request) {
  if (limited(clientIp(request))) {
    return Response.json({ error: 'Too many requests. Take a breath and try again in a minute.' }, { status: 429 });
  }
  let raw;
  try {
    raw = await request.text();
    if (raw.length > MAX_BODY) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(raw || '{}');
    // The agent costs real money per call: cap it per visitor and globally, and quietly
    // fall back to the standard Qloo pipeline instead of refusing the person.
    const agentAllowed = !limited(`${clientIp(request)}|agent`, Number(process.env.AGENT_PER_MIN || 6)) && !limited('global|agent', Number(process.env.AGENT_GLOBAL_PER_MIN || 60));
    if (!agentAllowed) body.ai = false;
    return Response.json(await handlePraise(body), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    // Never log request bodies: check-in text is private.
    const bad = err instanceof SyntaxError;
    return Response.json({ error: bad ? 'Invalid JSON.' : 'Something went wrong. Please try again.' }, { status: bad ? 400 : 500 });
  }
}
