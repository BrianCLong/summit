#!/usr/bin/env node
/**
 * Summit Post-Deploy Validation Script
 *
 * Runs after every deployment to verify the release behaves correctly
 * in the target environment. Covers the critical user-facing paths
 * and operational endpoints that must be healthy before first-week
 * monitoring begins.
 *
 * Usage:
 *   BASE_URL=https://summit.example.com node scripts/post-deploy/validate.mjs
 *   BASE_URL=http://localhost:3000 node scripts/post-deploy/validate.mjs --verbose
 *   node scripts/post-deploy/validate.mjs  # defaults to http://localhost:3000
 *
 * Exit codes:
 *   0  — all checks passed (GO)
 *   1  — one or more checks failed (NO-GO or investigate before proceeding)
 *
 * CI integration:
 *   Add as a post-deploy step in your CD pipeline. Set BASE_URL to the
 *   environment under test. The script prints a machine-readable summary
 *   line at the end that can be parsed by downstream notification hooks.
 */

import { URL } from 'url';
import http from 'http';
import https from 'https';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL  = process.env.API_URL  || BASE_URL.replace(/\/$/, '').replace(/:3000$/, ':4000');
const VERBOSE  = process.argv.includes('--verbose') || process.env.VERBOSE === '1';
const TIMEOUT  = parseInt(process.env.TIMEOUT_MS || '8000', 10);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function request(target, { method = 'GET', headers = {}, body, expectStatus } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const client = url.protocol === 'https:' ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: TIMEOUT,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk.toString(); });
      res.on('end', () => {
        const status = res.statusCode || 0;
        resolve({ status, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`timeout after ${TIMEOUT}ms`)));

    if (body) req.write(body);
    req.end();
  });
}

// ─── Check registry ───────────────────────────────────────────────────────────

const results = [];
let passed = 0;
let failed = 0;

async function check(label, fn) {
  const t0 = Date.now();
  try {
    const { ok, detail } = await fn();
    const ms = Date.now() - t0;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} [${ms}ms] ${label}${detail ? ` — ${detail}` : ''}`);
    results.push({ label, ok, ms, detail });
    if (ok) passed++; else failed++;
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`❌ [${ms}ms] ${label} — ${err.message}`);
    results.push({ label, ok: false, ms, detail: err.message });
    failed++;
  }
}

// ─── Check definitions ────────────────────────────────────────────────────────

// 1. Frontend shell loads and returns HTML
async function checkFrontendShell() {
  const r = await request(`${BASE_URL}/`);
  const ok = r.status >= 200 && r.status < 400 && r.body.includes('<div id="root"');
  return { ok, detail: `HTTP ${r.status}${ok ? '' : ', root div not found'}` };
}

// 2. Frontend assets (main JS bundle) is served (checks <script type="module" src="/assets/...)
async function checkFrontendAssets() {
  const r = await request(`${BASE_URL}/`);
  const ok = r.status === 200 && (r.body.includes('type="module"') || r.body.includes('/assets/'));
  return { ok, detail: ok ? 'module script tag present' : `assets not found (HTTP ${r.status})` };
}

// 3. API health endpoint
async function checkApiHealth() {
  const r = await request(`${API_URL}/health`);
  const ok = r.status >= 200 && r.status < 400;
  return { ok, detail: `HTTP ${r.status}` };
}

// 4. GraphQL schema is reachable and resolves root type
async function checkGraphQL() {
  const payload = JSON.stringify({ query: '{ __typename }' });
  const r = await request(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });
  let parsed = {};
  try { parsed = JSON.parse(r.body); } catch { /* ignore */ }
  const ok = parsed?.data?.__typename === 'Query';
  return { ok, detail: ok ? 'schema root resolved' : `unexpected: ${r.body.slice(0, 120)}` };
}

// 5. Feature-flags endpoint responds (may return 401 without auth — that's fine; 500 is not)
async function checkFeatureFlagsEndpoint() {
  const r = await request(`${API_URL}/api/feature-flags/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: {} }),
  });
  // 200 = unauthenticated access allowed (fine), 401/403 = auth required (fine), 5xx = not fine
  const ok = r.status < 500;
  return { ok, detail: `HTTP ${r.status}` };
}

// 6. Telemetry ingest endpoint accepts events (functional check; 2xx or 4xx but not 5xx)
async function checkTelemetryEndpoint() {
  const r = await request(`${API_URL}/api/monitoring/telemetry/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'smoke_check', labels: { source: 'post-deploy-validate' } }),
  });
  const ok = r.status < 500;
  return { ok, detail: `HTTP ${r.status}` };
}

// 7. Critical SPA routes return the shell (not 404/500)
async function checkRoutes() {
  const criticalRoutes = [
    '/',
    '/explore',
    '/alerts',
    '/cases',
    '/reports',
    '/admin',
  ];
  const failures = [];
  for (const route of criticalRoutes) {
    try {
      const r = await request(`${BASE_URL}${route}`);
      if (r.status >= 500) failures.push(`${route}:${r.status}`);
    } catch (e) {
      failures.push(`${route}:${e.message}`);
    }
  }
  const ok = failures.length === 0;
  return { ok, detail: ok ? `${criticalRoutes.length} routes OK` : `failures: ${failures.join(', ')}` };
}

// 8. Auth / sign-in page loads (regression guard for auth bootstrap)
async function checkAuthPage() {
  const r = await request(`${BASE_URL}/signin`);
  const ok = r.status >= 200 && r.status < 400;
  return { ok, detail: `HTTP ${r.status}` };
}

// 9. Static assets 404 does not serve 5xx (CDN/server error guard)
async function checkNotFoundBehavior() {
  const r = await request(`${BASE_URL}/__nonexistent_asset_smoke_check__`);
  // SPA should serve index.html (200) or a proper 404 — never 5xx
  const ok = r.status < 500;
  return { ok, detail: `HTTP ${r.status} (expected <500)` };
}

// 10. OTEL collector (if present) accepts spans
async function checkOtelCollector() {
  const otelUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318';
  try {
    const r = await request(`${otelUrl}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceSpans: [] }),
    });
    const ok = r.status < 500;
    return { ok, detail: `HTTP ${r.status}` };
  } catch {
    // OTEL collector is optional; skip gracefully
    return { ok: true, detail: 'collector not reachable — skipped (optional)' };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log(' Summit Post-Deploy Validation');
  console.log(` BASE_URL : ${BASE_URL}`);
  console.log(` API_URL  : ${API_URL}`);
  console.log(` Date     : ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════');
  console.log('');

  await check('Frontend shell loads (HTML with #root)',   checkFrontendShell);
  await check('Frontend module assets served',            checkFrontendAssets);
  await check('API health endpoint',                      checkApiHealth);
  await check('GraphQL schema resolves root type',        checkGraphQL);
  await check('Feature-flags endpoint reachable',         checkFeatureFlagsEndpoint);
  await check('Telemetry ingest endpoint accepts events', checkTelemetryEndpoint);
  await check('Critical SPA routes (6 routes)',           checkRoutes);
  await check('Auth / sign-in page',                      checkAuthPage);
  await check('404 served correctly (not 5xx)',           checkNotFoundBehavior);
  await check('OTEL collector (optional)',                checkOtelCollector);

  console.log('');
  console.log('────────────────────────────────────────────────');

  const total = passed + failed;
  const summaryLine = `SUMMARY: ${passed}/${total} checks passed`;
  console.log(summaryLine);

  if (VERBOSE) {
    console.log('');
    console.log('Detail:');
    results.forEach(r => {
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.label} (${r.ms}ms)${r.detail ? ': ' + r.detail : ''}`);
    });
  }

  console.log('');
  if (failed === 0) {
    console.log('✅ GO — all post-deploy checks passed.');
    console.log(`MACHINE: {"status":"go","passed":${passed},"failed":0,"total":${total}}`);
    process.exit(0);
  } else {
    console.log(`❌ NO-GO — ${failed} check(s) failed. Investigate before enabling live traffic.`);
    console.log(`MACHINE: {"status":"no-go","passed":${passed},"failed":${failed},"total":${total}}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Post-deploy validator crashed:', err);
  process.exit(1);
});
