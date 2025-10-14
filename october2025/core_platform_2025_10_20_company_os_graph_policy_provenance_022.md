# CorePlatform-2025-10-20-CompanyOS-graph-policy-provenance-022
**Sprint 22 (Oct 20 → Oct 31, 2025, America/Denver)**  
**Release Train:** Q4’25 “Foundations GA” — Wave 1  
**Theme:** Harden **Graph + Policy + Provenance + Metering** to production grade; verify receipts and cost attribution end‑to‑end.

---
## 0) Sprint Goal & Exit Criteria
**Goal:** Deliver a canary build of CompanyOS where **(a) graph read p95 ≤ 1.5s on a 50k‑node tenant**, **(b) ≥90% of privileged flows policy‑gated with OPA/ABAC**, **(c) every privileged action emits a **signed receipt** into the Provenance Ledger**, and **(d) metering → FinOps dashboard shows ≥95% accurate per‑tenant cost attribution**.

**Exit Criteria (Go/No‑Go 2025‑10‑31):**
- 3‑hop graph query p95 ≤ 1.5s (warm), p99 ≤ 2.2s in staging canary; error rate p99 < 0.5%.
- OPA bundle coverage report ≥ 90% of privileged flows; deny‑by‑default enabled; step‑up auth wired.
- All privileged actions (create/update/delete on entities, policy changes, exports) emit **signed receipts**; CLI verification passes.
- Metering pipeline ingests ≥ 100k events/hr with zero‑loss (DLQ < 0.01%); FinOps dashboard shows attribution error ≤ 5% on staged dataset.
- SBOM + SLSA attestations attached to release; admission controller blocks unsigned images.

---
## 1) Work Breakdown (Epics → Stories → Acceptance)
### EPIC A — Graph Performance & Reliability
- **A1. 50k‑Node Perf Pass**  
  *Stories:* index/layout tuning; prepared plan cache; hot‑path pagination; entity projection cache; n+1 eliminations.  
  *Acceptance:* 3‑hop canned queries p95 ≤ 1.5s; cache hit ≥ 90%; CPU/IO within budget; trace exemplars attached.
- **A2. Write Path Safety & Backpressure**  
  *Stories:* rate limiters; queue depth SLOs; shed low priority; idempotency keys on ingest.  
  *Acceptance:* soak test 1h without backlog; retries bounded; duplicate writes ≤ 0.05%.

### EPIC B — Policy Layer (ABAC/OPA)
- **B1. Attribute Catalog v1.1**  
  *Stories:* role and risk attributes; data‑residency tags; policy docs generator.  
  *Acceptance:* attributes resolvable ≤ 50ms P95; docs site generated from bundle.
- **B2. Coverage & Simulation Harness**  
  *Stories:* policy regression suite; scenario matrix; preflight simulator API.  
  *Acceptance:* coverage ≥ 90%; preflight endpoint returns allow/deny + rationale; golden tests green.

### EPIC C — Provenance Ledger & Receipts
- **C1. Receipt Schema v1 (signed)**  
  *Stories:* envelope (action, actor, inputs, decision, hashes); notary adapter; selective disclosure fields.  
  *Acceptance:* receipts stored with hash chain; verification CLI passes; redaction rules respected.
- **C2. Evidence Compaction & Export**  
  *Stories:* content‑addressed store; compaction job; export bundle with manifest.  
  *Acceptance:* 10k receipts export < 60s; bundle verifies; compaction reduces size ≥ 60%.

### EPIC D — Metering & FinOps
- **D1. Metering Pipeline (Kafka → Store)**  
  *Stories:* event schema; idempotent consumers; DLQ + replay; provenance stamps.  
  *Acceptance:* 100k events/hr; replay maintains order; DLQ policy exercised in drill.
- **D2. Cost Attribution & Dashboard v1.0**  
  *Stories:* unit‑price catalog; tag normalization; per‑tenant COGS; anomaly alert.  
  *Acceptance:* dashboard error ≤ 5% on fixture; anomaly rule fires on ±3σ swings.

### EPIC E — Supply Chain & Controls
- **E1. SBOM + SLSA + Cosign**  
  *Stories:* build attestations; image signing; admission gate.  
  *Acceptance:* unsigned image blocked in staging; SBOM attached to artifacts; attestations queryable.
- **E2. Dual‑Control Deletes + Purge Manifest**  
  *Stories:* policy for dual‑control; purge planner; audit replay.  
  *Acceptance:* delete requires 2 approvers; purge manifest signed; replay proves erasure lineage.

---
## 2) Definition of Done (CompanyOS)
- **Spec/Policy:** OAS updates; OPA bundle diff; acceptance tests & coverage report.
- **Tests:** unit/integration/load/regression green; simulation harness results attached.
- **Provenance:** evidence bundle & signed receipts; verification CLI output stored.
- **Observability:** Grafana dashboards + Prometheus alerts updated; SLOs & budgets documented.
- **Docs/Runbooks:** docs‑as‑code updated; threat model deltas; DR drill notes.
- **Packaging:** Helm/Terraform; seed data; feature flags & ramps; release notes.
- **Changelog:** perf + cost + risk impacts summarized.

---
## 3) Artifacts, Collateral, Scaffolds (ready to copy)
### 3.1 Repository Layout
```
companyos/
  services/
    graph/
    policy/
    provenance/
    metering/
  packages/
    oas/
    sdk-ts/
    opa-bundles/
    receipts-cli/
  ops/
    helm/
    terraform/
    dashboards/
    alerts/
    chaos/
  tools/
    loadgen/
    fixtures/
```

### 3.2 OpenAPI (OAS) — key endpoints (YAML excerpt)
```yaml
openapi: 3.0.3
info: { title: CompanyOS API, version: 0.22.0 }
paths:
  /graph/query:
    post:
      summary: Execute graph query
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GraphQuery'
      responses:
        '200': { $ref: '#/components/schemas/GraphResult' }
  /policy/preflight:
    post:
      summary: Simulate policy decision
      responses:
        '200': { description: Decision with rationale }
  /provenance/receipts/{id}:
    get:
      summary: Fetch signed receipt (selective disclosure)
  /metering/events:
    post:
      summary: Ingest metering events (idempotent)
components:
  schemas:
    GraphQuery: { type: object, properties: { query: { type: string }, vars: { type: object } } }
    GraphResult: { type: object, properties: { nodes: { type: array }, edges: { type: array } } }
```

### 3.3 Protobuf — Receipt Envelope (v1)
```proto
syntax = "proto3";
package companyos.provenance.v1;
message Receipt {
  string id = 1;
  string action = 2;          // e.g., entity.update
  string actor = 3;           // subject id
  string tenant = 4;
  string decision = 5;        // allow/deny
  bytes  evidence_hash = 6;   // sha256 of evidence blob
  string policy_version = 7;
  string created_at = 8;      // RFC3339
  map<string,string> selective = 9; // fields subject to redaction
  bytes  signature = 10;      // detached sig
}
```

### 3.4 Rego — ABAC Core (deny‑by‑default)
```rego
package companyos.authz

default allow = false

# example: entity.update requires role and region match
allow {
  input.user.roles[_] == "Editor"
  input.entity.region == input.user.region
}

# step‑up for high‑risk
require_mfa {
  input.action == "entity.delete"
}
```

### 3.5 SQL — Provenance Store (PostgreSQL)
```sql
create table if not exists receipts (
  id text primary key,
  tenant text not null,
  action text not null,
  actor text not null,
  decision text not null,
  policy_version text not null,
  evidence_hash bytea not null,
  created_at timestamptz not null,
  redactions jsonb default '{}'::jsonb
);
create index if not exists receipts_tenant_time on receipts(tenant, created_at desc);
```

### 3.6 Kafka Topics & Contracts
```
Topics:
- metering.events.v1 (key: event_id) — producer: services/* — consumer: metering
- provenance.receipts.v1 (key: receipt_id) — producer: services/* — consumer: provenance
- policy.bundle.updates (key: version) — producer: policy — consumers: all
```

### 3.7 Helm Values (snippets)
```yaml
image:
  repo: registry.internal/companyos/graph
  tag: 0.22.0
policy:
  bundleVersion: 1.8.0
  source: s3://policies/companyos/1.8.0.tgz
provenance:
  notaryUrl: https://notary.internal
  signingKeyRef: companyos-receipts-key
metering:
  kafka:
    brokers: ["kafka-1:9092","kafka-2:9092"]
```

### 3.8 Terraform (module stubs)
```hcl
module "companyos_kafka" {
  source = "./modules/kafka"
  topics = ["metering.events.v1","provenance.receipts.v1"]
}
module "notary" {
  source = "./modules/notary"
  signing_key_alias = "companyos-receipts-key"
}
```

### 3.9 Grafana Dashboard (JSON sketch)
```json
{
  "title": "CompanyOS — Graph/Policy/Provenance/Metering",
  "panels": [
    {"type":"stat","title":"Graph p95 (ms)","targets":[{"expr":"histogram_quantile(0.95, sum(rate(graph_query_ms_bucket[5m])) by (le))"}]},
    {"type":"stat","title":"Error Rate p99","targets":[{"expr":"sum(rate(http_5xx_total[5m])) / sum(rate(http_total[5m]))"}]},
    {"type":"graph","title":"Receipts/sec","targets":[{"expr":"sum(rate(provenance_receipts_total[1m]))"}]},
    {"type":"graph","title":"Metering ingest/sec","targets":[{"expr":"sum(rate(metering_events_total[1m]))"}]}
  ]
}
```

### 3.10 Prometheus Alerts
```
- alert: GraphLatencyHigh
  expr: histogram_quantile(0.95, sum(rate(graph_query_ms_bucket[5m])) by (le)) > 1500
  for: 10m
  labels: { severity: warning }
  annotations: { summary: "Graph p95 > 1.5s" }

- alert: UnsignedImageBlocked
  expr: increase(admission_unsigned_image_blocked_total[10m]) > 0
  for: 0m
  labels: { severity: info }
  annotations: { summary: "Admission controller blocked unsigned image" }

- alert: MeteringDLQSpike
  expr: increase(metering_dlq_total[5m]) > 10
  for: 5m
  labels: { severity: critical }
  annotations: { summary: "Metering DLQ spike" }
```

### 3.11 Seed Fixtures & Loadgen
```json
{
  "tenant": "pilot-1",
  "graph": { "nodes": 50000, "edges": 220000 },
  "queries": ["rel(3hop, 'svc:A'→'db:*')", "who_can('export', 'dataset:prod')"],
  "events": { "rate_per_sec": 30, "duration_min": 60 }
}
```

**Makefile**
```
perf:
	tools/loadgen --tenant pilot-1 --fixture fixtures/graph50k.json --qps 50 --duration 900
verify:
	receipts-cli verify --bundle artifacts/evidence-bundle.tar.gz --strict
```

### 3.12 Evidence Bundle Manifest (YAML)
```yaml
bundle:
  version: 0.22.0
  receipts: s3://evidence/pilot-1/2025-10-31/*.json
  sbom: s3://artifacts/sbom/companyos-0.22.0.spdx.json
  attestations: s3://artifacts/slsa/companyos-0.22.0.intoto.jsonl
  policy_bundle: s3://policies/companyos/1.8.0.tgz
```

### 3.13 PR Template (CompanyOS)
```md
## What
-
## Why
-
## Proof
- [ ] Trace exemplar
- [ ] Perf numbers (p95/p99)
- [ ] Evidence bundle hash
## Policy
- [ ] OPA bundle version bump
- [ ] Simulation results
## Ops
- [ ] Helm/Terraform updates
- [ ] Feature flags & ramps
```

### 3.14 Release Notes Template
```md
# CompanyOS 0.22.0 — Sprint 22
**Highlights:** Graph perf pass, OPA coverage ≥ 90%, signed receipts, metering→FinOps v1.0.
**Perf:** 3‑hop p95 ≤ 1.5s (50k nodes)
**Security:** SBOM + SLSA; admission blocks unsigned images.
**FinOps:** per‑tenant COGS with ≤5% attribution error.
```

---
## 4) Milestones & Dates
- **2025‑10‑20 Mon:** Kickoff; policy bundle 1.8.0 published; perf fixtures loaded.
- **2025‑10‑23 Thu:** Perf checkpoint (A1); policy coverage report (B2) ≥ 75%; receipts E2E demo (C1).
- **2025‑10‑28 Tue:** Metering soak (D1); compaction/export demo (C2); admission gate drill (E1).
- **2025‑10‑31 Fri:** Canary Go/No‑Go; evidence bundle finalized; release notes cut.

---
## 5) RASCI
- **Responsible:** Core Platform (Graph/Policy/Provenance), Data/FinOps (Metering), Security/Platform (Supply chain)
- **Accountable:** CompanyOS Lead
- **Support:** SRE (dashboards/alerts), Legal+DPO (redaction/disclosure), Design (docs site), Partner Success (pilot)
- **Consulted:** Switchboard Team (approvals integration), Finance (unit costs)
- **Informed:** Exec, Compliance

---
## 6) Risks & Mitigations
- **Perf regressions from policy hooks** → decision cache; attribute prefetch; budget gates in CI.
- **Audit payload bloat** → compaction + content‑addressed storage; sample large payloads.
- **Attribution inaccuracies** → tag normalization + reconciliation job; finance‑signed unit price catalog.
- **Toolchain drift** → lock OPA/SBOM/SLSA versions; admission tests.

---
## 7) Acceptance Test Checklist
- [ ] 3‑hop graph p95 ≤ 1.5s on 50k nodes; traces attached
- [ ] Policy coverage ≥ 90%; simulation harness report stored
- [ ] Receipts signed; verification CLI passes; selective disclosure honored
- [ ] Metering throughput sustained; DLQ < 0.01%; dashboard error ≤ 5%
- [ ] SBOM/SLSA artifacts present; unsigned image blocked in drill

---
## 8) Packaging & Delivery
- Charts: `ops/helm/companyos-0.22.0`
- Terraform: modules for Kafka/notary/iam
- Seeds: graph50k fixture, unit price catalog, sample policies
- Evidence bundle: receipts + policy decisions + SBOM + attestations
- Screens/Docs: perf graphs, policy report, dashboard screenshots

