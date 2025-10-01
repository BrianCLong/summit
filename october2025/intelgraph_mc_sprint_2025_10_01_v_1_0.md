```markdown
---
slug: intelgraph-mc-sprint-2025-10-01
version: v1.0
created: 2025-09-29
sprint_window: 2025-10-01 → 2025-10-14 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Eng (R), QA (R), SRE (R), Sec (R)
  - evidence: MC (A), All (C)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2025‑10‑01 → 2025‑10‑14)

> **Mission**: Convert prioritized intents into shippable, compliant, observable increments for the IntelGraph platform, enforcing guardrails (SLOs, cost, privacy) and generating an evidence bundle at release.

## Conductor Summary (Commit)
**Assumptions & Provenance Notes**
- Source packages `summit-2025.09.23.1710.zip`, `summit-main.zip`, and `summit-main (1).zip` were provided, but could not be opened in the current environment. This sprint plan therefore relies on **Org Defaults (IntelGraph)** and previously agreed platform guardrails.
- We capture this limitation explicitly to preserve auditability; replace sections marked _[ATTACH FROM SUMMIT BUNDLE]_ once artifacts are retrievable.

**Goals**
1. **Graph Gateway harden + observe**: hit API/GraphQL gateway SLOs, add golden-path traces and budget alerts.
2. **Ingest Day‑0 GA**: S3/CSV + HTTP connectors with provenance attach, dedupe, and ABAC-scoped tenancy.
3. **Provenance Ledger v0.9**: immutable event schema, export signing CLI, and verification runbook.
4. **Policy Reasoner seed**: license/TOS classes, retention tiers, and purpose tags enforced in OPA policies.
5. **E2E evidence bundle**: reproducible release notes + SLO and policy simulation attestation.

**Non‑Goals**
- Multi‑region DR drills (planned next sprint).
- GCS/Azure blob connectors (Phase‑Next backlog).
- Advanced entity resolution and GDS analytics (beyond smoke fixtures).

**Constraints**
- **SLOs (must‑meet)**: API p95 ≤ 350 ms (read), ≤ 700 ms (write); Ingest p95 processing ≤ 100 ms; availability ≥ 99.9%.
- **Cost guardrails**: Dev ≤ $1k/mo; Staging ≤ $3k/mo; Prod ≤ $18k/mo infra; LLM ≤ $5k/mo; alerts at 80% burn.
- **Compliance**: OIDC + ABAC/OPA + mTLS; field‑level encryption for sensitive attrs; immutable audit on by default.

**Risks**
- R1: Unknown deltas in summit bundles → plan misalignment. _Mitigation_: placeholders + review gate on Day 1.
- R2: Latency regression from tracing. _Mitigation_: sampling + OTEL exporter tuning + perf budget tests.
- R3: Cost drift from chat inference. _Mitigation_: usage caps, per‑tenant budgets, failover provider.

**Definition of Done**
- All ACs pass; SLOs green for 7 consecutive days in staging; evidence bundle published with hash manifest; rollback plan tested.

---

## Swimlanes & Cadence
- **Lane A — Gateway & API** (Backend TL, 2 Eng)
- **Lane B — Ingest & Provenance** (Data Eng TL, 2 Eng)
- **Lane C — Policy & Security** (Security Eng, MC)
- **Lane D — Observability & SRE** (SRE TL, 1 Eng)
- **Lane E — QA & Release** (QA Lead, PM)

Daily stand‑ups; triage on error‑budget burn; weekly cut to staging (Oct 4 & Oct 11), prod release Oct 14.

---

## Backlog (Epics → Stories → Tasks) with RACI
Legend: **R**esponsible, **A**ccountable, **C**onsulted, **I**nformed. Estimates in story points (SP).

### EPIC A: Graph Gateway hardening (32 SP)
- **A‑1** GraphQL persisted queries + safelist (8 SP) — _Backend (R), TL (A), Sec (C), QA (C), PM (I)_
  - Tasks: add safelist store; CI to diff + block; fallback 403 on unknown op.
  - AC: 100% of client ops resolved via persisted IDs; unknown queries rejected; audit log contains tenant, opId, hash.
- **A‑2** Field‑level ABAC with OPA (10 SP) — _Backend (R), Sec (A), MC (C)_
  - Tasks: data filters per tenant; attribute mapping from OIDC; policy unit tests.
  - AC: denied fields elided, not nulled; policy decisions traced.
- **A‑3** OTEL traces + p95 guards (6 SP) — _Backend (R), SRE (A)_
  - Tasks: span attrs (tenant, op, hops); exemplars for p99 slow queries.
  - AC: p95 dashboards online; slow op alerts at 2× baseline.
- **A‑4** Rate limiting & backpressure (8 SP) — _Backend (R), SRE (A)_
  - Tasks: token bucket by tenant; 429s emit Retry‑After; queue depth metrics.
  - AC: soak test shows no error‑budget burn at 2× expected RPS.

### EPIC B: Day‑0 Ingest GA (40 SP)
- **B‑1** S3/CSV connector SDK polish (12 SP) — _Data Eng (R), TL (A)_
  - Tasks: schema mapping DSL; dedupe by natural keys; provenance attach.
  - AC: ingest ≥ 50 MB/s/worker; idempotent replays safe.
- **B‑2** HTTP pull/push connector (10 SP) — _Data Eng (R), Backend (C)_
  - AC: ≥ 1,000 events/s/pod; processing p95 ≤ 100 ms; retries with jitter/backoff.
- **B‑3** Multi‑tenant isolation (8 SP) — _Data Eng (R), Sec (A)_
  - AC: data stamped with tenant_id; ABAC checks in pipelines; cross‑tenant queries blocked in tests.
- **B‑4** Provenance ledger v0.9 (10 SP) — _Data Eng (R), MC (A)_
  - AC: append‑only events, hash chain, export signing CLI; verify runbook.

### EPIC C: Policy Reasoner Seed (18 SP)
- **C‑1** License/TOS classifier (6 SP) — _Sec (R), MC (A)_
  - AC: classes: MIT‑OK, Open‑Data‑OK, Restricted‑TOS, Proprietary‑Client, Embargoed.
- **C‑2** Retention tiering (6 SP) — _Sec (R), Backend (C)_
  - AC: ephemeral‑7d, short‑30d, standard‑365d, long‑1825d, legal‑hold; default PII → short‑30d.
- **C‑3** Purpose tags & enforcement (6 SP) — _Sec (R), MC (C)_
  - AC: investigation, threat‑intel, fraud‑risk, t&s, benchmarking, training, demo; policy sim in CI.

### EPIC D: Observability & SRE (20 SP)
- **D‑1** Golden dashboards + SLO burn alerts (8 SP) — _SRE (R), MC (C)_
- **D‑2** k6 load suite (8 SP) — _QA (R), Backend (C)_
- **D‑3** On‑call runbook & canary (4 SP) — _SRE (R), PM (I)_

### EPIC E: QA & Release (16 SP)
- **E‑1** Acceptance packs & fixtures (8 SP) — _QA (R), PM (A)_
- **E‑2** Evidence bundle gen (8 SP) — _MC (R), QA (C)_

_Total_: **126 SP** (can be split by capacity; descope candidates: A‑4, C‑3).

---

## Architecture (Design → Decide)
```mermaid
flowchart LR
  subgraph Client
    UI[React 18 + MUI + Cytoscape]
  end
  UI -->|Persisted Query ID| GW[API/GraphQL Gateway (Apollo, TS)]
  GW -->|ABAC/OPA| OPA[OPA Policy Engine]
  GW -->|Cypher| NEO[(Neo4j Cluster)]
  GW -->|SQL| PG[(PostgreSQL)]
  GW -->|Cache| REDIS[(Redis)]
  subgraph Ingest
    S3[S3/CSV Connector]
    HTTP[HTTP Pull/Push Connector]
    PIPE[Ingest Pipelines]
  end
  S3 --> PIPE --> PG
  HTTP --> PIPE --> NEO
  PIPE --> LEDGER[(Provenance Ledger)]
  GW --> OTEL[OpenTelemetry]
  OTEL --> GRAF[Prometheus/Grafana/ELK]
```

### ADRs (high‑level)
- **ADR‑001**: Persisted GraphQL queries only; block ad‑hoc queries. _Trade‑off_: less flexibility vs attack surface reduction.
- **ADR‑002**: OPA for ABAC with per‑field filtering. _Trade‑off_: policy latency mitigated by in‑process cache.
- **ADR‑003**: Hash‑chained provenance ledger with export signing. _Trade‑off_: extra storage for integrity.
- **ADR‑004**: OTEL tracing with sampling; exemplars for p99. _Trade‑off_: minor overhead for visibility.

---

## Data & Policy
**Canonical Entities (Neo4j)**
- `:Entity {entity_id, tenant_id, type, labels[], created_at}`
- `:Attribute {attr_id, name, value, sensitivity, retention, purpose[]}`
- `(:Entity)-[:HAS_ATTRIBUTE]->(:Attribute)`
- `(:Entity)-[:RELATED {kind, weight, since}]->(:Entity)`

**PostgreSQL (metadata/services)**
```sql
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE provenance_events (
  event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  hash BYTEA NOT NULL,
  prev_hash BYTEA,
  signature BYTEA NOT NULL
);
CREATE INDEX ON provenance_events(tenant_id, ts);
```

**Retention & Purpose Defaults**
- Default retention: `standard-365d`; PII → `short-30d` unless `legal-hold`.
- Purpose tags required for all datasets; CI blocks untagged imports.

---

## APIs & Schemas
**GraphQL SDL (excerpt)**
```graphql
scalar DateTime

directive @auth(abac: String) on FIELD_DEFINITION

type Entity {
  id: ID!
  tenantId: ID!
  type: String!
  labels: [String!]!
  createdAt: DateTime!
  attributes(filter: AttributeFilter): [Attribute!]! @auth(abac: "attribute.read")
  related(kind: String, maxHops: Int = 2): [Entity!]! @auth(abac: "entity.relate.read")
}

type Attribute {
  id: ID!
  name: String!
  value: String! @auth(abac: "attribute.value.read")
  sensitivity: String!
  retention: String!
  purpose: [String!]!
}

type Query {
  entity(id: ID!): Entity @auth(abac: "entity.read")
  searchEntities(q: String!, limit: Int = 25): [Entity!]! @auth(abac: "entity.search")
}

type Mutation {
  upsertEntity(input: UpsertEntityInput!): Entity @auth(abac: "entity.write")
}
```

**Persisted Query Manifest (example)**
```json
{
  "id": "getEntityById:v1",
  "hash": "sha256-...",
  "doc": "query($id: ID!){ entity(id:$id){ id type labels createdAt } }",
  "roles": ["reader"],
  "abac": ["entity.read"]
}
```

**Cypher Hints**
```cypher
// 1-hop neighborhood target p95 ≤ 300 ms
MATCH (e:Entity {entity_id: $id, tenant_id: $tenant})-[:RELATED]->(n)
RETURN n LIMIT 100;
```

---

## Security & Privacy
- **AuthN**: OIDC → JWT; mTLS service‑to‑service.
- **AuthZ**: ABAC via OPA; deny‑by‑default; decisions logged.
- **Encryption**: TLS in transit; field‑level for sensitive `Attribute.value` (AES‑GCM) with KMS.
- **SCIM**: optional sync of users/groups → roles → ABAC attrs.
- **Privacy**: minimization, purpose limitation; k‑anonymity/redaction for exports; RTBF workflow queued.

**OPA Policy (snippet)**
```rego
package intelgraph.abac

default allow = false

allow {
  input.user.tenant_id == input.resource.tenant_id
  input.user.scopes[_] == input.action
  not deny_sensitivity
}

deny_sensitivity {
  input.resource.sensitivity == "high"
  not input.user.attributes["clearance"] == "high"
}
```

---

## Observability & SLOs
- Metrics: GraphQL op latency (p50/p95/p99), Neo4j hop timings, ingest throughput, queue depth, error rates, budget burn.
- Logs: structured (tenant, opId, traceId), privacy‑scrubbed; 30‑day retention default.
- Traces: gateway→db spans; exemplars for slow ops.

**Alert Rules**
- p95 read > 350 ms for 10 min → page Backend TL.
- Ingest processing p95 > 100 ms for 10 min → page Data Eng TL.
- Availability < 99.9% rolling 30d → change freeze; open incident.

---

## Testing Strategy
- **Unit**: policy, resolvers, connectors (Jest); coverage target ≥ 85% critical paths.
- **Contract**: GraphQL persisted queries (Pact), OPA decisions.
- **E2E**: Playwright flows; seed tenants + fixtures.
- **Load**: k6: 2× expected RPS; SLO gates.
- **Chaos**: Neo4j failover drill (staging), Redis eviction.

**Acceptance Packs**
- Given multi‑tenant setup, when executing unknown persisted query → expect 403 + audit.
- Given S3 batch 10 GB CSV, when ingesting with 2 workers → throughput ≥ 100 MB/s.

---

## CI/CD & IaC
- **Pipelines**: trunk‑based; PR gates (lint, types, tests, SBOM, policy sim).
- **Canary**: 10% traffic; rollback on error‑budget burn > 20% in 1h.
- **IaC**: Terraform modules per environment; Helm overlays for region sharding.

**GitHub Actions (excerpt)**
```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run lint && npm run typecheck && npm test -- --ci
      - run: npm run sbom:gen && npm run policy:sim
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - run: helm upgrade --install gw charts/gateway -f overlays/staging.yaml
```

---

## Code & Scaffolds (ready‑to‑run slices)
```
repo/
  gateway/ (Node 20, TS, Apollo)
    src/
      index.ts
      auth/opa.ts
      resolvers/
      persisted/
    test/
  connectors/
    s3csv/
    http/
  policy/
    rego/
    fixtures/
  ops/
    helm/
    terraform/
  qa/
    k6/
    playwright/
  tools/
    evidence-bundle/
```

**Gateway bootstrap (TypeScript, snippet)**
```ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import typeDefs from './schema';
import resolvers from './resolvers';
import { opaAuth } from './auth/opa';

const server = new ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, {
  context: async ({ req }) => opaAuth(req)
}).then(({ url }) => console.log(`GW up at ${url}`));
```

**Evidence bundle manifest (JSON)**
```json
{
  "release": "2025.10.14",
  "commit": "<git-sha>",
  "artifacts": [
    { "path": "dashboards/slo.json", "sha256": "..." },
    { "path": "policy/simulation-report.json", "sha256": "..." },
    { "path": "tests/results/junit.xml", "sha256": "..." }
  ],
  "provenance": {
    "built_by": "MC",
    "timestamp": "2025-10-14T23:59:00Z",
    "signatures": ["<sig>"]
  }
}
```

---

## Release Plan & Runbooks
- **Staging cuts**: 2025‑10‑04, 2025‑10‑11. Smoke, load, policy sim.
- **Prod**: 2025‑10‑14 with canary.

**Backout**
- Helm rollback to previous chart; DB migrations reversible; disable new persisted IDs, keep old in safelist.

**On‑Call Triage (excerpt)**
1. Alert fires (p95 read > 350 ms): identify hot opId → check Neo4j profile; adjust index/limit; revert last merge if needed.
2. Ingest backlog > 30 min: scale workers; inspect poison queue; quarantine dataset; notify tenant.

---

## RACI Matrix (Consolidated)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| Gateway & API | Backend Eng | Tech Lead | Sec, QA | PM |
| Ingest & Prov | Data Eng | Data TL | MC | PM |
| Policy & Sec | Sec Eng | MC | Backend | PM |
| Observability | SRE | SRE TL | MC | All |
| QA & Release | QA | PM | MC | All |

---

## Sprint Calendar
- **Oct 1 (Wed)**: Kickoff; artifact review _[ATTACH FROM SUMMIT BUNDLE]_; finalize scope.
- **Oct 2–3**: Implement A‑1, B‑1 skeletons; seed policies.
- **Oct 4**: Staging cut #1; perf baseline.
- **Oct 6–9**: A‑2, B‑2, D‑1, D‑2; acceptance packs.
- **Oct 11**: Staging cut #2; canary rehearsal.
- **Oct 13–14**: Evidence bundle, release notes; prod canary + GA.

---

## Acceptance Criteria (per Epic)
- **A**: Gateway p95 read ≤ 350 ms, write ≤ 700 ms; 100% persisted queries; ABAC decisions traced.
- **B**: Ingest throughput meets targets; provenance export passes verify; zero cross‑tenant leaks in tests.
- **C**: Policy classes applied; CI policy sim gates PRs; default retention enforced.
- **D**: Dashboards show green 7‑day windows; burn alerts wired.
- **E**: Evidence bundle generated; rollback validated.

---

## Open Questions / Attachments Needed
1. Replace placeholders with artifacts from summit bundles (schemas, connectors, UIs).
2. Confirm tenant taxonomy and region tags for sharding overlays.
3. Validate cost baselines vs current cloud usage.

```

