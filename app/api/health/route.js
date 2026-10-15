import { agentAvailable } from '../../../lib/praise.js';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, qloo: Boolean(process.env.QLOO_API_KEY), agent: agentAvailable() });
}
