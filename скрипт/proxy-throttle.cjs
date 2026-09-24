'use strict';

// proxy-throttle.js - local HTTP proxy that paces requests to an upstream
// LLM endpoint, enforcing a hard rolling requests-per-minute cap. Used by
// run-improve.ps1 so free-tier API limits (e.g. NVIDIA 40 rpm) are never hit.
//
// Usage: node proxy-throttle.js [--port 4040] [--rpm 35] [--upstream https://integrate.api.nvidia.com/v1]
//
// All upstream requests are serialized and spaced at least 60000/rpm ms apart.
// SSE/streaming responses are piped through unmodified. GET /health answers
// immediately (not paced) so supervisors can probe readiness.

const http = require('http');
const https = require('https');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : def;
}

const PORT = parseInt(arg('port', '4040'), 10);
const RPM = Math.max(1, parseInt(arg('rpm', '35'), 10));
const UPSTREAM = arg('upstream', 'https://integrate.api.nvidia.com/v1');
const upstream = new URL(UPSTREAM);
const UPSTREAM_ORIGIN = upstream.origin;
const MIN_INTERVAL = Math.floor(60000 / RPM);

let lastSentAt = 0;
let queue = Promise.resolve();

function pace() {
  const wait = queue.then(() => {
    const delay = Math.max(0, lastSentAt + MIN_INTERVAL - Date.now());
    return new Promise((resolve) => setTimeout(resolve, delay));
  });
  queue = wait.then(() => {
    lastSentAt = Date.now();
  });
  return wait;
}

function passthroughHeaders(headers) {
  const out = Object.assign({}, headers);
  delete out.host;
  delete out.connection;
  delete out['content-length'];
  return out;
}

function handle(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const payload = Buffer.concat(chunks);
    pace().then(() => {
      const headers = passthroughHeaders(req.headers);
      if (payload.length > 0) headers['content-length'] = String(payload.length);

      const targetPath = req.url || '/';

      const upstreamReq = https.request(
        {
          protocol: 'https:',
          hostname: new URL(UPSTREAM_ORIGIN).hostname,
          port: 443,
          method: req.method,
          path: targetPath,
          headers,
        },
        (upstreamRes) => {
          res.writeHead(upstreamRes.statusCode, upstreamRes.statusMessage, passthroughHeaders(upstreamRes.headers));
          upstreamRes.pipe(res);
          console.log(`[proxy] ${req.method} ${req.url} -> ${upstreamRes.statusCode}`);
        }
      );

      upstreamReq.on('error', (err) => {
        console.error(`[proxy] upstream error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        }
        res.end(`[proxy] upstream error: ${err.message}`);
      });

      if (payload.length > 0) upstreamReq.write(payload);
      upstreamReq.end();
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rpm: RPM, minIntervalMs: MIN_INTERVAL, upstream: UPSTREAM }));
    return;
  }
  handle(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] listening on 127.0.0.1:${PORT} rpm=${RPM} interval=${MIN_INTERVAL}ms upstream=${UPSTREAM}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);