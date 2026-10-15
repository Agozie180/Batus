import { diagnose } from '../../../lib/diagnose.js';
import { limited, clientIp } from '../../../lib/ratelimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  if (limited(`${clientIp(request)}|diag`, 3)) {
    return Response.json({ error: 'Slow down: diagnostics are limited to a few runs a minute.' }, { status: 429 });
  }
  const report = await diagnose();
  return new Response(JSON.stringify(report, null, 2), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
