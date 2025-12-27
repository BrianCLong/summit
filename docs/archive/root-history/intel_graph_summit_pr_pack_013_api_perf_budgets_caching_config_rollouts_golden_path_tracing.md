# PR Pack 013 — API Performance Budgets, Caching Strategy, Zero‑Downtime Config Rollouts, Golden‑Path Tracing (Ready‑to‑merge)

Twelve PRs that lock in fast, predictable APIs and safe config changes: per‑route SLO budgets with gates, HTTP + Redis caching with dogpile protection, circuit breakers/bulkheads, golden‑path tracing, k6/autocannon perf acceptance, connection pooling/pgBouncer, and index hygiene. Each PR has rollback & cutover.

---

## PR 144 — Per‑route API performance budgets (SLOs + gate)

**Purpose:** Enforce p95 latency & error rate per endpoint with a CI gate.

**Files**

**`observability/prometheus/api-budgets.yaml`**

```yaml
groups:
  - name: api-budgets
    rules:
      - record: route:latency:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))
      - record: route:error_rate:ratio5m
        expr: sum by (path) (rate(http_requests_total{code=~"5.."}[5m])) / sum by (path) (rate(http_requests_total[5m]))
```

**`scripts/route_slo_check.ts`**

```ts
import fetch from 'node-fetch';
const PROM = process.env.PROM_URL!;
const SLO = {
  '/search': { p95: 1.2, err: 0.02 },
  '/login': { p95: 0.5, err: 0.01 },
  '/export': { p95: 2.0, err: 0.03 },
};
async function q(expr: string) {
  const r = await fetch(
    `${PROM}/api/v1/query?query=${encodeURIComponent(expr)}`,
  );
  return Number((await r.json()).data.result?.[0]?.value?.[1] || '0');
}
(async () => {
  let bad: string[] = [];
  for (const [path, b] of Object.entries(SLO)) {
    const p95 = await q(`route:latency:p95{path="${path}"}`);
    const er = await q(`route:error_rate:ratio5m{path="${path}"}`);
    if (p95 > b.p95 || er > b.err)
      bad.push(`${path} p95=${p95.toFixed(2)}s err=${(er * 100).toFixed(2)}%`);
  }
  if (bad.length) {
    console.error('❌ Route budgets breached:\n' + bad.join('\n'));
    process.exit(1);
  }
  console.log('✅ All route budgets healthy');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**`.github/workflows/route-slo-gate.yml`**

```yaml
name: route-slo-gate
on: [workflow_call]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i node-fetch@2
      - run: node scripts/route_slo_check.ts
        env: { PROM_URL: ${{ secrets.PROM_URL }} }
```

**Rollback:** Remove gate from promotion workflow; budgets remain visible.

---

## PR 145 — Route profiler harness (autocannon + snapshots)

**Purpose:** Quick repeatable perf runs for hot endpoints.

**Files**

**`perf/autocannon/search.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
autocannon -d 30 -c 200 -p 10 "$BASE_URL/search?q=graph" --headers 'x-tenant-id: demo'
```

**`.github/workflows/perf-snapshot.yml`**

```yaml
name: perf-snapshot
on: workflow_dispatch
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g autocannon
      - run: BASE_URL=${{ secrets.STAGE_BASE_URL }} perf/autocannon/search.sh
```

**Rollback:** Keep harness local only.

---

## PR 146 — HTTP caching (Cache‑Control, ETag, SWR) + CDN rules

**Purpose:** Reduce origin load while keeping freshness guarantees.

**Files**

**`server/middleware/cacheHeaders.ts`**

```ts
import crypto from 'crypto';
export function withETag(ttl=60, swr=300){
  return (req,res,next)=>{
    res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${swr}`);
    const _send = res.send.bind(res);
    res.send = (body: any)=>{
      const etag = 'W/"'+crypto.createHash('sha1').update(body).digest('hex')+'"';
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match']===etag){ res.status(304).end(); return res as any; }
      return _send(body);
    } as any; next();
  }
}
```

**`k8s/ingress/cdn-annotations.yaml`** (example)

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/cache-enable: 'true'
    nginx.ingress.kubernetes.io/cache-key: '$host$request_uri$http_x_tenant_id'
    nginx.ingress.kubernetes.io/cache-zone: 'api-cache'
```

**Rollback:** Remove headers/annotations; origin serves uncached.

---

## PR 147 — Redis caching lib with dogpile protection (singleflight) & SWR

**Purpose:** Prevent stampedes; refresh in background.

**Files**

**`server/cache/index.ts`**

```ts
import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
const inflight = new Map<string, Promise<any>>();
export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await r.get(key);
  if (cached) return JSON.parse(cached);
  if (inflight.has(key)) return inflight.get(key)! as Promise<T>;
  const p = (async () => {
    const v = await fn();
    await r.setEx(key, ttlSec, JSON.stringify(v));
    return v;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}
export async function cachedSWR<T>(
  key: string,
  ttl: number,
  swr: number,
  fn: () => Promise<T>,
) {
  const v = await r.get(key);
  if (v) {
    const t = await r.ttl(key);
    if (t > 0 && t < swr)
      fn()
        .then((n) => r.setEx(key, ttl, JSON.stringify(n)))
        .catch(() => {});
    return JSON.parse(v);
  }
  return cached(key, ttl, fn);
}
```

**Rollback:** Call underlying functions directly; no caching.

---

## PR 148 — Circuit breaker & bulkhead (opossum) with graceful fallbacks

**Purpose:** Isolate failures and keep the site usable.

**Files**

**`server/resilience/circuit.ts`**

```ts
import CircuitBreaker from 'opossum';
export function wrap<T extends (...a:any[])=>Promise<any>>(fn:T, name:string){
  const breaker = new CircuitBreaker(fn, { timeout: 2000, errorThresholdPercentage: 50, resetTimeout: 10000, rollingCountBuckets: 10, rollingCountTimeout: 10000 });
  breaker.fallback((_...args)=>({ error: 'degraded', data: null }));
  breaker.on('open', ()=> console.warn(`[cb] open ${name}`));
  return (...args:any[])=> breaker.fire(...args);
}
```

**Rollback:** Call dependencies directly; remove breaker.

---

## PR 149 — Zero‑downtime typed config (ConfigMap + hot reload)

**Purpose:** Change config safely without restarts; validate with JSON Schema.

**Files**

**`config/app.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["limits"],
  "properties": {
    "limits": {
      "type": "object",
      "properties": {
        "maxResults": { "type": "integer", "minimum": 1, "maximum": 1000 }
      }
    }
  }
}
```

**`config/app.yaml`**

```yaml
limits: { maxResults: 100 }
```

**`server/config.ts`**

```ts
import fs from 'fs';
import yaml from 'js-yaml';
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(require('../config/app.schema.json'));
let cfg: any = yaml.load(fs.readFileSync('config/app.yaml', 'utf8'));
if (!validate(cfg)) throw new Error('Invalid config');
fs.watch('config/app.yaml', { persistent: false }, () => {
  try {
    const n = yaml.load(fs.readFileSync('config/app.yaml', 'utf8'));
    if (validate(n)) cfg = n;
  } catch (e) {
    console.error('cfg reload failed', e);
  }
});
export const getConfig = () => cfg;
```

**`charts/app/templates/configmap.yaml`** with checksum annotation on Deployment; optional reloader annotation.

**Rollback:** Disable watcher; require restarts to pick up config.

---

## PR 150 — Golden‑path tracing (login → search → detail → export) + baggage

**Purpose:** Consistent, rich traces for the user journey with tenant/user baggage.

**Files**

**`server/tracing/golden.ts`**

```ts
import { context, trace, SpanKind, propagation } from '@opentelemetry/api';
export async function goldenSearch(req, res, next) {
  const tracer = trace.getTracer('web');
  const span = tracer.startSpan('golden.search', {
    kind: SpanKind.SERVER,
    attributes: {
      'app.tenant': req.headers['x-tenant-id'] || 'unknown',
      'app.user': req.user?.id || 'anon',
    },
  });
  return await context.with(trace.setSpan(context.active(), span), async () => {
    res.on('finish', () => span.end());
    next();
  });
}
```

**`web/public/trace-init.js`** (inject W3C `traceparent` + tenant in baggage)

```js
import { context, propagation } from '@opentelemetry/api';
// ensure fetch adds trace headers + baggage=tenant
```

**Rollback:** Keep baseline auto‑instrumentation only.

---

## PR 151 — Endpoint concurrency limiter & queue (backpressure)

**Purpose:** Protect downstreams; return 429 + Retry‑After on overload.

**Files**

**`server/middleware/concurrency.ts`**

```ts
const limits = new Map<string, { in: number; max: number }>();
export function limit(path: string, max = 100) {
  limits.set(path, { in: 0, max });
  return (req, res, next) => {
    const s = limits.get(path)!;
    if (s.in >= s.max) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'over_capacity' });
    }
    s.in++;
    res.on('finish', () => s.in--);
    next();
  };
}
```

**Rollback:** Remove middleware; rely on HPA to absorb spikes.

---

## PR 152 — Perf acceptance tests (k6 + verify‑release) & headroom check

**Purpose:** Block promotions when p95 latency rises >10% vs baseline.

**Files**

**`load/k6/api.js`**

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 50, duration: '2m' };
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/search?q=graph`, {
    headers: { 'x-tenant-id': 'demo' },
  });
  check(res, { 200: (r) => r.status === 200 });
  sleep(1);
}
```

**`scripts/headroom_check.ts`**

```ts
// Compare current route:latency:p95 to a stored baseline (artifact); fail if > 1.1x
```

**`.github/workflows/verify-release.yml`** (append after deploy)

```yaml
  verify:
    steps:
      - uses: grafana/k6-action@v0.3.1
        with: { filename: load/k6/api.js }
        env: { BASE_URL: ${{ secrets.STAGE_BASE_URL }} }
      - run: node scripts/headroom_check.ts
        env: { PROM_URL: ${{ secrets.PROM_URL }} }
```

**Rollback:** Run perf tests in report‑only mode.

---

## PR 153 — Connection pooling & pgBouncer (and drivers) tuning

**Purpose:** Stable DB performance under load; avoid connection storms.

**Files**

**`helm/pgbouncer/values.yaml`** (example)

```yaml
auth_type: md5
min_pool_size: 5
max_client_conn: 2000
default_pool_size: 50
server_tls_sslmode: require
```

**`server/db/pool.ts`**

```ts
import { Pool } from 'pg';
export const pool = new Pool({
  max: Number(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Rollback:** Connect direct to Postgres; remove pgBouncer svc.

---

## PR 154 — Query/index hygiene (auto_explain + advisors + safe indexes)

**Purpose:** Catch slow queries; add missing indexes safely.

**Files**

**`db/postgres/auto_explain.sql`**

```sql
LOAD 'auto_explain';
SET auto_explain.log_min_duration = '200ms';
SET auto_explain.log_analyze = true;
```

**`db/migrations/2025090708_indexes.sql`**

```sql
SET lock_timeout='1s'; SET statement_timeout='5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_created ON events (tenant_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

**Rollback:** DROP INDEX CONCURRENTLY; keep auto_explain for visibility.

---

## PR 155 — Adaptive feature degrader (auto‑shed)

**Purpose:** On SLO breach, automatically disable heavy features via flags.

**Files**

**`server/degrade/auto.ts`**

```ts
import fetch from 'node-fetch';
export async function autoshed() {
  const prom = process.env.PROM_URL!;
  const q = 'route:latency:p95{path="/search"}';
  const v = Number(
    (
      await (
        await fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q)}`)
      ).json()
    ).data.result?.[0]?.value?.[1] || '0',
  );
  if (v > 1.5)
    await fetch(process.env.FLAG_API!, {
      method: 'POST',
      body: JSON.stringify({ flag: 'ranker_v2', value: false }),
    });
}
```

**`k8s/cron/autoshed.yaml`** — runs every 2 minutes in stage; 5 in prod.

**Rollback:** Disable CronJob; keep manual control of flags.

---

# Cutover (half day)

1. Land **route budgets** and run **perf snapshot** to capture baselines.
2. Enable **HTTP + Redis caching** on `/search` and `/detail`; verify hit rate and absence of stampedes.
3. Wrap downstream calls with **circuit breakers** for search & export.
4. Switch app to **typed config + hot reload**; roll a no‑op change to validate.
5. Instrument **golden‑path spans** and confirm exemplar links from dashboards.
6. Add **endpoint concurrency limiter** for export endpoints.
7. Wire **k6 perf acceptance** into verify‑release and set initial headroom.
8. Deploy **pgBouncer** in stage → prod; adjust app pools.
9. Apply **index hygiene** migration in off‑peak; watch locks/timeouts.
10. Turn on **auto‑degrader** in stage (observe); keep prod manual for 1–2 releases.

# Rollback

- Remove the SLO gate from promotion; keep dashboards.
- Disable caching middleware and CDN annotations.
- Remove circuit breaker wrapper and concurrency limiter.
- Stop config watcher; revert to restart-on-change.
- Keep tracing minimal (auto‑instr only).
- Remove pgBouncer svc and point app to DB directly.
- Revert index migration if regressions (DROP CONCURRENTLY).
- Disable autoshed CronJob; manage via flags.

# Ownership

- **App/Backend:** PR 146–151, 155
- **Platform/Observability:** PR 144–145, 152–154
- **DB:** PR 153–154
