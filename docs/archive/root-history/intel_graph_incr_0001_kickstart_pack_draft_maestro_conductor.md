# INCR-0001 Kickstart Pack — IntelGraph (Draft)

> **Purpose:** Create a shippable end‑to‑end slice with evidence, guardrails, and quality gates. Update all `TBD` fields with your specifics — Maestro will treat them as authoritative.

---

## 0) Conductor Summary

**Goal (proposed):** Deliver an end‑to‑end “Hello Tenants” slice: **CSV→Ingest→Neo4j→GraphQL Gateway (persisted queries)→Web** with ABAC/OPA, metrics, SLO/cost gates, and runbooks.

**Outcome metric:**

- Graph operations: **1‑hop neighborhood p95 ≤ 300 ms**; 2–3 hop filtered path p95 ≤ 1,200 ms (default SLOs).
- API Gateway: reads p95 ≤ 350 ms, writes p95 ≤ 700 ms; **99.9% monthly availability**.

**Scope (this increment):**

- **Must:** Single-tenant demo path (`tenant: demo`) with ABAC boundaries; S3/CSV ingestion; minimal entity/edge model; 3 persisted queries; dashboards & on‑call runbook; CI gates (lint, tests, SBOM, policy sim, SLO budget checks).
- **Should:** Depth/complexity limits; rate limiting; provenance export manifest; canary + rollback.
- **Won’t:** Multi‑region DR, advanced ER models, ML enrichers.

**Constraints:** Single primary region; cost ≤ **$1,200/mo dev** (default); freeze windows honored; weekly release cut.

**Risks:** Data quality/duplication; scope creep; latency regressions under load; policy misconfiguration.

**Definition of Done:**

- Demo tenant can ingest a CSV and answer 3 persisted queries via Gateway; SLO dashboards green for 24h; on‑call can deploy/rollback from runbook; evidence bundle attached to tag `v0.1.0`.

---

## 1) Minimal Inputs Needed From You

- **Outcome & metric (3 sentences):** `TBD`
- **Tenancy & region:** tenants in scope, residency constraints: `TBD`
- **Sources:** S3 path(s) or sample CSV(s) (≤10k rows each), expected volumes & cadence: `TBD`
- **SLO/cost overrides:** use defaults or specify: `TBD`
- **Release window:** date + any freeze/conflicts: `TBD`

> If you leave these as `use defaults`, Maestro will proceed with the defaults shown in this pack.

---

## 2) Evidence & Repo Facts (from your bundle)

- Node: **18.20.4** (`.nvmrc`) — sha256 `fa365e5…83b5f`
- CI budget: `.maestro/ci_budget.json` → `{ monthlyUsd: 1200, softPct: 0.85 }` — sha256 `4855669…9f9d`
- Freeze windows: `.maestro/freeze_windows.json` → EOQ + Black Friday — sha256 `e9df717…ad79`
- Pipeline: `.maestro/pipeline.yaml` → steps: `build-all`, `web-tests`, `conductor-smoke`, `package-server`, `push-server` — sha256 `272c6f2…964f`
- Gateway (Apollo) present with depth/complexity rules; OPA/ABAC policies exist in `policies/` & `opa/`.

> Maestro will wire gates to these artifacts and fail the build if budgets/SLOs are exceeded.

---

## 3) Backlog & RACI (Epics → Stories → Tasks)

### Epic E1 — Ingest (S3/CSV)

**Must**

- S1: Define canonical CSV schemas & dedupe keys.
- S2: Implement connector (`connector-sdk-s3csv`) with provenance attach.
- S3: Golden dataset & replay script.  
  **Owner:** Eng (TBD) · **Approver:** MC · **Risk:** Medium

### Epic E2 — Graph Model & Storage (Neo4j)

- S1: Create `Entity(id, type, name, attrs)` + `Edge(src, dst, type, ts)`.
- S2: Indexes/constraints; tenancy tag (`tenant`) on nodes/edges.
- S3: ER hooks (optional).
  **Owner:** Eng (TBD) · **Risk:** Medium

### Epic E3 — GraphQL Gateway & API Slice

- S1: SDL for `entity`, `searchEntities`, `neighbors`, `paths`.
- S2: Persisted queries (3); rate/complexity limits; allowlist.
- S3: BFF wiring to services; OPA check per request.
  **Owner:** Eng (TBD) · **Risk:** Medium

### Epic E4 — Security, ABAC/OPA

- S1: JWT → attributes mapping; tenant scoping.
- S2: ABAC policy `allow(entity_read)` & `allow/deny` logs.
- S3: mTLS between services; secrets in vault.
  **Owner:** Sec (TBD) · **Risk:** Medium

### Epic E5 — Observability & SLOs

- S1: OTEL traces; Prom metrics; logs w/ tenant + request‑id.
- S2: Dashboards; burn alerts @ 80% budget.
- S3: k6 SLO tests in CI.
  **Owner:** SRE (TBD) · **Risk:** Medium

### Epic E6 — CI/CD & Release

- S1: Add policy simulation & SBOM to pipeline.
- S2: Canary release; rollback.
  **Owner:** Eng (TBD) · **Risk:** Low

### Epic E7 — Runbooks & Evidence

- S1: On‑call triage; deploy/rollback; provenance export.
- S2: Evidence bundle (hashes, SLO runs, test matrix) attached to tag.
  **Owner:** SRE (TBD) · **Risk:** Low

**RACI (initial):**

- **Responsible:** Eng Lead (TBD), SRE (TBD)
- **Accountable:** MC
- **Consulted:** Product (TBD), Sec (TBD)
- **Informed:** Stakeholders (TBD)

---

## 4) Architecture (High‑Level)

```mermaid
flowchart LR
  subgraph Source[Sources]
    S3[(S3/CSV)]
  end
  subgraph Ingest[Ingest Service]
    Dedupe[Deduper]\nProvenance
  end
  subgraph Data[Storage]
    NEO[(Neo4j)]
    PG[(PostgreSQL)]
    R[(Redis Cache)]
  end
  subgraph API[GraphQL Gateway]
    Apollo[Apollo Gateway]\nPersisted Queries
    OPA[OPA/ABAC]
    RL[Rate & Depth Limits]
  end
  subgraph Obs[Observability]
    OTEL[OpenTelemetry]
    Prom[Prometheus]
    Graf[Grafana]
  end
  subgraph Web[Clients]
    React
  end

  S3 --> Ingest --> NEO
  Ingest --> PG
  Apollo -->|resolves| NEO
  Apollo -->|authz| OPA
  Apollo --> R
  Apollo --> OTEL
  OTEL --> Prom --> Graf
  Web <--> Apollo
```

---

## 5) ADRs (Decisions)

**ADR‑001: Apollo Gateway + Persisted Queries**

- **Status:** Proposed
- **Context:** Existing gateway, depth/complexity controls present.
- **Decision:** Enforce persisted queries for prod; block ad‑hoc queries.
- **Consequences:** Better cacheability, fewer DoS vectors; requires tooling for PQ lifecycle.

**ADR‑002: Neo4j as Graph Store**

- **Status:** Proposed
- **Decision:** Use Neo4j for OLTP graph ops; indexes on `(tenant, id)`, `(type)`.
- **Consequences:** Meets p95 targets; analytics offloaded to batch/GDS later.

**ADR‑003: ABAC via OPA**

- **Status:** Proposed
- **Decision:** JWT→attrs mapping; evaluate `allow(entity_read)` per request; audit decisions.
- **Consequences:** Strong tenant isolation; need policy tests.

---

## 6) Data Model & Policies

**Entities**

- `Entity { id: ID!, tenant: String!, type: String!, name: String, attrs: JSON, risk_score: Float, created_at, updated_at }`
- `Edge { id: ID!, tenant: String!, src: ID!, dst: ID!, type: String!, ts: DateTime, attrs: JSON }`

**Indexes/Constraints (Cypher)**

```cypher
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE (e.tenant,e.id) IS NODE KEY;
CREATE INDEX ent_type IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX edge_src IF NOT EXISTS FOR ()-[r:EDGE]-() ON (r.src);
```

**Retention & Purpose Tags**

- Default retention: `standard-365d`; PII → `short-30d` unless `legal-hold`.
- Purpose tags on datasets: `investigation | threat-intel | demo | training`.

---

## 7) API Contract (GraphQL SDL, v0)

```graphql
schema {
  query: Query
  mutation: Mutation
}

scalar JSON
scalar DateTime

type Entity {
  id: ID!
  tenant: String!
  type: String!
  name: String
  attrs: JSON
  riskScore: Float
}

type Edge {
  id: ID!
  tenant: String!
  src: ID!
  dst: ID!
  type: String!
  ts: DateTime
  attrs: JSON
}

type GraphNeighborhood {
  center: Entity!
  neighbors: [Entity!]!
}

type Query {
  entity(id: ID!, tenant: String!): Entity
  searchEntities(
    q: String!
    type: String
    tenant: String!
    limit: Int = 25
  ): [Entity!]!
  neighbors(
    id: ID!
    tenant: String!
    depth: Int = 2
    limit: Int = 5000
  ): GraphNeighborhood!
  paths(src: ID!, dst: ID!, tenant: String!, maxDepth: Int = 5): [Entity!]!
}

type Mutation {
  upsertEntity(input: EntityInput!): Entity!
  upsertEdge(input: EdgeInput!): Edge!
}

input EntityInput {
  id: ID!
  tenant: String!
  type: String!
  name: String
  attrs: JSON
  riskScore: Float
}
input EdgeInput {
  id: ID!
  tenant: String!
  src: ID!
  dst: ID!
  type: String!
  ts: DateTime
  attrs: JSON
}
```

**Persisted Queries (examples)**

```json
{
  "byId": "query($tenant:String!, $id:ID!){ entity(tenant:$tenant, id:$id){ id type name } }",
  "search": "query($tenant:String!, $q:String!){ searchEntities(tenant:$tenant, q:$q, limit:25){ id type name } }",
  "neighborhood": "query($tenant:String!, $id:ID!){ neighbors(tenant:$tenant, id:$id, depth:2){ center{ id } neighbors{ id type } } }"
}
```

**Gateway Guardrails**

- Require header `X-Persisted-Query: true` in prod.
- Depth limit (e.g., 8) & complexity limit (e.g., 1,500).
- 429 on rate‑limit exceed; emit `tenant` and `request_id` in logs.

---

## 8) Security & Privacy

**AuthN/Z**

- OIDC → JWT with claims: `sub`, `tenant`, `roles`, `scopes`, `purpose`.
- Map `tenant` and `purpose` to ABAC input.

**OPA ABAC (rego sketch)**

```rego
package authz

default allow = false

allow {
  input.action == "entity:read"
  input.attrs.tenant == input.jwt.tenant
  not deny
}

deny {
  input.jwt.purpose == "training"
  input.data_classification == "restricted"
}
```

**Secrets**

- mTLS between services; secrets via vault; field‑level encryption for sensitive attributes.

**Audit/Provenance**

- Immutable ledger entries on ingest & mutation; export manifest (below) signed and attached to release tag.

---

## 9) Provenance & Evidence Bundle

**Export Manifest (example)**

```json
{
  "release": "v0.1.0",
  "artifacts": [
    {
      "path": ".nvmrc",
      "sha256": "fa365e51dcadb1c0f9124d07d3c54ba89d6ade2f7847ed6376304757d4283b5f"
    },
    {
      "path": ".maestro/ci_budget.json",
      "sha256": "485566900a5fd4ec750d1ed86d3552b2bf9fa261cf15c467c9057f07f8c69f9d"
    },
    {
      "path": ".maestro/freeze_windows.json",
      "sha256": "e9df717fc6702565adef7cfadfd8dc21c61fd583eda7fbb870d514d58508ad79"
    },
    {
      "path": ".maestro/pipeline.yaml",
      "sha256": "272c6f28ff151e585e0b10960f3baebba76976c24babc04585e8a9c6b530964f"
    }
  ],
  "slo_results": { "api.p95_ms": 320, "graph.1hop.p95_ms": 270 },
  "tests": { "unit": ">=80%", "integration": "pass", "k6": "pass" }
}
```

---

## 10) Testing Strategy

**Unit:** Resolvers, OPA decision wrapper, CSV parser.  
**Contract:** GraphQL schema + persisted queries allowlist.  
**E2E:** Ingest → query paths; authz decisions.  
**Load (k6):** Verify SLOs with staged load; fail CI on p95 breach.

**k6 SLO Test (sketch)**

```js
import http from 'k6/http';
import { check } from 'k6';
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};
const query = `query Neighborhood($tenant:String!, $id:ID!){ neighbors(tenant:$tenant, id:$id, depth:2){ neighbors{ id } } }`;
export default function () {
  const res = http.post(
    __ENV.GRAPHQL_URL,
    JSON.stringify({
      query,
      variables: { tenant: __ENV.TENANT || 'demo', id: 'seed-node' },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Persisted-Query': 'true',
      },
    },
  );
  check(res, {
    'status 200': (r) => r.status === 200,
    'latency p95 ok': (r) => r.timings.waiting < 350,
  });
}
```

**Coverage Goals:** 80% lines/branches min; policy tests required for ABAC packages.

---

## 11) Observability & SLOs

**Metrics (examples):**

- `graphql_request_latency_ms` (p50/p95/p99 by operation, tenant)
- `neo4j_query_latency_ms`, `neo4j_query_errors_total`
- `ingest_events_total`, `ingest_processing_ms`

**Logs:** JSON; include `tenant`, `request_id`, `operationName`.

**Traces:** OTEL enabled across Gateway→Resolvers→Neo4j.

**Dashboards & Alerts:** SLO burn alerts at 80% error budget; cost alerts at 85% of monthly cap.

---

## 12) CI/CD & IaC

**Pipeline Augment (YAML snippet)**

```yaml
- id: sbom
  run: syft dir:. -o json > sbom.json
- id: policy-sim
  run: opa eval -d policies -i ci/input.json "data.ci.allow"
- id: k6-slo
  run: k6 run load/k6-graphql-slo.js
- id: slo-gate
  run: node scripts/gates/slo-budget-check.mjs # fail > thresholds
```

**Release Cadence:** weekly cut → staging; biweekly → prod; pause if error‑budget < 50%.

---

## 13) Runbooks (Day‑1)

**Deploy/Upgrade**

1. Canary 5% traffic → 30 min observe → 50% → 100%.
2. Rollback: redeploy last green tag; clear caches; verify health checks.

**On‑Call Triage (GraphQL 5xx burst)**

1. Check rate limit/complexity logs.
2. Inspect Neo4j health & slow queries.
3. Compare SLO burn; if > threshold, flip traffic to last green.

**Provenance & Export Signing**

- Verify ledger; sign export with org key; attach manifest to release.

---

## 14) Release Plan & Notes

- Tag `v0.1.0` with evidence bundle; include acceptance pack links; owners sign‑off.

**Release Notes (template)**

- Features: …
- Fixes: …
- SLOs: …
- Known Issues: …
- Evidence: manifest, SLO runs, policy report.

---

## 15) Final “To‑Provide” Checklist (copy/paste and fill)

- [ ] **Goal & metric:** …
- [ ] **Tenants & region/residency:** …
- [ ] **Sources & sample files:** …
- [ ] **SLO/cost overrides or `use defaults`:** …
- [ ] **Release window & freeze conflicts:** …

> Once these are filled, Maestro will generate PRD/ADRs as “Accepted”, wire CI gates, and open epics/stories with owners & estimates.
