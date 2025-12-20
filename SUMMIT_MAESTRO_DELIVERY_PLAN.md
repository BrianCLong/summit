# Summit Maestro — Delivery Plan (Jira Epics & Stories)

**Last Updated:** 2025‑08‑31 • **Owner:** Platform PM • **Scope:** Translate PRD milestones into Jira epics/stories and provide manifest schema examples (YAML/JSON).

---

## 0) Usage Notes

- **Issue Keys:** Placeholder keys (e.g., `SM‑101`)—replace with Jira project key on import.
- **Structure:** Epics → Stories → (Sub‑tasks optional). Each story includes acceptance criteria, estimate, and dependencies.
- **Labels:** Use labels to map to **MVP** (Oct 15, 2025) and **GA** (Dec 15, 2025) targets.

---

## 1) Roadmap Alignment

- **MVP (by 2025‑10‑15):** Control Plane, Runners (K8s/Container/Local), TS/Py SDK (alpha), 10 reference tasks, 8 runbooks, Policy Gate (allow/deny), Provenance (alpha), Operator Console (runs/logs/retry/cancel).
- **GA (by 2025‑12‑15):** Signed manifests + approvals, Provenance GA + disclosure packager, Observability dashboards, Budgets/Quotas, CI/CD + Data/ETL blueprints, Supply‑chain hardening (SBOM/attestations).

---

## 2) Jira Epics (with Objectives)

| Epic Key     | Name                           | Objective                                            | Labels     |
| ------------ | ------------------------------ | ---------------------------------------------------- | ---------- |
| EPIC‑SM‑CP   | Control Plane Foundation       | API, scheduler, metadata store online with SLOs      | `mvp`      |
| EPIC‑SM‑WF   | Workflow Compiler & DAG Engine | Declarative → DAG compiler; retries/backoff; caching | `mvp`      |
| EPIC‑SM‑RUN  | Execution Runners              | K8s Jobs, Container, Local; resource classes         | `mvp`      |
| EPIC‑SM‑SDK  | SDKs (TS/Python)               | Dev ergonomics; task/connector ABI                   | `mvp`      |
| EPIC‑SM‑POL  | Policy Gate (PDP)              | OPA/ABAC evaluation at execution                     | `mvp`      |
| EPIC‑SM‑PROV | Provenance & Disclosure        | Receipts (alpha→GA), disclosure packager             | `mvp`,`ga` |
| EPIC‑SM‑CON  | Operator Console               | Run views, logs, retry/cancel; DAG viz               | `mvp`      |
| EPIC‑SM‑OBS  | Observability & FinOps         | Metrics/traces/logs dashboards; budgets/quotas       | `ga`       |
| EPIC‑SM‑CAT  | Reference Tasks & Runbooks     | 10 tasks, 8 runbooks; golden paths                   | `mvp`      |
| EPIC‑SM‑BLUE | Blueprints (CI/CD & ETL)       | Reusable blueprints for SIG services                 | `ga`       |
| EPIC‑SM‑SEC  | Supply‑Chain Security          | SBOM, signed images, attestations                    | `ga`       |
| EPIC‑SM‑INT  | SIG Integration Contracts      | SIG ingest/claims/export interfaces; contract tests  | `mvp`,`ga` |

---

## 3) Stories by Epic

### EPIC‑SM‑CP — Control Plane Foundation

- **SM‑101 — Control Plane API skeleton**
  _Type:_ Story • _Estimate:_ 5 pts • _Labels:_ `mvp`
  _Desc:_ Scaffold REST/GRPC for `/workflows`, `/runs` with authn/authz stubs.
  _Acceptance:_
  - **Given** valid token **when** POST `/workflows` **then** manifest stored and digest returned.
  - **Given** unauthenticated request **then** 401.
    _Deps:_ none

- **SM‑102 — Scheduler & Queue MVP**
  _Type:_ Story • _Estimate:_ 8 pts • _Labels:_ `mvp`
  _Desc:_ FIFO/priority queue, lease/heartbeat, retry with backoff.
  _Acceptance:_ p95 scheduling decision < 500ms at 100 RPS; retries exponential with jitter.
  _Deps:_ SM‑101

- **SM‑103 — Metadata Store (Runs/Tasks)**
  _Type:_ Story • _Estimate:_ 5 pts • _Labels:_ `mvp`
  _Acceptance:_ Run and TaskExec persisted with status transitions; list/filter by time, status, workflowRef.
  _Deps:_ SM‑101

- **SM‑104 — Control Plane SLOs & Health**
  _Type:_ Story • _Estimate:_ 3 pts • _Labels:_ `mvp`
  _Acceptance:_ `/healthz`, `/readyz`, SLO monitors (99.9% control-plane availability).
  _Deps:_ SM‑101, SM‑102

---

### EPIC‑SM‑WF — Workflow Compiler & DAG Engine

- **SM‑111 — Manifest parser & schema validation** • 5 pts • `mvp`
  _Acceptance:_ Invalid manifests rejected with line/field detail; JSON Schema enforced.
- **SM‑112 — DAG builder with dependencies** • 8 pts • `mvp`
  _Acceptance:_ fan‑out/fan‑in, conditional branches; deterministic topological order.
- **SM‑113 — Retries/Timeouts/Guards** • 5 pts • `mvp`
  _Acceptance:_ Per‑task retry policy; global timeout honored; circuit‑break on N failures.
- **SM‑114 — Task caching & replay** • 8 pts • `ga`
  _Acceptance:_ Cache hit on identical inputs/code digest; replay reproduces artifacts hash‑equal.

---

### EPIC‑SM‑RUN — Execution Runners

- **SM‑121 — K8s Jobs runner** • 8 pts • `mvp`
  _Acceptance:_ Pod templates per resource class; namespaced isolation; logs streamed.
- **SM‑122 — Container runner** • 5 pts • `mvp`
  _Acceptance:_ Local container exec; artifacts mounted; exit codes mapped to status.
- **SM‑123 — Local dev runner** • 3 pts • `mvp`
  _Acceptance:_ CLI runs workflow locally; mock secrets; trace emission.
- **SM‑124 — Serverless adapter (alpha)** • 5 pts • `ga`
  _Acceptance:_ Adapter invokes function on demand; idempotent retries documented.

---

### EPIC‑SM‑SDK — SDKs (TS/Python)

- **SM‑131 — Task/Connector ABI (TS)** • 5 pts • `mvp`
  _Acceptance:_ `init/validate/execute/emit` lifecycle; type defs shipped.
- **SM‑132 — Python SDK (alpha)** • 5 pts • `mvp`
  _Acceptance:_ Parity with TS minimal set; publishing to PyPI (internal index ok).
- **SM‑133 — Samples & quickstarts** • 3 pts • `mvp`
  _Acceptance:_ Hello‑task, connector skeleton, end‑to‑end example.

---

### EPIC‑SM‑POL — Policy Gate (PDP)

- **SM‑141 — PDP client & purpose binding** • 5 pts • `mvp`
  _Acceptance:_ Calls to PDP require `purpose/authority/license`; denials halt task with reason.
- **SM‑142 — Policy annotations in manifest** • 3 pts • `mvp`
  _Acceptance:_ Manifests carry policy context; surfaced in run logs.
- **SM‑143 — Audit trail for decisions** • 3 pts • `ga`
  _Acceptance:_ Immutable decision logs (WORM) with correlation IDs.

---

### EPIC‑SM‑PROV — Provenance & Disclosure

- **SM‑151 — Provenance receipt (alpha)** • 5 pts • `mvp`
  _Acceptance:_ Receipt includes inputs hash, code digest, outputs hash, signer.
- **SM‑152 — Receipt exposure in Console** • 3 pts • `mvp`
  _Acceptance:_ Link from run to receipt; downloadable JSON.
- **SM‑153 — Disclosure packager** • 8 pts • `ga`
  _Acceptance:_ Bundles artifacts + receipts; verifies on import.
- **SM‑154 — In‑toto/SLSA attestations** • 5 pts • `ga`
  _Acceptance:_ Attestation generated per release; signature verifiable.

---

### EPIC‑SM‑CON — Operator Console

- **SM‑161 — Runs list & detail view** • 5 pts • `mvp`
  _Acceptance:_ Filter by status/workflow/namespace; detail shows tasks and logs.
- **SM‑162 — Retry/Cancel actions** • 3 pts • `mvp`
  _Acceptance:_ Retry idempotent; cancel sends signal and updates status.
- **SM‑163 — DAG visualization** • 5 pts • `ga`
  _Acceptance:_ Graph view with task states; zoom/pan; critical path highlight.

---

### EPIC‑SM‑OBS — Observability & FinOps

- **SM‑171 — Metrics & traces (OTel)** • 5 pts • `ga`
  _Acceptance:_ Standard metrics emitted; traces linked to SIG ops.
- **SM‑172 — Dashboards (MTTR, success rate, backlog)** • 3 pts • `ga`
  _Acceptance:_ Prebuilt dashboards; alerts for SLO breaches.
- **SM‑173 — Budgets/Quotas per namespace** • 5 pts • `ga`
  _Acceptance:_ Budget guard fails task pre‑execution; usage reports exportable.

---

### EPIC‑SM‑CAT — Reference Tasks & Runbooks

- **SM‑181 — 10 reference tasks** • 5 pts • `mvp`
  _Acceptance:_ HTTP, gRPC, Kafka/NATS, S3/Blob, DB RW, schema‑validate, notify, wait, approval gate, SIG ingest.
- **SM‑182 — 8 cataloged runbooks** • 5 pts • `mvp`
  _Acceptance:_ Dev bootstrap, demo seed, ingest backfill, schema replay, chaos drill, disclosure packager (stub), deploy promote, rollback.

---

### EPIC‑SM‑BLUE — Blueprints (CI/CD & ETL)

- **SM‑191 — CI/CD blueprint for SIG services** • 5 pts • `ga`
  _Acceptance:_ Template compiles/tests/deploys with env promotion & approvals.
- **SM‑192 — Data/ETL blueprint** • 5 pts • `ga`
  _Acceptance:_ Ingest → validate → enrich → hand‑off; contract tests vs SIG.

---

### EPIC‑SM‑SEC — Supply‑Chain Security & Hardening

- **SM‑201 — Image signing & verification** • 5 pts • `ga`
  _Acceptance:_ Sigstore signing in CI; verification at runner start.
- **SM‑202 — SBOM generation** • 3 pts • `ga`
  _Acceptance:_ SBOM attached to releases; stored and queryable.
- **SM‑203 — CIS hardening checks** • 5 pts • `ga`
  _Acceptance:_ Benchmarks pass thresholds; exceptions tracked.

---

### EPIC‑SM‑INT — SIG Integration Contracts

- **SM‑211 — Ingest API client & schema** • 5 pts • `mvp`
  _Acceptance:_ Batch + stream clients; schema versioning.
- **SM‑212 — Claims/Provenance API client** • 3 pts • `mvp`
  _Acceptance:_ Register claims; link receipts.
- **SM‑213 — Runbooks trigger API (allow‑listed)** • 3 pts • `ga`
  _Acceptance:_ SIG can trigger approved runbooks; PDP enforced.
- **SM‑214 — Contract tests in CI** • 5 pts • `ga`
  _Acceptance:_ Breaking change blocks merge; N‑2 compatibility verified.

---

## 5) Ops / Runbook / ADR (Price-Aware Orchestration)

- **ADR-051 (Accepted):** `docs/architecture/ADR-051-Price-Aware-Orchestration.md`
- **Runbook:** `docs/runbooks/price-aware-orchestration.md`
- **Dashboard:** `ops/grafana/dashboards/price-aware-orchestration.json`
- **Alerts:** `ops/prometheus/alerts/price-aware-orchestration.rules.yaml`

## 4) Cross‑Epic Dependencies (Summary)

- `SM‑102` → required by `SM‑121/122/123` (runners need scheduler).
- `SM‑141/142` → gate for any story that touches sensitive targets.
- `SM‑151` → prerequisite for `SM‑153` (disclosure).
- `SM‑171` → prerequisite for `SM‑172/173` (dashboards/quotas).

---

## 5) Example Jira Import CSV (Optional snippet)

```
Issue Type,Summary,Description,Labels,Story Points,Epic Link
Epic,EPIC‑SM‑CP,Control Plane Foundation,mvp,,
Story,SM‑101 Control Plane API skeleton,Scaffold REST/GRPC for /workflows and /runs,mvp,5,EPIC‑SM‑CP
Story,SM‑102 Scheduler & Queue MVP,FIFO/priority queue with backoff,mvp,8,EPIC‑SM‑CP
```

---

## 6) Manifest Schemas & Examples

_See the `schemas/` directory for detailed manifest schemas and examples._

### Schema Snippets

**Policy Annotation Snippet (YAML)**

```yaml
spec:
  policy:
    purpose: disclosure
    authority: legal:ombuds
    license: internal
  tasks:
    - id: export_bundle
      uses: tasks/sig.export@1.0.0
      with:
        requestId: ${params.requestId}
```

**Example Secret & Identity References (YAML)**

```yaml
with:
  endpoint: ${secrets.SIG_INGEST_URL}
  identity: ${workload.identity}
```

---

## 7) Definition of Done (Stories)

- Unit tests ≥ 80% for new modules (or rationale documented).
- Structured logs + OTel traces present.
- Security review (where applicable) complete; threat model updated.
- Docs updated (Quickstart/Reference/Samples) and linked from story.

---

## 8) Import/Automation Hints

- Use the CSV snippet as a template for bulk import; set Epic Links after epics are created.
- Apply Components in Jira to mirror epics (e.g., `control‑plane`, `runners`, `sdk`, `policy`, `provenance`, `console`).
- Create two Jira Boards: **MVP Delivery** (filter `labels = mvp`) and **GA Delivery** (filter `labels = ga`).
