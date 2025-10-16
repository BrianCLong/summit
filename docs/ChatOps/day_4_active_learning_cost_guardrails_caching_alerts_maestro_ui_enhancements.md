# Day 4 — Active Learning, Cost Guardrails, Caching & Alerts + Maestro UI Enhancements

> Objective: Close the loop with **analyst feedback → bandit rewards**, stand up **per‑tenant cost/SLO guardrails** and **alerting**, add **HTTP cache & de‑dup**, harden security, and upgrade the **Maestro UI** with budgets, SLOs, and richer denial explainability.

---

## 0) Success Criteria (Day‑4)

- **Active Learning**: Analyst thumbs‑up/down and extractor precision automatically update bandit priors within 60s.
- **Cost Guardrails**: Per‑tenant budgets with hard/soft limits; circuit‑breaker backoff when exceeded; visible in UI.
- **SLOs & Alerts**: Prom alerts (p95 latency, denial rate, error rate, budget burn) with Slack/PagerDuty hooks.
- **Caching/De‑dup**: ETag/If‑Modified‑Since + content hash de‑dup reduce redundant fetches 60%+ on repeat queries.
- **Security**: SSRF allow‑list, header sanitation, and outbound IP pinning.

---

## 1) Data Model & Migrations

```sql
-- scripts/migrate_day4.sql
create table if not exists tenant_budgets (
  tenant_id text primary key,
  daily_request_limit int not null,
  daily_byte_limit bigint not null,
  soft_threshold_pct int not null default 80,
  reset_at timestamptz not null default now()
);

create table if not exists usage_counters (
  tenant_id text not null,
  day date not null,
  requests int not null default 0,
  bytes bigint not null default 0,
  primary key(tenant_id, day)
);

create index on usage_counters(tenant_id, day);

-- feedback signals (expanding Day‑2 table)
alter table if exists bandit_signals add column if not exists thumbs_up boolean;
alter table if exists bandit_signals add column if not exists extractor_precision numeric;
```

---

## 2) Orchestrator Additions: Budget Manager, Cache, Circuit‑Breaker

```ts
// services/web-orchestrator/src/budgetManager.ts
import { db } from './db';
export async function checkAndIncrement(tenantId: string, bytes: number) {
  const day = new Date().toISOString().slice(0, 10);
  const { rows } = await db.query(
    `
    with up as (
      insert into usage_counters(tenant_id, day, requests, bytes)
      values($1,$2,1,$3)
      on conflict (tenant_id, day) do update set
        requests = usage_counters.requests + 1,
        bytes = usage_counters.bytes + excluded.bytes
      returning requests, bytes
    ) select up.requests, up.bytes, b.daily_request_limit, b.daily_byte_limit, b.soft_threshold_pct
      from up join tenant_budgets b on b.tenant_id=$1
  `,
    [tenantId, day, bytes],
  );
  const r = rows[0];
  const reqPct = (r.requests / r.daily_request_limit) * 100;
  const bytePct = (r.bytes / r.daily_byte_limit) * 100;
  const softHit = Math.max(reqPct, bytePct) >= r.soft_threshold_pct;
  const hardHit =
    r.requests > r.daily_request_limit || r.bytes > r.daily_byte_limit;
  return { softHit, hardHit, reqPct, bytePct };
}
```

```ts
// services/web-orchestrator/src/cache.ts
import Redis from 'ioredis';
import crypto from 'crypto';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function cacheKey(target: string, path: string) {
  return (
    'wf:' +
    crypto
      .createHash('sha1')
      .update(target + '|' + path)
      .digest('hex')
  );
}

export async function getCached(target: string, path: string) {
  const key = await cacheKey(target, path);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCached(
  target: string,
  path: string,
  value: any,
  ttlSec = 3600,
) {
  const key = await cacheKey(target, path);
  await redis.setex(key, ttlSec, JSON.stringify(value));
}
```

```ts
// services/web-orchestrator/src/resolvers.ts (diffs: cache + budgets + breaker)
import { getCached, setCached } from './cache';
import { checkAndIncrement } from './budgetManager';

const CIRCUIT = new Map<string, { openUntil: number }>();

function circuitOpen(tenantId: string) {
  const s = CIRCUIT.get(tenantId);
  return !!s && s.openUntil > Date.now();
}
function tripCircuit(tenantId: string, ms: number) {
  CIRCUIT.set(tenantId, { openUntil: Date.now() + ms });
}

export const resolvers = {
  Mutation: {
    enqueueWebFetch: async (_: any, { job }: any, ctx: any) => {
      const tenantId = ctx?.tenantId || 't_default';
      if (circuitOpen(tenantId))
        throw new Error('Budget circuit open; try later');

      // cache check
      const cached = await getCached(job.target, job.path);
      if (cached) return cached.id;

      // policy check (existing)
      // ...

      // publish and optimistic budget increment (bytes estimated small)
      const id = 'wf_' + require('uuid').v4();
      await publishFetch({ id, ...job });
      await setCached(job.target, job.path, { id }, 60); // de‑dupe burst for 60s
      return id;
    },
  },
};
```

---

## 3) Worker: Conditional GET + Result Persistence + Feedback Hook

```python
# services/web-agent/http_fetch.py
import httpx
async def fetch_with_cache(url: str, etag: str | None = None, last_mod: str | None = None):
    headers = {"User-Agent":"IntelGraph-Orchestrator/1.0"}
    if etag: headers["If-None-Match"] = etag
    if last_mod: headers["If-Modified-Since"] = last_mod
    async with httpx.AsyncClient(timeout=30, headers=headers) as c:
        r = await c.get(url)
        return r.status_code, r.text, r.content, r.headers.get('ETag'), r.headers.get('Last-Modified')
```

```python
# services/web-agent/worker.py (persist result + feedback)
from http_fetch import fetch_with_cache
from db import save_result, record_feedback

async def process_job(job: dict):
    url = urljoin(f"https://{job['target']}", job["path"])
    # ETag flow (ETag store could be Redis)
    etag = None; last_mod = None
    status, text, raw, etag_new, last_mod_new = await fetch_with_cache(url, etag, last_mod)
    # ... extractor & manifest as Day‑3
    out = { ... }
    await save_result(out)
    # feedback signal (precision is mocked here; real value from evaluator)
    await record_feedback(job['target'], success = (out['status']== 'OK'), precision = out.get('claims') and 0.8)
    return out
```

```python
# services/web-agent/db.py
import asyncpg
_pool = None
async def pool():
    global _pool
    if not _pool: _pool = await asyncpg.create_pool(dsn=os.getenv('DATABASE_URL'))
    return _pool

async def save_result(out):
    p = await pool()
    await p.execute('insert into web_fetch_results(id,status,http_status,bytes,evidence_manifest_id,citations,warnings) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) on conflict (id) do nothing', out['id'], out['status'], out['httpStatus'], out['bytes'], out['evidenceManifestId'], json.dumps(out['citations']), json.dumps(out['warnings']))

async def record_feedback(domain:str, success:bool, precision:float|None):
    p = await pool()
    await p.execute('insert into bandit_signals(domain, success, precision) values($1,$2,$3)', domain, success, precision)
```

---

## 4) OPA Policy Extensions: Budgets & SSRF Allow‑List

```rego
package web.fetch

# SSRF: only allow sites present in registry allow_list
allow_sites { some s; s := data.registry.allow_list[_]; s == input.target }

budget_ok {
  input.tenant.usage.reqPct < 100
  input.tenant.usage.bytePct < 100
}

# Final allow: all base conditions + budget + allow_list
allow {
  base_allow
  allow_sites
  budget_ok
}
```

---

## 5) Alerts & Runbooks

**Prometheus alert rules (excerpt)**

```yaml
# deploy/monitoring/alerts.yaml
groups:
  - name: maestro
    rules:
      - alert: MaestroBudgetSoft
        expr: max(tenant_budget_usage_pct) by (tenant) > 80
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: 'Budget >80% for {{ $labels.tenant }}'
      - alert: MaestroBudgetHard
        expr: max(tenant_budget_usage_pct) by (tenant) >= 100
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: 'Budget exhausted for {{ $labels.tenant }}'
      - alert: MaestroWorkerP95High
        expr: histogram_quantile(0.95, sum(rate(worker_fetch_seconds_bucket[5m])) by (le)) > 6
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: 'Worker p95 latency > 6s'
```

**Alert webhook (Node)**

```ts
// services/web-orchestrator/src/alerts.ts
import fetch from 'node-fetch';
export async function notify(text: string) {
  if (!process.env.SLACK_WEBHOOK) return;
  await fetch(process.env.SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
```

Wire to circuit events:

```ts
if (hardHit) {
  tripCircuit(tenantId, 5 * 60_000);
  notify(`Budget hard limit hit for ${tenantId}`);
} else if (softHit) {
  notify(
    `Budget soft ${reqPct.toFixed(0)}%/${bytePct.toFixed(0)}% for ${tenantId}`,
  );
}
```

---

## 6) Security Hardening

- **SSRF**: deny non‑HTTP(S), link‑local, and RFC1918 targets; strict allow‑list.
- **Headers**: strip cookies/auth headers; only allow Accept/Accept‑Language; UA pinned.
- **Outbound IP**: SNAT via egress gateway; publish egress IPs in policy docs.
- **UI**: sanitize any rendered HTML; CSP for console; CSRF tokens on mutations.

**Example: target validator**

```ts
// services/web-orchestrator/src/validateTarget.ts
import isIp from 'is-ip';
export function isPublicHost(host: string) {
  if (isIp(host)) {
    // block private ranges quickly
    const n = host.split('.').map((x) => +x);
    const priv =
      n[0] === 10 ||
      (n[0] === 192 && n[1] === 168) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31);
    return !priv;
  }
  return true;
}
```

---

## 7) Maestro UI Enhancements (budgets + SLO + explainability)

```tsx
// ui/MaestroPanelEnhancements.tsx (diffs)
// Add Budget bar, SLO dials, and richer denial panel
<div className="bg-white rounded-2xl shadow p-4">
  <h2 className="text-xl font-semibold">Budgets</h2>
  <div className="mt-2 grid grid-cols-2 gap-3">
    {budgets.map(b=> (
      <div key={b.tenant} className="p-3 rounded-xl bg-gray-50">
        <div className="text-sm text-gray-600">{b.tenant}</div>
        <div className="text-xs">Requests: {b.reqPct}% · Bytes: {b.bytePct}%</div>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
          <div className="h-2 rounded-full" style={{ width: `${Math.max(b.reqPct,b.bytePct)}%` }} />
        </div>
      </div>
    ))}
  </div>
</div>

// Denials: include reasoner trace
<td className="py-2">
  <details>
    <summary className="cursor-pointer text-blue-600">Reason</summary>
    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(d.reasoner, null, 2)}</pre>
  </details>
</td>
```

**Gateway endpoint for budgets**

```ts
// services/web-orchestrator/src/ui-api.ts (add)
uiapi.get('/maestro/budgets', async (_req, res) => {
  const { rows } = await db.query(
    'select tenant_id as tenant, requests*100.0/daily_request_limit as reqPct, bytes*100.0/daily_byte_limit as bytePct from usage_counters uc join tenant_budgets tb on tb.tenant_id=uc.tenant_id where day=current_date',
  );
  res.json(rows);
});
```

---

## 8) Tests & Load

- **k6**: `scripts/k6_day4.js` to drive 100 RPS enqueue for 60s; assert < 1% errors.
- **Unit**: budget soft/hard paths; cache hit path returns cached id; SSRF blocks private hosts.

```js
// scripts/k6_day4.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 50, duration: '1m' };
export default function () {
  const q = `mutation{ enqueueWebFetch(job:{target:"example.com", path:"/", purpose:"docs", authorityId:"a", licenseId:"l", extractor:"article_v1"})}`;
  const res = http.post(__ENV.GQL, JSON.stringify({ query: q }), {
    headers: { 'content-type': 'application/json' },
  });
  check(res, { 200: (r) => r.status === 200 });
  sleep(0.2);
}
```

---

## 9) Day‑4 Launch Steps

1. `psql $DATABASE_URL -f scripts/migrate_day4.sql`
2. Set budgets for tenants: `insert into tenant_budgets(tenant_id,daily_request_limit,daily_byte_limit) values ('t_default', 5000, 1073741824) on conflict (tenant_id) do update set daily_request_limit=excluded.daily_request_limit, daily_byte_limit=excluded.daily_byte_limit;`
3. Redeploy orchestrator (env: `REDIS_URL`, `SLACK_WEBHOOK`).
4. Confirm UI budgets, run k6 load, observe alerts firing at soft/hard thresholds.

---

## 10) Revised Maestro Prompt (v4)

> You are the Maestro of IntelGraph’s Web Orchestration. Use allow‑listed interfaces, enforce **License/TOS/robots**, select **mode** (`http`/`headless`), and respect **tenant budgets**. De‑dup/cached fetches, emit **provenance manifests**, compute **claims** and **conflicts**, expose **metrics**, and update **bandit priors** from analyst feedback and extractor precision. If denied or rate‑limited, return a human‑readable reason, budget status, and an **appeal** link.
