// Signs the artist list the server returned, so /api/songs only serves songs for
// artists Qloo actually returned. HMAC with a server-side secret.
import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.BATUS_SECRET || process.env.QLOO_API_KEY || process.env.ANTHROPIC_API_KEY || 'batus-dev-secret';

export function signPayload(payload) {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function verifyPayload(payload, token) {
  if (typeof payload !== 'string' || typeof token !== 'string' || payload.length > 6000) return false;
  const want = Buffer.from(signPayload(payload));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}
