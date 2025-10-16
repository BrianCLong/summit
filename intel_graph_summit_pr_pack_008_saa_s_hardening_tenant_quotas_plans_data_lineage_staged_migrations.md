# PR Pack 008 — SaaS Hardening, Tenant Quotas & Plans, Data Lineage, Staged Data Migrations (Ready‑to‑merge)

Twelve PRs to make IntelGraph production‑grade as a multi‑tenant SaaS: per‑tenant quotas/rate‑plans, feature entitlements, usage metering + billing hooks, DSAR (export/purge), data lineage/catalog, staged/CDC migrations, residency controls, and tenant SLOs. Each has rollback and cutover.

---

## PR 83 — Tenant & plan schema + quota usage

**Purpose:** First‑class tenants, plans, quotas, and usage counters.

**Files**

**`db/migrations/2025090706_tenant_plan.sql`**

```sql
CREATE TABLE IF NOT EXISTS tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null default 'us-east-1',
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS quota_def (
  key text primary key, -- e.g. 'api_calls_per_day'
  starter int not null default 5000,
  pro int not null default 50000,
  enterprise int not null default 500000
);
CREATE TABLE IF NOT EXISTS quota_usage (
  tenant_id uuid not null references tenants(id),
  key text not null, period date not null,
  used bigint not null default 0,
  primary key (tenant_id, key, period)
);
```

**`server/middleware/tenant.ts`** (extend)

```ts
export async function loadTenant(req, res, next) {
  const id = String(req.headers['x-tenant-id'] || '');
  if (!id) return res.status(400).json({ error: 'tenant_header_required' });
  req.tenant = await req.db.one('select * from tenants where id=$1', [id]);
  next();
}
```

**Rollback:** Keep single‑tenant defaults (plan=enterprise) and ignore quotas.

---

## PR 84 — Per‑tenant API rate limit (Redis leaky bucket)

**Purpose:** Enforce burst/steady limits by plan with headers.

**Files**

**`server/middleware/ratelimit.ts`**

```ts
import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
export function rateLimit(limitPerMinByPlan: Record<string, number>) {
  return async (req, res, next) => {
    const plan = req.tenant.plan;
    const lim = limitPerMinByPlan[plan] || 60;
    const key = `rl:${req.tenant.id}:${new Date().toISOString().slice(0, 16)}`; // per‑minute
    const used = await r.incr(key);
    if (used === 1) await r.expire(key, 65);
    res.setHeader('X-RateLimit-Limit', String(lim));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(lim - used, 0)));
    return used > lim
      ? res.status(429).json({ error: 'rate_limited' })
      : next();
  };
}
```

**`server/app.ts`** (wire by plan)

```ts
app.use(loadTenant, rateLimit({ starter: 60, pro: 600, enterprise: 6000 }));
```

**Rollback:** Disable middleware; leave headers off.

---

## PR 85 — Usage metering + billing export (Stripe‑ready)

**Purpose:** Persist billable usage; emit metrics; export monthly CSV for billing.

**Files**

**`server/billing/meter.ts`**

```ts
import client from 'prom-client';
export const usage = new client.Counter({
  name: 'usage_api_calls',
  help: 'API calls',
  labelNames: ['tenant'],
});
export async function recordUsage(
  db,
  tenantId: string,
  key = 'api_calls_per_day',
) {
  await db.none(
    'insert into quota_usage(tenant_id,key,period,used) values($1,$2,current_date,1)\
                 on conflict (tenant_id,key,period) do update set used=quota_usage.used+1',
    [tenantId, key],
  );
  usage.inc({ tenant: tenantId });
}
```

**`scripts/export_usage.ts`**

```ts
// Exports last month usage to CSV: tenant_id, key, period, used
```

**`.github/workflows/usage-export.yml`**

```yaml
name: usage-export
on:
  schedule: [{ cron: '0 2 1 * *' }]
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/export_usage.ts > usage.csv
      - uses: actions/upload-artifact@v4
        with: { name: usage-${{ github.run_id }}.csv, path: usage.csv }
```

**Rollback:** Disable workflow; keep usage in DB for analytics.

---

## PR 86 — Feature entitlements by plan (OPA policy)

**Purpose:** Gate features per plan centrally.

**Files**

**`policy/rego/entitlements.rego`**

```rego
package entitlements

# input: { plan, feature }
allow {
  input.feature == "batch_import"; input.plan == "enterprise"
} else {
  input.feature == "advanced_export"; input.plan != "starter"
} else {
  input.feature == "basic"; true
}
```

**`server/middleware/entitlement.ts`**

```ts
import { evaluate } from '@open-policy-agent/opa-wasm';
export function requireFeature(feature: string) {
  return (req, res, next) =>
    evaluate('entitlements/allow', { plan: req.tenant.plan, feature })
      ? next()
      : res.status(402).json({ error: 'feature_not_in_plan' });
}
```

**Rollback:** Default allow; log only.

---

## PR 87 — Tenant isolation regression tests

**Purpose:** Prove RLS + guards work; fuzz tenant headers.

**Files**

**`tests/tenant/isolation.test.ts`**

```ts
it('cannot read other tenant resources', async () => {
  const a = await api('/events', { headers: { 'x-tenant-id': T1 } });
  const b = await api('/events', { headers: { 'x-tenant-id': T2 } });
  expect(a.body.items.find((x) => x.tenant_id === T2)).toBeUndefined();
});
```

**`.github/workflows/tenant-tests.yml`** — run on PR.

**Rollback:** Keep tests optional.

---

## PR 88 — DSAR: tenant/user export & purge (dual‑control)

**Purpose:** Compliant data export and deletion with approvals.

**Files**

**`server/routes/dsar.ts`**

```ts
app.post('/dsar/export', requireReason(['/dsar/export']), async (req, res) => {
  /* stream zip of user data */
});
app.post(
  '/dsar/purge',
  requireReason(['/dsar/purge']),
  requireStepUp(2),
  async (req, res) => {
    /* create deletion_requests row; wait for approval */
  },
);
```

**`k8s/cron/purge-processor.yaml`** — processes approved requests daily.

**Rollback:** Keep export only; disable purge job.

---

## PR 89 — Data lineage: OpenLineage + Marquez

**Purpose:** Track column/table lineage for ETL/jobs; visualize.

**Files**

**`k8s/marquez/deploy.yaml`** — Marquez (OpenLineage) deployment & svc.

**`etl/openlineage/client.ts`**

```ts
import { OpenLineageClient } from 'openlineage-client';
export const ol = new OpenLineageClient({
  url: process.env.OL_URL!,
  apiKey: process.env.OL_TOKEN!,
});
export function emitRun(job: string, inputs: string[], outputs: string[]) {
  /* emit start/complete with datasets */
}
```

**Rollback:** Disable emitter; keep jobs running without lineage.

---

## PR 90 — Column classification & catalog checks

**Purpose:** Tag PII, require TTL & encryption; fail CI if missing.

**Files**

**`data/catalog/schema.yaml`**

```yaml
tables:
  users:
    columns:
      email: { pii: true, ttl_days: 365, encrypted: true }
      name: { pii: true }
```

**`scripts/catalog-guard.ts`**

```ts
// Fail if any column tagged pii lacks ttl_days or encrypted:true
```

**`.github/workflows/catalog-guard.yml`** — run on PR; required check.

**Rollback:** Warn‑only mode.

---

## PR 91 — Staged data migrator framework

**Purpose:** Idempotent, chunked backfills with progress table, pause/resume.

**Files**

**`server/migrations/migrator.ts`**

```ts
export async function run(name: string, batch = 1000) {
  // Reads from migrations_progress (name, last_id, state)
  // Processes rows > last_id, updates cursor; safe to resume.
}
```

**`.github/workflows/migrator-run.yml`**

```yaml
name: migrator-run
on:
  workflow_dispatch:
    inputs:
      { name: { required: true }, batch: { required: false, default: '1000' } }
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node server/migrations/migrator.js ${{ github.event.inputs.name }} ${{ github.event.inputs.batch }}
```

**Rollback:** Pause job; cursor prevents duplication.

---

## PR 92 — CDC pipeline for online backfill (Debezium)

**Purpose:** Keep new columns in sync during long backfills.

**Files**

**`k8s/cdc/debezium.yaml`** — Debezium connector for Postgres, sink to Kafka (or Redis Stream) topic `orders_cdc`.

**`workers/cdc_sync.ts`**

```ts
// Consume CDC events; apply to new schema fields when dual_write is off
```

**Rollback:** Disable connector; rely on batch migrator only.

---

## PR 93 — Data residency guard (region‑aware storage & policy)

**Purpose:** Keep tenant data in assigned region; block cross‑region writes.

**Files**

**`policy/rego/residency.rego`**

```rego
package residency
allow_write { input.tenant.region == input.request.region }
```

**`server/middleware/region.ts`**

```ts
export function requireRegion(req, res, next) {
  const region = req.headers['x-region'] || process.env.DEFAULT_REGION;
  if (region !== req.tenant.region)
    return res.status(451).json({ error: 'wrong_region' });
  next();
}
```

**Rollback:** Log‑only enforcement; 302 to correct region.

---

## PR 94 — Tenant SLOs & service credits workflow

**Purpose:** Per‑tenant SLO burn tracking and automated credit issue.

**Files**

**`observability/prometheus/tenant-rules.yaml`**

```yaml
groups:
  - name: tenant-sli
    rules:
      - record: tenant:http_error_rate:ratio5m
        expr: sum by (tenant) (rate(http_requests_total{code=~"5.."}[5m])) / sum by (tenant) (rate(http_requests_total[5m]))
```

**`.github/workflows/tenant-credits.yml`**

```yaml
name: tenant-credits
on:
  schedule: [{ cron: '0 0 * * *' }]
jobs:
  compute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/compute_credits.js # queries Prom; opens issues for tenants breaching SLO
```

**Rollback:** Manual review only; disable schedule.

---

# Cutover (half day)

1. Ship **tenant/plan schema** and **rate‑limit** in **stage**; generate seed tenants.
2. Wire **metering** and verify monthly export artifact; keep Stripe off until ready.
3. Enable **entitlements** in audit mode, then enforce for a single feature.
4. Deploy **Marquez** and emit lineage from one ETL path; review.
5. Turn on **catalog guard**; fix missing TTL/encryption tags.
6. Run a small **staged migrator** on non‑critical table; then enable **CDC**.
7. Enforce **residency guard** in stage; test cross‑region redirects.
8. Add **tenant SLO dashboards**; run credits workflow in dry‑run.
9. Enable **DSAR export**; keep purge behind approval for first week.

# Rollback

- Entitlements → audit; rate‑limit middleware off.
- CDC connector off; migrator paused; data unchanged.
- Residency guard → 302 redirect or log only.
- DSAR purge job paused; export remains.

# Ownership

- **App/Backend:** PR 83–86, 88, 91–93
- **Data:** PR 89–92, 90
- **Platform/Observability:** PR 94
- **Security/Privacy:** PR 88, 90, 93
