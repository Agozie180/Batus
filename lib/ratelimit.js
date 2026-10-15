// Best-effort per-IP limiter. On serverless each instance has its own memory,
// so this is a speed bump against accidental floods, not a security boundary.
const hits = new Map();

export function limited(ip, perMinute = Number(process.env.RATE_PER_MIN || 30)) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  return recent.length > perMinute;
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
