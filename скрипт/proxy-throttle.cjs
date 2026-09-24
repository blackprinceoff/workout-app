'use strict';

// proxy-throttle.cjs - local HTTP proxy that paces requests to an upstream
// LLM endpoint and enforces hard budgets:
//   1. rolling requests-per-minute cap      (--rpm)
//   2. per-day request budget               (--daily-req)
//   3. optional per-day input-token budget  (--max-input-k, 0 = off)
//
// Usage counters are persisted per calendar day in ./logs/usage-YYYY-MM-DD.json
// and restored on startup, so several run-improve runs in the SAME day share the
// same daily quota instead of each thinking it owns the full budget.
//
// Used by run-improve.ps1 so plan limits (e.g. Gemini free tier 15 rpm /
// 250K tpm / 500 req per day) are never exceeded.
//
// Usage: node proxy-throttle.cjs [--port 4040] [--rpm 12] [--daily-req 500]
//        [--max-input-k 0] [--upstream https://generativelanguage.googleapis.com/v1beta/openai]
//
// All upstream requests are serialized and spaced at least 60000/rpm ms apart.
// SSE/streaming responses are piped through unmodified; token usage is extracted
// by scanning the response stream (OpenAI "usage" or Gemini "usageMetadata").
//
// Endpoints (answered immediately, never paced):
//   GET /health -> readiness
//   GET /usage  -> cumulative counters + limits
//
// When a budget is exhausted the proxy answers 429 WITH A JSON ERROR and does not
// contact the upstream, so callers fail loudly instead of burning the quota.

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : def;
}

const PORT = parseInt(arg('port', '4040'), 10);
const RPM = Math.max(1, parseInt(arg('rpm', '12'), 10));
const DAILY_REQ = Math.max(0, parseInt(arg('daily-req', '500'), 10));
const MAX_INPUT_K = Math.max(0, parseInt(arg('max-input-k', '0'), 10));
const UPSTREAM = arg('upstream', 'https://integrate.api.nvidia.com/v1');
const upstream = new URL(UPSTREAM);
const UPSTREAM_ORIGIN = upstream.origin;
const MIN_INTERVAL = Math.floor(60000 / RPM);

const LOGS_DIR = path.join(__dirname, 'logs');

// --- pacing ------------------------------------------------------------------

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

// --- per-day usage accounting -------------------------------------------------

function pad(n) {
  return String(n).padStart(2, '0');
}
function dayKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function usageFilePath(date) {
  return path.join(LOGS_DIR, 'usage-' + date + '.json');
}

let usage = loadToday();

function loadToday() {
  const t = dayKey(new Date());
  try {
    const raw = JSON.parse(fs.readFileSync(usageFilePath(t), 'utf8'));
    if (raw.date === t) return raw;
  } catch {}
  return { date: t, requests: 0, inputTokens: 0, outputTokens: 0 };
}

function touchDay() {
  const t = dayKey(new Date());
  if (usage.date !== t) {
    usage = { date: t, requests: 0, inputTokens: 0, outputTokens: 0 };
  }
}

function saveUsage() {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.writeFileSync(usageFilePath(usage.date), JSON.stringify(usage, null, 2));
  } catch {}
}

// --- token accounting ---------------------------------------------------------

function estimatePromptTokens(body) {
  const bytes = body ? Buffer.byteLength(body) : 0;
  return Math.ceil(bytes / 4);
}

function findUsage(text) {
  const m = (re) => {
    const g = text.match(re);
    return g ? parseInt(g[1], 10) : 0;
  };
  const prompt = m(/"prompt_tokens"\s*:\s*(\d+)/);
  const compl = m(/"completion_tokens"\s*:\s*(\d+)/);
  const inTok = m(/"input_tokens"\s*:\s*(\d+)/);
  const outTok = m(/"output_tokens"\s*:\s*(\d+)/);
  const pCount = m(/"promptTokenCount"\s*:\s*(\d+)/);
  const cCount = m(/"candidatesTokenCount"\s*:\s*(\d+)/);
  const total = m(/"total_tokens"\s*:\s*(\d+)/) || m(/"totalTokenCount"\s*:\s*(\d+)/);

  const any = prompt || compl || inTok || outTok || pCount || cCount || total;
  if (!any) return null;

  let input = prompt || inTok || pCount || 0;
  let output = compl || outTok || cCount || 0;
  if (!input && total) input = Math.max(0, total - output);
  if (input && !output && total) output = Math.max(0, total - input);
  return { input, output };
}

function recordResponse(bodyText, promptEstimate) {
  touchDay();
  usage.requests += 1;
  const u = findUsage(bodyText);
  if (u) {
    usage.inputTokens += u.input;
    usage.outputTokens += u.output;
  } else {
    usage.inputTokens += promptEstimate;
  }
  if (usage.requests % 10 === 0) saveUsage();
}

// --- budget gate --------------------------------------------------------------

function gate(payload) {
  if (DAILY_REQ > 0 && usage.requests >= DAILY_REQ) {
    return { code: 429, msg: 'Daily request budget exhausted (' + usage.requests + '/' + DAILY_REQ + '). Weekly quota shared across all runs today.' };
  }
  if (MAX_INPUT_K > 0) {
    const est = estimatePromptTokens(payload);
    if (usage.inputTokens + est > MAX_INPUT_K * 1000) {
      const used = Math.round(usage.inputTokens / 1000);
      return { code: 429, msg: 'Input-token budget exhausted (~' + used + 'K/' + MAX_INPUT_K + 'K).' };
    }
  }
  return null;
}

// --- proxy --------------------------------------------------------------------

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
    const blocked = gate(payload);
    if (blocked) {
      saveUsage();
      res.writeHead(blocked.code, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: blocked.msg, proxy_budget: true } }));
      console.log('[proxy] BLOCKED ' + req.method + ' ' + req.url + ' -> 429 ' + blocked.msg);
      return;
    }

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

          let collected = '';
          upstreamRes.on('data', (c) => {
            collected += c;
            if (!res.destroyed) res.write(c);
          });
          upstreamRes.on('end', () => {
            recordResponse(collected, estimatePromptTokens(payload));
            if (!res.destroyed) res.end();
            console.log(
              '[proxy] ' + req.method + ' ' + req.url + ' -> ' + upstreamRes.statusCode +
              ' | day req#' + usage.requests + '/' + (DAILY_REQ || 'inf') +
              ' in=' + usage.inputTokens + ' out=' + usage.outputTokens
            );
          });
          upstreamRes.on('error', (err) => {
            if (!res.destroyed) res.destroy();
          });
        }
      );

      upstreamReq.on('error', (err) => {
        console.error('[proxy] upstream error: ' + err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        }
        if (!res.destroyed) res.end('[proxy] upstream error: ' + err.message);
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
  if (req.method === 'GET' && req.url === '/usage') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        date: usage.date,
        requests: usage.requests,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        rpm: RPM,
        minIntervalMs: MIN_INTERVAL,
        limits: { dailyReq: DAILY_REQ, maxInputK: MAX_INPUT_K },
      })
    );
    return;
  }
  handle(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('[proxy] listening on 127.0.0.1:' + PORT + ' rpm=' + RPM + ' interval=' + MIN_INTERVAL + 'ms dailyReq=' + DAILY_REQ + ' maxInputK=' + MAX_INPUT_K + ' upstream=' + UPSTREAM);
  console.log('[proxy] restored today usage: ' + usage.requests + ' req / ' + usage.inputTokens + ' in / ' + usage.outputTokens + ' out');
});

function shutdown() {
  saveUsage();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
