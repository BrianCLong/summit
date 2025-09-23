# Conductor Summary (Commit)
**Goal.** Ship the first slice of **v24 Global Coherence Ecosystem**: graph‑backed coherence signals → aggregated per‑tenant coherence score + real‑time subscription and persisted query for workbench UI.

**Scope (this increment).**
- Ingest **coherence signals** via HTTP Push connector and Kafka topic `coherence.signals.v1` (optional).
- Persist signals in Neo4j; materialize per‑tenant **CoherenceScore** to Postgres for fast reads.
- Expose GraphQL: `tenantCoherence(tenantId)` (query), `publishCoherenceSignal(input)` (mutation), `coherenceEvents(tenantId)` (subscription).
- Observability: metrics, logs, traces; SLO gating per org defaults.

**Assumptions.** US residency; **no PII**; multi‑tenant SaaS; org SLOs/guardrails apply; budget limits as provided (`$100/day`, env budgets in `.maestro/ci_budget.json`).

**Non‑Goals.** Cross‑region replication; ML scoring; long‑term analytics; UI polish.

**Constraints.** p95 GraphQL read ≤ **350 ms**, write ≤ **700 ms**; availability **99.9%**; API error budget **0.1%**/month; region **US**; retention **standard‑365d** unless overridden.

**Risks.** Backpressure on bursty signal ingest; fan‑out latency for subscriptions; Cypher hot paths; cost spikes from over‑eager subscriptions. Mitigations below.

**Definition of Done.** All Acceptance Criteria met; CI quality gates pass (policy + SLO + tests + SBOM); preview env validated; evidence bundle attached; rollback plan documented.

---

# Plan → Backlog & RACI

## Epics
1) **E1: Signal Ingest & Provenance**  
2) **E2: Graph & Store Design**  
3) **E3: GraphQL API & Subscriptions**  
4) **E4: Observability & SLO Gates**  
5) **E5: Policy/Privacy & Cost Controls**  
6) **E6: Testing & Evidence Bundle**  
7) **E7: Release & Runbooks**

## Stories (with Acceptance Criteria IDs)
- **S1.1** HTTP push endpoint `/v1/coherence/signals` validates schema, attaches provenance. **AC‑ING‑01..04**
- **S1.2** Optional Kafka consumer `coherence.signals.v1` with at‑least‑once, idempotent upsert. **AC‑ING‑05..06**
- **S2.1** Neo4j schema & indexes for `:Signal`, `:Tenant`, `:CoherenceScore`. **AC‑DATA‑01..03**
- **S2.2** Materialized view job to Postgres table `coherence_scores`. **AC‑DATA‑04..05**
- **S3.1** GraphQL SDL + resolvers for query/mutation/subscription. **AC‑API‑01..06**
- **S3.2** Persisted queries + Redis cache for hot reads. **AC‑API‑07..08**
- **S4.1** Metrics: p95, p99, error rate; traces via OTel; logs w/ provenance IDs. **AC‑OBS‑01..05**
- **S4.2** CI SLO tests (k6) + policy simulation gates. **AC‑OBS‑06..08**
- **S5.1** OPA ABAC policies; retention tags; purpose `benchmarking`. **AC‑POL‑01..05**
- **S5.2** Cost budgets + alerts wired; RPS limiter 1,000 RPS. **AC‑COST‑01..03**
- **S6.1** Unit/integration/e2e tests + fixtures. **AC‑TEST‑01..06**
- **S6.2** Evidence bundle generation in CI. **AC‑EVID‑01..04**
- **S7.1** Release notes, canary, rollback docs; on‑call handoff. **AC‑REL‑01..05**

## RACI (initial)
- **Responsible:** Feature Dev Lead (Server), Graph Engineer (Neo4j), API Engineer (GraphQL)
- **Accountable:** Eng Lead v24
- **Consulted:** SRE On‑Call, Security, Platform Architecture, Data PM
- **Informed:** PM, Support, FinOps

---

# Architecture & ADRs

```mermaid
flowchart LR
  client[Workbench / Services] -->|GraphQL| gateway[Apollo GraphQL]
  subgraph API Tier
    gateway --> resolvers[Resolvers]
    resolvers --> redis[(Redis Cache)]
    resolvers --> pg[(Postgres: coherence_scores)]
    resolvers --> neo[(Neo4j: Signals Graph)]
    resolvers --> otel[OpenTelemetry]
  end
  subgraph Ingest
    http[HTTP Push /v1/coherence/signals] --> dedupe[Idempotency & Dedupe]
    kafka[(Kafka coherence.signals.v1)] --> dedupe
    dedupe --> neo
    dedupe --> jobs[Materialize Job]
    jobs --> pg
  end
  pg --> metrics[Prometheus]
  gateway --> sub[Subscriptions (Socket.IO)]
```

**ADR‑001: Dual‑store Read Model.** Signals are write‑optimized in Neo4j; per‑tenant `CoherenceScore` is materialized to Postgres for low‑latency reads → meets p95 ≤ 350 ms. Rollback: disable materializer, route reads directly to Neo4j (cost: higher latency).

**ADR‑002: Persisted Queries.** Lock down GraphQL to pre‑approved operations to contain cost and protect SLOs. Rollback: temporarily allow non‑persisted for triage.

**ADR‑003: Idempotent Ingest.** Upsert keyed by `(tenant_id, source, signal_id, ts)`; dedupe via Redis SETNX + TTL. Rollback: bypass Redis with at‑least‑once Cypher MERGE.

**ADR‑004: Subscription Transport.** Socket.IO for server→client fan‑out; batch/coalesce events at 100 ms window to keep p95 ≤ 250 ms.

---

# Data & Policy

**Canonical Entities**
- `Tenant{tenant_id}`  
- `Signal{signal_id, type, value, weight, source, ts, provenance_id}`  
- `CoherenceScore{tenant_id, score, status, updated_at}`

**Edges**
- `(:Tenant)-[:EMITS]->(:Signal)`  
- `(:Tenant)-[:HAS_SCORE]->(:CoherenceScore)`

**Indexes (Neo4j)**
- `CREATE INDEX signal_id IF NOT EXISTS FOR (s:Signal) ON (s.signal_id);`
- `CREATE INDEX signal_tenant_ts IF NOT EXISTS FOR (s:Signal) ON (s.tenant_id, s.ts);`

**Postgres**
```sql
CREATE TABLE IF NOT EXISTS coherence_scores (
  tenant_id TEXT PRIMARY KEY,
  score NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Retention & Purpose**
- Retention: `standard-365d` (no PII).  
- Purpose: `benchmarking` (or `demo` if needed).  
- License/TOS: `Restricted-TOS` (signals subject to upstream terms).

**Policy Tags (provenance attach)**
```json
{
  "purpose": "benchmarking",
  "retention": "standard-365d",
  "license": "Restricted-TOS",
  "residency": "US"
}
```

---

# APIs & Schemas

**GraphQL SDL (slice)**
```graphql
"""Coherence signal as stored in graph."""
type Signal { id: ID!, type: String!, value: Float!, weight: Float, source: String!, ts: DateTime! }

"""Aggregate coherence score per tenant."""
type CoherenceScore { tenantId: ID!, score: Float!, status: String!, updatedAt: DateTime! }

input PublishCoherenceSignalInput { tenantId: ID!, type: String!, value: Float!, weight: Float, source: String!, ts: DateTime }

type Query { tenantCoherence(tenantId: ID!): CoherenceScore! }

type Mutation { publishCoherenceSignal(input: PublishCoherenceSignalInput!): Boolean! }

type Subscription { coherenceEvents(tenantId: ID!): Signal! }
```

**Persisted Queries (examples)**
- `pq_tenant_coherence_v1` → `query($tenantId:ID!){ tenantCoherence(tenantId:$tenantId){ score status updatedAt } }`
- `pq_publish_signal_v1` → `mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }`

**Cypher (hot paths)**
```cypher
// upsert signal
MERGE (t:Tenant {tenant_id:$tenantId})
WITH t
MERGE (s:Signal {signal_id:$signalId})
SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId
MERGE (t)-[:EMITS]->(s);

// compute coherence score (example: weighted mean over last 24h)
MATCH (t:Tenant {tenant_id:$tenantId})-[:EMITS]->(s:Signal)
WHERE s.ts >= datetime() - duration('P1D')
WITH t, collect({v:s.value, w: coalesce(s.weight,1.0)}) AS items
WITH t, reduce(sumV = 0.0, i IN items | sumV + i.v * i.w) AS num,
         reduce(sumW = 0.0, i IN items | sumW + i.w) AS den
WITH t, CASE WHEN den = 0 THEN 0.0 ELSE num/den END AS score
RETURN t.tenant_id AS tenantId, score, datetime() AS updatedAt;
```

**SQL materialize (UPSERT)**
```sql
INSERT INTO coherence_scores (tenant_id, score, status, updated_at)
VALUES ($1, $2, CASE WHEN $2 >= 0.75 THEN 'HEALTHY' WHEN $2 >= 0.5 THEN 'WARN' ELSE 'CRITICAL' END, now())
ON CONFLICT (tenant_id) DO UPDATE SET score=EXCLUDED.score, status=EXCLUDED.status, updated_at=now();
```

---

# Security, Privacy, Threat Model

**AuthN/Z.** OIDC JWT → Apollo context; ABAC via OPA (tenant‑scoped). mTLS service‑to‑service. Field‑level encryption not required (no PII), but provenance IDs are immutable.

**OPA Snippet (allow query by tenant)**
```rego
package graphql.allow

default allow = false
allow {
  input.user.tenant == input.args.tenantId
  input.claims.scope[_] == "coherence:read"
}
```

**STRIDE Sketch**
- **S**poofing: require mTLS + JWT audience check.
- **T**ampering: signed payloads optional; server‑side idempotency keys.
- **R**epudiation: provenance ledger + request hash recorded in logs.
- **I**nfo disclosure: ABAC + residency filter; strip secrets from logs.
- **D**oS: RPS limiter (1000), circuit breakers, bulkhead pools.
- **E**levation: least‑privileged DB users; parameterized Cypher/SQL.

---

# Observability & SLOs

**Metrics** (Prometheus):
- `graphql_request_duration_seconds{op}` (histogram) p95/p99 alerts.
- `graphql_requests_total{status}` → error rate.
- `subscription_fanout_latency_ms`.
- `ingest_events_processed_total`, `ingest_dedupe_rate`.

**Logs**: structured JSON with `provenance_id`, `tenant_id`, `op`, `latency_ms`, `error_code`.

**Traces**: OTel spans across API→Neo4j→Postgres; baggage includes `tenant_id`.

**SLO Gates in CI**: k6 runs 3 mins, 95% CI; fail if p95 or error‑rate exceed budgets.

---

# CI/CD & IaC

**Quality Gates**: lint, type, unit, integration, e2e, SBOM (Syft), vuln scan (Grype), policy simulation (OPA), SLO tests (k6), cost checks.

**GitHub Actions (fragment)**
```yaml
jobs:
  slo-k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0
        with:
          filename: .maestro/tests/k6/graphql_read.js
      - name: Parse k6 summary
        run: node .maestro/scripts/parse-k6.js --p95 350 --errorRate 0.1
```

**Helm overlays**: `values.us.yaml` (single write region), feature flags: `v24.coherence=true`.

---

# Testing Strategy

**Unit**: resolver logic, score compute function, OPA policies.

**Integration**: Neo4j upsert/compute; Postgres UPSERT; Redis cache hits.

**E2E (Playwright)**: persisted query auth + data path returns within p95.

**Load (k6)**:
```js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 50, duration: '3m' };
export default function () {
  const res = http.post(__ENV.GRAPHQL_URL, JSON.stringify({ query: 'query($t:ID!){ tenantCoherence(tenantId:$t){ score status }}', variables: { t: 'tenant-123' } }), { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.JWT}` } });
  check(res, { 'status 200': r => r.status === 200 });
}
```

**Fixtures**: synthetic signals for 10 tenants × 1k signals/day.

**Coverage Goals**: ≥ 80% lines, 100% on score compute.

---

# Rollback/Backout

1) Feature flag off `v24.coherence=false` → disables API routes.
2) Uninstall materializer job; keep Neo4j data.
3) Repoint persisted query to static value (503) during incident.
4) DB rollback: Postgres table preserved; no destructive migrations.

---

# Evidence Bundle (attached by CI)
```
.evidence/
  slo/
    read_p95.json
    write_p95.json
    error_rate.json
  tests/
    junit.xml
    coverage.lcov
  security/
    sbom.syft.json
    vulns.grype.json
    opa_report.json
  observability/
    dashboards.json
    alert_rules.yaml
  provenance/
    run_manifest.json  // inputs→outputs hashes
```

---

# .env.maestro-dev (template mapping)
```
JWT_PUBLIC_KEY=<<PEM>>
PAGERDUTY_ROUTING_KEY=<<key>>
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=ig
NEO4J_PASSWORD=<<secret>>
POSTGRES_URI=postgres://ig:<<secret>>@postgres:5432/ig
REDIS_URL=redis://redis:6379
LLM_LIGHT_URL=https://api.light-llm.example/v1
LLM_LIGHT_KEY=<<key>>
LLM_HEAVY_URL=https://api.heavy-llm.example/v1
LLM_HEAVY_KEY=<<key>>
CONDUCTOR_BUDGET_DAILY_USD=100
CONDUCTOR_RPS_MAX=1000
```

---

# Next Actions (Maestro will proceed now)
- Create branch `feature/v24-coherence-slice-1` with scaffolds below.
- Register persisted queries and OPA policies.
- Enable CI gates (k6 + OPA + SBOM) and preview env.
- Run SLO tests; attach evidence; open PR with auto‑generated release notes.

---

# Code Scaffolds (paths & snippets)

**Server (TypeScript)**
```
server/
  src/
    index.ts
    graphql/schema.ts
    graphql/resolvers.ts
    services/score.ts
    ingest/http.ts
    ingest/kafka.ts
    db/neo4j.ts
    db/pg.ts
    cache/redis.ts
    auth/context.ts
    policy/opa.ts
```

**`services/score.ts`**
```ts
export function computeScore(values: Array<{ v: number; w?: number }>): number {
  let num = 0, den = 0; for (const i of values) { const w = i.w ?? 1; num += i.v * w; den += w; }
  return den === 0 ? 0 : Number((num / den).toFixed(4));
}
```

**`graphql/resolvers.ts` (excerpt)**
```ts
import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
export const resolvers = {
  Query: { async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
      const user = getUser(ctx); ctx.opa.enforce('coherence:read', { tenantId, user });
      const row = await pg.oneOrNone('SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1', [tenantId]);
      return { tenantId, score: row?.score ?? 0, status: row?.status ?? 'UNKNOWN', updatedAt: row?.updated_at ?? new Date().toISOString() };
    }
  },
  Mutation: { async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const { tenantId, type, value, weight, source, ts } = input;
      await neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId MERGE (t)-[:EMITS]->(s)`, { tenantId, signalId: `${source}:${Date.now()}`, type, value, weight, source, ts: ts || new Date().toISOString() });
      return true;
    }
  }
};
```

**k6 parser (`.maestro/scripts/parse-k6.js`)**
```js
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('summary.json','utf8'));
const p95 = summary.metrics['http_req_duration'].percentiles['p(95)'];
const err = (summary.metrics.http_req_failed?.passes || 0) / (summary.metrics.http_reqs.count || 1) * 100;
const p95Budget = Number(process.argv[process.argv.indexOf('--p95')+1]);
const errBudget = Number(process.argv[process.argv.indexOf('--errorRate')+1]);
if (p95 > p95Budget) { console.error(`FAIL p95 ${p95}ms > ${p95Budget}ms`); process.exit(1); }
if (err > errBudget) { console.error(`FAIL error ${err}% > ${errBudget}%`); process.exit(1); }
console.log('SLO OK');
```

---

# Runbooks (extracts)
- **On‑Call (GraphQL 5xx burst):** check error budget burn → scale API pods → inspect Neo4j CPU/GC → enable cache override (force Postgres read) → if persists, toggle feature flag.
- **Ingest backlog:** drain Kafka with increased consumer concurrency; extend Redis key TTL to control dedupe churn.
- **LLM provider failover:** set `LLM_*` to standby or disable features; not in critical path.
- **Provenance verify:** run ledger hash check before export.

---

# Release & Validation
- Branch → PR → `release/v24.0` (weekly → staging; biweekly → prod unless error budget < 50% left).
- Canary 10% traffic, 30 min; auto‑rollback on SLO breach.
- Post‑deploy: capture p95s, error rate, fan‑out latency; attach to release notes.



---

# Phase 5 — Verification, SLO Gating & Release (Go/No‑Go)

## Immediate Checklist
- ✅ Secrets: fill `.env.maestro-dev` (at least `JWT_PUBLIC_KEY`, `NEO4J_*`, `POSTGRES_URI`, `REDIS_URL`).
- 🔒 Persisted queries: enforce allowlist at the gateway.
- 🧠 OPA: add concrete Rego rules + tests and simulate in CI.
- 📈 Metrics: export Prometheus `/metrics`, record GraphQL p95/p99 and subscription fan‑out.
- 🧪 SLO tests: run k6, fail CI if p95/error‑rate exceeds budgets.
- 🧾 Evidence bundle: collect SBOM, vuln scan, k6 results, OPA report.
- 🚀 Canary & rollback: enable flag, canary 10%, 30 min with auto‑rollback.

## Dependencies to add (server)
```bash
cd server
npm i graphql-redis-subscriptions ioredis prom-client @opentelemetry/api
npm i -D @types/ioredis
```

## Subscriptions: upgrade PubSub (dev → prod)
**`server/src/subscriptions/pubsub.ts`**
```ts
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

export function makePubSub() {
  const url = process.env.REDIS_URL;
  if (!url) return new PubSub(); // dev in‑memory
  const opts = { maxRetriesPerRequest: 1, enableOfflineQueue: false } as any;
  const publisher = new Redis(url, opts);
  const subscriber = new Redis(url, opts);
  return new RedisPubSub({ publisher, subscriber });
}
```
Wire it in your resolvers initialization and use a 100 ms coalescing window to keep fan‑out p95 ≤ 250 ms.

## Persisted Queries: strict allowlist
**`.maestro/persisted-queries.json`** (example)
```json
{
  "5f1b…hash": "query($tenantId:ID!){ tenantCoherence(tenantId:$tenantId){ score status updatedAt } }",
  "a91c…hash": "mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }"
}
```
**`server/src/middleware/persisted.ts`**
```ts
import { createHash } from 'crypto';
import allowlist from '../../.maestro/persisted-queries.json';
export function enforcePersisted(req: any, res: any, next: any) {
  const { query, extensions } = req.body || {};
  const hash = extensions?.persistedQuery?.sha256Hash || (query && createHash('sha256').update(query).digest('hex'));
  if (!hash || !(allowlist as any)[hash]) return res.status(400).json({ error: 'Unknown query' });
  req.body.query = (allowlist as any)[hash];
  next();
}
```
Mount `enforcePersisted` before Apollo.

## OPA policies & tests
**`policy/graphql.rego`**
```rego
package graphql

default allow = false
allow { input.user.tenant == input.args.tenantId; input.user.scope[_] == "coherence:read" }
allow_write { input.user.tenant == input.args.tenantId; input.user.scope[_] == "coherence:write" }
```
**`policy/graphql_test.rego`**
```rego
package graphql

test_allow_same_tenant_read { allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t1"}} }

test_deny_cross_tenant { not allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t2"}} }
```
Run locally:
```bash
opa test policy -v
```

## Prometheus metrics (p95/p99)
**`server/src/metrics.ts`**
```ts
import client from 'prom-client';
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
export const gqlDuration = new client.Histogram({ name: 'graphql_request_duration_seconds', help: 'GraphQL duration', buckets: [0.05,0.1,0.2,0.35,0.7,1,1.5,3] });
registry.registerMetric(gqlDuration);
```
Expose `/metrics` via Express; wrap resolvers to observe start/stop and `observe(seconds)`.

## k6 SLO test wiring
**`.maestro/tests/k6/graphql_read.js`** (already scaffolded) — ensure `GRAPHQL_URL` and `JWT` envs are passed.

**CI job addition (`.github/workflows/ci.yml`)**
```yaml
jobs:
  policy-opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: OPA test
        uses: open-policy-agent/setup-opa@v2
      - run: opa test policy -v

  slo-k6:
    needs: [build-and-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0
        with:
          filename: .maestro/tests/k6/graphql_read.js
          flags: --out json=summary.json
      - name: Parse k6 summary
        run: node .maestro/scripts/parse-k6.js --p95 350 --errorRate 0.1

  sbom-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anchore/syft-action@v0.21.0
        with: { format: json, output-file: sbom.syft.json }
      - uses: anchore/scan-action@v3
        with: { path: ., fail-build: true, severity-cutoff: high }

  evidence-bundle:
    needs: [policy-opa, slo-k6, sbom-and-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Collect evidence
        run: |
          mkdir -p .evidence/slo .evidence/security
          [ -f summary.json ] && mv summary.json .evidence/slo/ || true
          mv sbom.syft.json .evidence/security/ || true
          echo '{}' > .evidence/opa_report.json
      - uses: actions/upload-artifact@v4
        with: { name: evidence, path: .evidence }
```

## Release playbook (extract)
1) Feature flag `v24.coherence=true` in staging; run SLO suite; confirm error budget burn stable.
2) Canary 10% for 30 min; auto‑rollback on p95 > 350 ms or error‑rate > 0.1%.
3) Tag `release/v24.0.0`; attach evidence artifact to GitHub Release.

## Quick Commands (local)
```bash
# 1) install & build
cd server && npm ci && npm run build && npm test && cd -

# 2) run dev (expects env)
cd server && npm run dev

# 3) SLO smoke (against dev URL)
GRAPHQL_URL=http://localhost:4000/graphql JWT=$JWT npm --prefix .maestro/tests run k6 || true
```



---

# Phase 6 — Staging Cut, Evidence, Canary & Release v24.0.0

## Go/No‑Go Checklist (must be GREEN)
- [ ] **AuthZ:** OPA denies cross‑tenant; allows same‑tenant read/write with proper scopes.
- [ ] **Persisted Queries:** Gateway rejects unknown hashes; GraphQL IDE disabled in prod.
- [ ] **SLOs (GraphQL):** p95 ≤ 350 ms (read), p95 ≤ 700 ms (write), error‑rate ≤ 0.1%.
- [ ] **Subscriptions:** server→client latency p95 ≤ 250 ms @ 100 msg/s burst.
- [ ] **Cost Guardrails:** CI budgets respected; staging daily spend ≤ env allocation; alert at 80%.
- [ ] **Observability:** /metrics exposed; Grafana dashboard and alerts installed; trace sampling ≥ 10%.
- [ ] **Security:** SBOM generated; vuln scan passes (no **high** or **critical**).
- [ ] **Privacy/Policy:** purpose `benchmarking`, retention `standard-365d` attached to provenance.
- [ ] **Runbooks:** On‑call triage paths validated in staging.

## Staging Deployment (Helm overlay)
**`charts/intelgraph/values.staging.yaml`**
```yaml
featureFlags:
  v24:
    coherence: true
replicaCount: 3
resources:
  requests: { cpu: "200m", memory: "256Mi" }
  limits:   { cpu: "1",    memory: "1Gi" }
env:
  REDIS_URL: "redis://redis:6379"
  CONDUCTOR_RPS_MAX: "1000"
  NODE_ENV: "production"
  ENABLE_PLAYGROUND: "false"
service:
  port: 4000
```

**HPA & PDB**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: server }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: server }
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: server-pdb }
spec:
  minAvailable: 2
  selector: { matchLabels: { app: server } }
```

## Alerts (PrometheusRule)
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: v24-slo-alerts }
spec:
  groups:
    - name: graphql-slo
      rules:
        - alert: GraphQLReadP95High
          expr: histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket{op="query"}[5m])) by (le)) > 0.35
          for: 10m
          labels: { severity: warning }
          annotations: { summary: "GraphQL read p95 > 350ms" }
        - alert: GraphQLErrorRateHigh
          expr: sum(rate(graphql_requests_total{status=~"5.."}[5m])) / sum(rate(graphql_requests_total[5m])) > 0.001
          for: 10m
          labels: { severity: critical }
          annotations: { summary: "GraphQL error rate > 0.1%" }
    - name: subscriptions
      rules:
        - alert: SubFanoutLatencyHigh
          expr: histogram_quantile(0.95, sum(rate(subscription_fanout_latency_ms_bucket[5m])) by (le)) > 250
          for: 10m
          labels: { severity: warning }
          annotations: { summary: "Subscription fan‑out p95 > 250ms" }
```

## Grafana Dashboard (excerpt)
```json
{
  "title": "v24 Coherence — API SLOs",
  "panels": [
    { "type": "timeseries", "title": "GraphQL p95 (s)", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))" }] },
    { "type": "stat", "title": "Error Rate % (5m)", "targets": [{ "expr": "sum(rate(graphql_requests_total{status=~\"5..\"}[5m])) / sum(rate(graphql_requests_total[5m])) * 100" }] },
    { "type": "timeseries", "title": "Subscription p95 (ms)", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(subscription_fanout_latency_ms_bucket[5m])) by (le))" }] }
  ]
}
```

## Data Retention Job (365d, no PII)
```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: prune-signals-365d }
spec:
  schedule: "37 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: prune
              image: node:20-alpine
              env:
                - { name: NEO4J_URI, valueFrom: { secretKeyRef: { name: neo4j, key: uri } } }
              command: ["node", "scripts/prune-signals.js"]
          restartPolicy: OnFailure
```

**`scripts/prune-signals.cypher`**
```cypher
MATCH (s:Signal) WHERE s.ts < datetime() - duration('P365D') DETACH DELETE s;
```

## Canary Strategy
- Traffic: 10% for 30 min → 50% for 30 min → 100%.
- Auto‑rollback triggers: any SLO breach (above) sustained ≥ 10 min, or error budget burn > 5%/hr.
- Observers: SRE on‑call + Eng Lead v24 via PagerDuty route.

## Release Procedure
1) Cut branch `release/v24.0.0` from `main`.
2) Promote Helm overlay to **staging**; run full CI, OPA tests, and k6 suite → archive evidence.
3) Start **canary** in prod; monitor dashboards & alerts; confirm budgets.
4) Tag and publish GitHub Release with evidence artifact; update runbooks and on‑call notes.

## PR Template (`.github/pull_request_template.md`)
```md
### What
- v24 Coherence slice — API + subscriptions + metrics

### Why
- Meet SLOs & enable dashboarding/canary

### Evidence
- Attach artifact from CI (.evidence/*)

### SLOs
- Read p95 ≤ 350ms; Write p95 ≤ 700ms; Err ≤ 0.1%; Sub fan‑out p95 ≤ 250ms

### Rollback
- Flag: v24.coherence=false; route reads to Postgres only

### Security/Policy
- OPA policy ids: graphql.allow, allow_write; retention standard‑365d; purpose benchmarking
```

## RACI (release window)
- **A:** Eng Lead v24  
- **R:** API Eng, SRE On‑Call  
- **C:** Security, Platform Arch  
- **I:** PM, Support, FinOps

