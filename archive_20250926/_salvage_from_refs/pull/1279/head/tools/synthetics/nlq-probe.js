#!/usr/bin/env node
/*
 Synthetic NLQ probe
 - Sends golden NL prompts to the gateway NL→Cypher endpoint
 - Measures latency and validates basic safety/correctness patterns

 Env:
  - GATEWAY_URL (required), e.g., https://api.example.com
  - API_KEY (optional header Authorization: Bearer <API_KEY>)
  - NLQ_PATH (optional; default /api/nlq/execute)
  - TIMEOUT_MS (optional; default 5000)
  - CONCURRENCY (optional; default 2)
  - GOLDENS_PATH (optional; default ./golden-queries.json)
  - VERIFY_FIELD (optional; path to cypher text, default response.cypher)
*/

const GATEWAY_URL = process.env.GATEWAY_URL;
const API_KEY = process.env.API_KEY || '';
const NLQ_PATH = process.env.NLQ_PATH || '/api/nlq/execute';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '5000', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2', 10);
const GOLDENS_PATH = process.env.GOLDENS_PATH || new URL('./golden-queries.json', import.meta?.url || 'file:').pathname || './golden-queries.json';
const VERIFY_FIELD = process.env.VERIFY_FIELD || 'cypher';

if (!GATEWAY_URL) {
  console.error('GATEWAY_URL is required');
  process.exit(2);
}

import('node:fs').then(({ readFileSync }) => {
  const raw = readFileSync(GOLDENS_PATH, 'utf8');
  const goldens = JSON.parse(raw);
  run(goldens).catch((err) => {
    console.error('Probe error:', err?.stack || err?.message || String(err));
    process.exit(1);
  });
});

async function run(goldens) {
  const queue = [...goldens];
  let failures = 0;
  const runners = Array.from({ length: CONCURRENCY }, () => worker(queue, (f) => (failures += f)));
  await Promise.all(runners);
  if (failures > 0) process.exit(1);
}

async function worker(queue, addFailures) {
  for (;;) {
    const item = queue.shift();
    if (!item) return;
    const start = Date.now();
    let status = 'ok';
    let latencyMs = null;
    let notes = [];
    let failCount = 0;
    try {
      const res = await fetchWithTimeout(new URL(NLQ_PATH, GATEWAY_URL).toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
        body: JSON.stringify({ prompt: item.prompt, mode: 'read-only' }),
      }, TIMEOUT_MS);
      latencyMs = Date.now() - start;
      if (!res.ok) {
        status = 'http_error';
        notes.push(`HTTP ${res.status}`);
        failCount++;
      } else {
        const body = await res.json().catch(() => ({}));
        const cypher = readField(body, VERIFY_FIELD);
        const rows = Array.isArray(body?.rows) ? body.rows.length : null;
        // Pattern checks
        (item.expect?.contains || []).forEach((needle) => {
          if (!String(cypher || '').includes(needle)) {
            status = 'pattern_miss';
            notes.push(`missing:${needle}`);
            failCount++;
          }
        });
        (item.expect?.not_contains || []).forEach((needle) => {
          if (String(cypher || '').includes(needle)) {
            status = 'unsafe_pattern';
            notes.push(`forbidden:${needle}`);
            failCount++;
          }
        });
        if (Number.isInteger(item.expect?.min_rows) && rows !== null && rows < item.expect.min_rows) {
          status = 'too_few_rows';
          notes.push(`rows:${rows}<${item.expect.min_rows}`);
          failCount++;
        }
      }
    } catch (e) {
      status = 'exception';
      notes.push(e?.message || String(e));
      latencyMs = Date.now() - start;
      failCount++;
    }
    const out = {
      id: item.id,
      status,
      latencyMs,
      promptLen: item.prompt.length,
      timestamp: new Date().toISOString(),
      notes,
    };
    process.stdout.write(JSON.stringify(out) + '\n');
    addFailures(failCount);
  }
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

function readField(obj, path) {
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

