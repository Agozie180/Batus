import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCrisis, CRISIS_RESPONSE } from './lib/crisis.js';
import { recommend, cleanList } from './lib/recommend.js';
import { composeMessage } from './lib/companion.js';
import { MODES } from './lib/links.js';

const PUBLIC_DIR = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const MAX_BODY = 10_000;
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN || 30);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_PER_MIN;
}

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Handles one check-in. Exported so tests can call it without a socket.
export async function handlePraise(body, deps = {}) {
  const text = typeof body.text === 'string' ? body.text.slice(0, 1000) : '';
  const mode = MODES[body.mode] ? body.mode : 'calm';

  // Safety gate first: no music logic runs if it fires.
  if (detectCrisis(text)) {
    return { crisis: true, ...CRISIS_RESPONSE };
  }

  const result = await recommend({
    seeds: cleanList(body.artists, 6),
    songs: cleanList(body.songs, 5),
    mode,
    ...deps,
  });
  return {
    crisis: false,
    mode,
    message: composeMessage({ text, mode }),
    ...result,
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = normalize(join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch {
    send(res, 404, 'Not found');
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://x').pathname;

      if (req.method === 'GET' && path === '/api/health') {
        return send(res, 200, { ok: true, qloo: Boolean(process.env.QLOO_API_KEY) });
      }

      if (req.method === 'POST' && path === '/api/praise') {
        const ip = req.socket.remoteAddress || 'unknown';
        if (limited(ip)) return send(res, 429, { error: 'Too many requests. Take a breath and try again in a minute.' });
        const body = await readJson(req);
        return send(res, 200, await handlePraise(body));
      }

      if (req.method === 'GET') return serveStatic(req, res);
      send(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      // Never log request bodies: check-in text is private.
      const status = err.status || 500;
      send(res, status, { error: status === 500 ? 'Something went wrong.' : err.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    console.log(`Batus listening on :${port} (Qloo ${process.env.QLOO_API_KEY ? 'live' : 'sample mode'})`);
  });
}
