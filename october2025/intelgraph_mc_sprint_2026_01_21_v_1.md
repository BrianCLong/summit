````markdown
---
slug: intelgraph-mc-sprint-2026-01-21
version: v1.0
created: 2025-09-29
sprint_window: 2026-01-21 → 2026-02-03 (2 weeks)
release_cadence: weekly cut → staging; biweekly → prod
owners:
  - product: PM (R), MC (A)
  - delivery: Tech Lead (A), Platform (R), Backend (R), Data Eng (R), DS (R), SRE (R), Sec (R), QA (R), Frontend (R)
status: planned
---

# IntelGraph Maestro Conductor — Sprint Plan (2026‑01‑21 → 2026‑02‑03)

> **Mission (Sprint N+8)**: Deliver **Multi‑Cloud Readiness v0.9** (AWS+GCP baseline), **Model Ops & Monitoring** for ER/analytics, **PII Detection & Redaction** pipeline, **GraphQL Subgraphs** (modular gateway), and **Tenant Usage Reports**—keeping SLOs/cost guardrails green. Evidence bundle v9 included.

## Conductor Summary (Commit)

**Assumptions & Provenance**

- Builds on 2026‑01‑07 sprint (Black‑Cell GA track, CMK, Data Contracts, Residency v2, Temporal analytics).
- Summit bundles still pending import; placeholders marked _[ATTACH FROM SUMMIT BUNDLE]_.

**Goals**

1. **Multi‑Cloud v0.9**: baseline GCP support (GKE, Cloud KMS, GCS) with parity overlays and provider‑neutral Terraform; smoke DR across clouds (control‑plane only).
2. **Model Ops & Monitoring**: registry v1.1 with metrics (latency/precision drift), canary rollouts, and rollback; model cards.
3. **PII Detection & Redaction**: streaming annotator (patterns + rules) enforcing purpose/retention; export presets.
4. **GraphQL Subgraphs**: split monolith schema into **core**, **analytics**, **admin** subgraphs with router/federation; persisted‑ID invariants preserved.
5. **Tenant Usage Reports**: monthly statements (calls, ingest, storage, analytics) with per‑purpose breakdown and cost estimates.

**Non‑Goals**

- Full multi‑cloud DR for data planes; ML training pipelines beyond ER scorer fine‑tuning.

**Constraints**

- SLOs unchanged. Cross‑cloud router must add ≤ +15% p95 for routed reads.
- Cost guardrails unchanged; cloud‑specific SKUs must fit existing budgets.

**Risks**

- R1: Federation introduces latency. _Mitigation_: colocate router, caching, query plan pinning.
- R2: PII false positives. _Mitigation_: precision‑biased rules, allowlist, manual review queue.
- R3: Cross‑cloud secrets drift. _Mitigation_: single source of truth + conformance tests.

**Definition of Done**

- GCP overlays deploy staging successfully; KMS integration passes CMK tests; subgraphs live in staging with SLOs; PII annotator redacts in exports and pipeline; model monitoring dashboards live; usage reports delivered for 2 pilot tenants.

---

## Swimlanes

- **Lane A — Multi‑Cloud & KMS** (Platform + Security)
- **Lane B — GraphQL Subgraphs** (Backend + SRE)
- **Lane C — Model Ops & Monitoring** (DS + Backend)
- **Lane D — PII Detection & Redaction** (Security + Data Eng)
- **Lane E — Usage Reports** (SRE FinOps + Backend + PM)
- **Lane F — QA & Release** (QA + MC)

---

## Backlog (Epics → Stories → Tasks) + RACI

Estimates in SP.

### EPIC A: Multi‑Cloud Readiness v0.9 (34 SP)

- **A‑1** Terraform providers & modules (AWS/GCP) (10 SP) — _Platform (R), TL (A)_
  - AC: `provider=aws|google` switch; identical tags/labels; smoke tests.
- **A‑2** GCP KMS + CMK parity (8 SP) — _Security (R), Backend (C)_
  - AC: envelope encryption via Cloud KMS; rotation proofs.
- **A‑3** GCS connector overlay (8 SP) — _Data Eng (R)_
  - AC: throughput ≥ 40 MB/s/worker; provenance attach.
- **A‑4** Cross‑cloud router smoke (8 SP) — _SRE (R)_
  - AC: p95 delta ≤ +15% reads; failover doc.

### EPIC B: GraphQL Subgraphs (28 SP)

- **B‑1** Schema decomposition (core/analytics/admin) (10 SP) — _Backend (R)_
- **B‑2** Router + persisted‑ID mapping (10 SP) — _Backend (R), SRE (C)_
- **B‑3** Compat tests & SLOs (8 SP) — _QA (R)_

### EPIC C: Model Ops & Monitoring (26 SP)

- **C‑1** Model registry v1.1 (cards + metadata) (8 SP) — _DS (R)_
- **C‑2** Drift metrics & alerts (10 SP) — _SRE (R), DS (C)_
  - AC: precision proxy (shadow set), data drift (pop stats), latency p95.
- **C‑3** Canary/rollback workflow (8 SP) — _Backend (R)_

### EPIC D: PII Detection & Redaction (24 SP)

- **D‑1** Streaming annotator (regex/rules) (10 SP) — _Data Eng (R), Sec (A)_
- **D‑2** Export redaction presets v1.1 (6 SP) — _Backend (R)_
- **D‑3** Review queue + override (8 SP) — _Frontend (R)_

### EPIC E: Tenant Usage Reports (20 SP)

- **E‑1** Aggregations & rollup jobs (8 SP) — _SRE FinOps (R)_
- **E‑2** Statement API & PDFs (6 SP) — _Backend (R)_
- **E‑3** Admin UI & email (6 SP) — _Frontend (R)_

### EPIC F: QA & Evidence (14 SP)

- **F‑1** Compat + subgraph contract tests (8 SP) — _QA (R)_
- **F‑2** Evidence bundle v9 (6 SP) — _MC (R)_

_Total_: **146 SP** (descope: D‑3 or C‑3 if capacity < 130 SP).

---

## Architecture (Deltas)

```mermaid
flowchart LR
  subgraph Cloud A (AWS)
    GWA[GW-Subgraph: core]
    GWA2[GW-Subgraph: analytics]
    GWA3[GW-Subgraph: admin]
    RTA[Router]
    KMSA[AWS KMS]
    S3A[S3]
  end
  subgraph Cloud B (GCP)
    GWB[GW-Subgraph: core]
    RPB[Router-Edge]
    KMSB[Cloud KMS]
    GCSB[GCS]
  end
  RTA <--> RPB
  GWA & GWA2 & GWA3 --> RTA
  GWB --> RPB
  S3A --> Ingest
  GCSB --> Ingest
  subgraph Model Ops
    REG[Model Registry]
    MON[Model Monitors]
  end
  REG --> MON --> Dash[Dashboards]
  subgraph PII
    ANN[Annotator]
    XPT[Export Redactor]
  end
  Ingest --> ANN --> Storage
  XPT --> Exports
```
````

**ADR‑024**: Subgraph architecture with router preserves persisted‑ID contracts via mapping table. _Trade‑off_: more moving parts vs modularity.

**ADR‑025**: GCP added as secondary supported cloud with provider‑neutral Terraform modules. _Trade‑off_: extra maintenance vs portability.

**ADR‑026**: PII annotator prioritizes precision; false negatives mitigated via export redaction presets. _Trade‑off_: potential misses vs lower friction.

---

## Data & Policy

**Usage Rollups (PG)**

```sql
CREATE MATERIALIZED VIEW usage_monthly AS
SELECT tenant_id,
       date_trunc('month', ts) AS month,
       sum(CASE WHEN kind='graphql_call' THEN quantity ELSE 0 END) AS calls,
       sum(CASE WHEN kind='ingest_event' THEN quantity ELSE 0 END) AS events,
       sum(CASE WHEN kind='storage_gb_hour' THEN quantity ELSE 0 END)/720.0 AS storage_gb
FROM metering_events GROUP BY 1,2;
```

**PII Rules (YAML)**

```yaml
patterns:
  email: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
  phone_e164: "\\+?[1-9]\\d{1,14}"
  ssn_us: "\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b"
actions:
  email: redact
  phone_e164: redact
  ssn_us: block
```

**Policy Delta**

- PII detections attach `sensitivity: high`; default retention `short-30d` unless legal‑hold.
- Usage statements visible to `tenant-admin` and `auditor` roles only.

---

## APIs & Schemas

**GraphQL — Federation & Reports**

```graphql
# Subgraph: core
type Query {
  entity(id: ID!): Entity
}

# Subgraph: analytics
type Query {
  pagerankTop(limit: Int = 20): [AnalyticsScore!]!
}

# Subgraph: admin
type UsageStatement {
  month: String!
  calls: Int!
  events: Int!
  storageGB: Float!
  estCostUSD: Float!
}

type Query {
  usageStatement(month: String!): UsageStatement! @auth(abac: "admin.write")
}
```

**Statement Estimator (TS)**

```ts
export function estimateCost(u: {
  calls: number;
  events: number;
  storageGB: number;
}) {
  return u.calls * 0.000002 + u.events * 0.0001 + u.storageGB * 0.02;
}
```

---

## Security & Privacy

- **Keys**: CMK parity on GCP verified via rotation test; keys never leave provider KMS.
- **PII**: annotator logs contain hashes only; review queue requires high‑clearance role.
- **Federation**: router enforces tenant headers; subgraph authZ evaluated independently.

---

## Observability & SLOs

- New metrics: router hop latency, subgraph p95s, model drift score, annotator precision proxy, redaction counts, usage rollup lag.
- Alerts: router p95 > 50 ms over baseline; drift > threshold; redaction/block errors > 0; rollup lag > 2h.

---

## Testing Strategy

- **Unit**: PII regex rules; cost estimator; subgraph mapping; registry card validator.
- **Contract**: federated schema; persisted‑ID mapping; usage statement API.
- **E2E**: GCS ingest → annotator → storage → export redaction; model canary/rollback; cross‑cloud routed read.
- **Load**: router @ +25% RPS; annotator 1,500 ev/s/pod; ensure SLOs.
- **Chaos**: subgraph outage (router fallback); KMS regional failure (parity test).

**Acceptance Packs**

- GCP overlay deploys green; CMK rotation proof stored; p95 deltas ≤ +15%.
- Persisted‑ID requests resolve correctly through router; SLOs green for 7 days.
- PII annotator redacts emails/phones; SSN blocked with audit; export redaction applied.
- Usage statement matches rollup ±0.5%; PDF/API parity.

---

## CI/CD & IaC

```yaml
name: multicloud-and-federation
on: [push]
jobs:
  terraform-converge:
    runs-on: ubuntu-latest
    strategy: { matrix: { provider: [aws, google] } }
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform -chdir=infra/${{ matrix.provider }} init && terraform -chdir=infra/${{ matrix.provider }} plan
  federation-compat:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm run schema:compose && npm run safelist:verify
```

**Terraform (provider‑neutral module)**

```hcl
variable "cloud" { type = string }
module "gateway" {
  source = "./modules/gateway"
  cloud  = var.cloud # aws|google
  replicas = 3
}
```

---

## Code & Scaffolds

```
repo/
  infra/
    aws/
      main.tf
    google/
      main.tf
    modules/gateway/
      main.tf
  federation/
    router.ts
    mapping.json
  pii/
    annotator.ts
    rules.yaml
    review-queue.tsx
  modelops/
    registry.ts
    monitors.ts
  reports/
    rollup.sql
    api.ts
    pdf.ts
```

**Federation Router (TS excerpt)**

```ts
import { createGateway } from '@apollo/gateway';
const gateway = createGateway({
  serviceList: [
    { name: 'core', url: process.env.CORE_URL },
    { name: 'analytics', url: process.env.ANALYTICS_URL },
    { name: 'admin', url: process.env.ADMIN_URL },
  ],
});
```

**PII Annotator (TS excerpt)**

```ts
export function annotate(record: any, rules: Rules) {
  /* tag/redact in stream */
}
```

**Model Monitor (TS excerpt)**

```ts
export function drift(actual: number[], ref: number[]) {
  /* compute PSI/KS */
}
```

---

## Release Plan & Runbooks

- **Staging cuts**: 2026‑01‑24, 2026‑01‑31.
- **Prod**: 2026‑02‑03 (canary 10→50→100%).

**Backout**

- Collapse to single cloud (AWS overlays); disable federation (monolith gateway); turn off PII annotator enforcement → log‑only; pause model rollouts.

**Evidence Bundle v9**

- Terraform plans, KMS rotation proofs, federation compat results, annotator test corpus & outcomes, model drift dashboards, usage statements, signed manifest.

---

## RACI (Consolidated)

| Workstream    | R          | A         | C                 | I   |
| ------------- | ---------- | --------- | ----------------- | --- |
| Multi‑Cloud   | Platform   | Tech Lead | Security, SRE     | PM  |
| Subgraphs     | Backend    | MC        | SRE, QA           | PM  |
| Model Ops     | DS         | MC        | Backend, SRE      | PM  |
| PII Redaction | Data Eng   | Sec TL    | Backend, Frontend | PM  |
| Usage Reports | SRE FinOps | PM        | Backend           | All |
| QA & Evidence | QA         | PM        | MC                | All |

---

## Open Items

1. Confirm GCP regions and residency constraints per tenant _[ATTACH FROM SUMMIT BUNDLE]_.
2. Approve PII rule set with Legal/Privacy.
3. Select pilot tenants for usage statements and cross‑cloud routing.

```

```
