# IntelGraph · Maestro Conductor (MC)
# Workstream: SDLC Orchestration & Evidence
# Sprint: 2025‑09‑30 → 2025‑10‑14 (01)

> Mission: Close gaps and ship clean, green, functional increments that align with existing sprints, with auditable provenance and SLO/cost guardrails enforced as CI quality gates.

---

## Conductor Summary (One‑Screen)
**Goal.** Establish enforceable guardrails (SLOs, costs, policies) and end‑to‑end evidence so other workstreams can ship against a stable platform. Deliver a runnable GraphQL gateway slice with provenance hooks, baseline OPA/ABAC, tracing, CI gates, and golden test data.

**Assumptions.**
- Repo contains a monorepo (server, frontend, infra) plus sprint docs; some assets may be incomplete or out‑of‑date.
- Multi‑tenant SaaS topology; Neo4j + Postgres; Apollo GraphQL; React; OpenTelemetry; Helm.
- Error budgets and cost limits per Org Defaults.

**Non‑Goals.** Feature UI polish, complex analytics, or novel ML models.

**Constraints.**
- P95/99 latency targets as defined; budgets per env.
- Weekly release cadence to staging; biweekly to prod.

**Risks.**
- Gaps in provenance & policy reasoner; flaky CI; missing performance baselines; schema drift.

**Definition of Done.**
- CI/CD enforces SLO & policy gates; evidence bundle/artifacts published per release tag.
- Gateway slice runs locally (docker compose) with ABAC, tracing, rate limits, and golden tests green.
- Observability dashboards and k6 baselines committed; burn alerts wired.

---

## Observed / Expected Gaps (MC Ambit)
1) **SLOs not enforced as gates.** CI runs tests but doesn’t fail on p95 regressions or budget burn.
2) **Provenance/evidence sparse.** No signed manifests tying source→build→artifact→deploy.
3) **Policy reasoning ad‑hoc.** OPA/ABAC rules not centralized or lacking purpose/retention checks.
4) **Tenant isolation checks.** Missing automated cross‑tenant leak tests and data minimization tests.
5) **Schema governance.** GraphQL/SQL/Cypher not versioned with checks for breaking changes.
6) **Golden datasets.** Incomplete/absent fixtures for repeatable E2E and load tests.
7) **Cost guardrails.** No dashboards/alerts vs unit targets; no CI budget simulation.
8) **Operational runbooks.** Triage guides and rollback playbooks incomplete.
9) **Security basics.** Secret scanning/SBOM present but not enforced; WebAuthn missing; SCIM incomplete.
10) **DR/residency.** Region‑shard overlays not wired; export signing not validated.

> If these already exist in your repo, this sprint codifies, wires, and proves them green with evidence.

---

## Sprint Plan (02‑week) — Epics → Stories → Tasks (MoSCoW)

### EPIC A — Guardrails as Code (Must)
**A1. CI SLO Gate**  
- Add k6 smoke & baseline stage; parse p95/99; fail if > thresholds.  
- Wire error‑budget burn calc (synthetic + integration logs).  
**Acceptance:** PR fails when p95 regression detected; report uploaded.

**A2. Cost Gate**  
- Add unit‑cost simulators (GraphQL per call; ingest per 1k events) using sampled traces.  
- Alert at 80% of env budget via GitHub Check + Slack webhook.  
**Acceptance:** Budget check present on PR; Slack alert demoed.

**A3. Policy Gate**  
- OPA policy‑sim stage: purpose tags, retention class, license/TOS compatibility.  
**Acceptance:** Deny on missing purpose/retention annotations; report artifact.

### EPIC B — Evidence & Provenance (Must)
**B1. SBOM + SLSA**  
- Syft SBOM; Cosign attestations; SLSA provenance in GitHub Releases.  
**Acceptance:** Signed SBOM & provenance attached to tag vX.Y.Z.

**B2. Provenance Ledger Hook**  
- Append build/deploy events with hashes to immutable ledger (file‑backed or PG table).  
**Acceptance:** Viewable build→image→deploy chain.

### EPIC C — Secure Gateway Slice (Must)
**C1. Apollo Gateway + ABAC**  
- Express/Apollo TS service with OIDC/JWT, tenant ABAC via OPA sidecar, mTLS in dev.  
**Acceptance:** End‑to‑end request authorized/denied per tenant & purpose.

**C2. Observability**  
- OpenTelemetry traces/logs/metrics; exemplars to Prometheus; Grafana dashboards.  
**Acceptance:** Trace shows auth→Neo4j→PG hops; SLO panels present.

**C3. Rate Limits + Backpressure**  
- Token bucket per tenant; 429 with Retry‑After; persisted queries.  
**Acceptance:** k6 shows safe degradation under load.

### EPIC D — Data & Schema Governance (Should)
**D1. GraphQL Schema Lint & Diff**  
- Checks for breaking changes and pagination/backpressure requirements.  
**D2. SQL/Cypher Migrations**  
- Declarative migrations; index hints; tenancy labels; data minimization.

### EPIC E — Tests & Golden Data (Must)
**E1. Fixtures**  
- Tenants: alpha, beta; Users: admin, analyst; Data: 1‑hop & 3‑hop graphs.  
**E2. E2E (Playwright) + Contract (Jest)**  
- Auth flows, ABAC, persisted queries, redaction.

### EPIC F — Ops Runbooks & DR (Could)
**F1. On‑Call Triage**  
- 5xx bursts, ingest backlog, GC/memory, replica lag.  
**F2. Export Signing**  
- Detached signature verification flow and hash manifests.


---

## Acceptance Criteria & Verification
1. **CI Gates:**
   - k6 baseline: API p95 ≤ 350ms, writes p95 ≤ 700ms; fail build on exceedance.  
   - OPA policy sim: all resources labeled with `purpose`, `retention`, `licenseClass`.  
   - SBOM present for all published images; Cosign verify in pipeline.
2. **Gateway Slice:**
   - OIDC login → JWT → ABAC allow/deny proven by tests; mTLS between services.  
   - Persisted queries only in prod builds.  
3. **Observability:**
   - Grafana shows SLO burn, latency histograms, error rates; alerts at 80% budget.
4. **Golden Data:**
   - `fixtures/` provides reproducible seed; E2E + k6 use same seed.

---

## Architecture (Mermaid)
```mermaid
flowchart TD
  subgraph Client
    UI[React App]
  end
  UI -->|GraphQL| GW[Apollo Gateway (Express/TS)]
  GW -->|OPA Query| OPA[(OPA sidecar)]
  GW -->|OpenTelemetry| OTEL[(Collector)]
  GW -->|Neo4j Driver| NEO[(Neo4j Cluster)]
  GW -->|PG Pool| PG[(PostgreSQL)]
  OTEL --> PRM[(Prometheus)]
  PRM --> GRAF[(Grafana)]
  GW --> REDIS[(Redis)]
  subgraph CI/CD
    CI[GitHub Actions]
    REG[(OCI Registry)]
    COS[Cosign]
  end
  CI --> REG
  REG --> COS
  CI -->|SBOM| COS
  CI --> LEDGER[(Provenance Ledger)]
```

---

## Data & Policy
**Canonical Entities**
- Tenant(id, region, retentionTier, licenseClass) — Retention default `standard-365d`.
- User(id, tenantId, roles[], purposeTags[]).
- Asset(id, tenantId, labels{}, piiFields[], tosClass, purpose, retention).

**Edges**
- RELATES_TO(Asset↔Asset) with tenancy + purpose propagation.

**Policy Rules (seed)**
- Deny cross‑tenant without `authorityBinding` + warrant tag.  
- Retention class enforced at write/read; PII → `short-30d` unless legal‑hold.  
- License/TOS compatibility check at ingest/export.

---

## APIs & Schemas
**GraphQL SDL (slice)**
```graphql
"""Tenant‑scoped viewer context"""
type Viewer { tenantId: ID!, roles: [String!]!, purposes: [String!]! }

type Query {
  me: Viewer!
  asset(id: ID!): Asset @authz(purpose: "investigation")
  searchAssets(q: String!, limit: Int = 25, cursor: String): AssetConnection!
}

type Mutation {
  createAsset(input: AssetInput!): Asset!
}

type Asset { id: ID!, tenantId: ID!, labels: JSON, pii: Boolean, createdAt: String! }

input AssetInput { labels: JSON, pii: Boolean, purpose: String }

type AssetConnection { edges: [Asset!]!, nextCursor: String }
```

**Cypher Hints**
```cypher
CREATE INDEX asset_id IF NOT EXISTS FOR (a:Asset) ON (a.id);
CREATE INDEX asset_tenant IF NOT EXISTS FOR (a:Asset) ON (a.tenantId);
// Scoped read\.MATCH (a:Asset {id: $id, tenantId: $tenantId}) RETURN a LIMIT 1;
```

**SQL (Postgres)**
```sql
CREATE TABLE IF NOT EXISTS provenance_ledger (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  meta JSONB NOT NULL
);
```

---

## Security & Privacy
- **AuthN:** OIDC + JWT; WebAuthn for step‑up on export actions.  
- **AuthZ:** ABAC via OPA; policy bundles versioned; default‑deny; purpose limitation enforced.  
- **Encryption:** mTLS service‑to‑service; field‑level crypto for sensitive attributes.  
- **Audit:** Immutable ledger entries for high‑risk actions (export, cross‑tenant).  
- **SCIM:** Baseline `/scim/v2/Users` for provisioning.

---

## Observability & SLOs
Metrics: request latency histograms (API, Neo4j, PG), error rates, rate‑limit counters, cache hit/miss, queue depth, budget burn.  
Logs: structured, requestId, tenantId, purpose, decisionId (OPA).  
Traces: GW → OPA → DB hops with attributes for tenant/purpose.

Dashboards: p95/p99 by route, error budgets, cost per call, ingest throughput.

Alerts: burn ≥ 80%, 5xx surge, p95 > SLO for 10m, queue depth > N.

---

## CI/CD & IaC Snippets

### GitHub Actions — CI (extract)
```yaml
name: ci
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test -- --ci
      - name: SBOM
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b .
          ./syft packages dir:. -o spdx-json > sbom.spdx.json
      - name: Build
        run: docker build -t ${{ github.sha }} .
      - name: Cosign Sign
        run: cosign sign --key env://COSIGN_KEY ${{ github.sha }}
      - name: k6 Baseline
        uses: grafana/k6-action@v0.2.0
        with: { filename: tests/load/baseline.k6.js }
      - name: Enforce SLOs
        run: node scripts/enforce-slo.js k6-results.json
      - name: OPA Policy Sim
        run: node scripts/policy-sim.js policies/ ./reports/policy.json
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with: { name: evidence, path: "sbom.spdx.json reports/**" }
```

### Helm Overlay — Region Shard (extract)
```yaml
# values-region-us.yaml
router:
  env:
    PRIMARY_REGION: us-east-1
    READ_REPLICAS: us-west-2
```

### k6 Baseline (extract)
```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 10, duration: '2m', thresholds: {
  http_req_duration: ['p(95)<350','p(99)<900']
}};
export default function () {
  const q = JSON.stringify({query: 'query { me { tenantId } }'});
  const res = http.post(__ENV.GRAPHQL_URL, q, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': r => r.status === 200 });
  sleep(0.5);
}
```

### Playwright E2E (extract)
```ts
import { test, expect } from '@playwright/test';

test('tenant isolation', async ({ request }) => {
  const res = await request.post('/graphql', { data: { query: '{ me { tenantId } }' }, headers: { Authorization: 'Bearer TENANT_ALPHA' } });
  expect(res.ok()).toBeTruthy();
  const res2 = await request.post('/graphql', { data: { query: '{ asset(id:"beta-1"){ id } }' }, headers: { Authorization: 'Bearer TENANT_ALPHA' } });
  expect(res2.status()).toBe(403);
});
```

### OPA Policy (extract)
```rego
package intelgraph.authz

default allow = false
allow {
  input.tenant == input.resource.tenant
  input.purpose == input.resource.purpose
}
deny_reason[msg] { not allow; msg := "tenant or purpose mismatch" }
```

### Apollo Gateway (extract)
```ts
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './schema';
import { authn, authz } from './middleware';
import { telemetry } from './otel';

const app = express();
app.use(telemetry());
app.use(authn());

const server = new ApolloServer({ typeDefs, resolvers, nodeEnv: process.env.NODE_ENV });
await server.start();
app.use('/graphql', authz(), expressMiddleware(server));
app.listen(process.env.PORT || 4000);
```

---

## Runbooks (extract)
**Deploy/Upgrade**: Canary 10% → 50% → 100%; watch SLO panels; auto‑rollback on p95 + error rate breach.

**On‑Call Triage**: If 5xx spikes: check database health → rate limit counters → OPA decisions → recent deploy diff; enable feature flag kill‑switch.

**Neo4j Health**: Check cluster role, apply index; run `CALL dbms.components()`; failover docs linked.

**Provenance Verify**: Download tag assets, verify Cosign; compare hash to ledger; reconcile.

---

## Release Notes Template
```
Version: vX.Y.Z (2025‑10‑14)
Type: Minor/Feature/Hotfix

Highlights
- [ ] CI gates (SLO, cost, policy) — enabled by default.
- [ ] Gateway slice with ABAC + OTel.
- [ ] Golden fixtures + E2E + k6 baseline.

Evidence
- SBOM: sbom.spdx.json (sha256: …)
- k6: reports/k6-baseline.json
- Policy: reports/policy.json
- Provenance: ledger entry #
```

---

## RACI Snapshot (initial)
- **Responsible:** MC (this workstream), Platform Eng (gateway, CI), SRE (observability), SecOps (OPA/SCIM), Data Eng (fixtures), QA (E2E/load).
- **Accountable:** Head of Platform.
- **Consulted:** Product, Legal/Privacy, Cost FinOps.
- **Informed:** All workstream leads.

---

## Backlog (Detailed)
- See Epics above; tasks broken into tickets prefixed `MC‑01` through `MC‑36` with dependencies: A1→B1→C1; D1/E1 parallel; F after C completes.

---

## Next Steps (Kickoff Checklist)
- [ ] Create repo folders: `gateway/`, `policies/`, `tests/`, `fixtures/`, `scripts/`, `helm/`, `dashboards/`.
- [ ] Land CI + k6 + OPA + SBOM scaffolds.
- [ ] Wire Grafana dashboards & alerts.
- [ ] Cut `release/v0.1` to staging with evidence bundle.

---

## Provenance Manifest (format)
```json
{
  "source": { "git": { "commit": "<sha>", "branch": "main" } },
  "build": { "image": "<registry>/<repo>:<sha>", "sbom": "sha256:<digest>" },
  "tests": { "k6": "sha256:<digest>", "e2e": "sha256:<digest>" },
  "policies": { "opaBundle": "sha256:<digest>" },
  "deploy": { "env": "staging", "helmChart": "<ver>", "values": "sha256:<digest>" }
}
```

---

## Notes
- This sprint intentionally creates *enablement* and *proof* that other sprints can rely on. If any of these capabilities already exist in your repo, adopt their names/paths and use this sprint to wire enforcement + evidence rather than duplication.

