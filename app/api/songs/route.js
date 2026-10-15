import { handleSongs } from '../../../lib/praise.js';
import { limited, clientIp } from '../../../lib/ratelimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request) {
  if (limited(`${clientIp(request)}|songs`, 30)) {
    return Response.json({ error: 'Too many requests. Take a breath and try again in a minute.' }, { status: 429 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(raw || '{}');
    // Claude song choice costs money: same per-visitor and global caps as the agent.
    const allowed = !limited(`${clientIp(request)}|agent`, Number(process.env.AGENT_PER_MIN || 6)) && !limited('global|agent', Number(process.env.AGENT_GLOBAL_PER_MIN || 60));
    if (!allowed) body.ai = false;
    const out = await handleSongs(body);
    if (out.error) return Response.json({ error: out.error }, { status: out.status || 400 });
    return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const bad = err instanceof SyntaxError;
    return Response.json({ error: bad ? 'Invalid JSON.' : 'Something went wrong. Please try again.' }, { status: bad ? 400 : 500 });
  }
}
