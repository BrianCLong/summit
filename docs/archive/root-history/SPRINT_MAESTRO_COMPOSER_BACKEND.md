# Sprint Prompt — Maestro Composer (Backend)

**Window:** Sep 2–Sep 13, 2025 (10 workdays, America/Denver)
**Squad:** Orchestrator Platform (Backend) — EM: **_ · PM: _** · TL: \_\_\_
**Codebases touched:** `apps/workflow-engine/*`, `server/*` (GraphQL gateway integration), `prov-ledger/*`, `services/*`, `helm/*`, `terraform/*`, `docs/*`

---

## 0) North Star

**Build a production‑ready backend for the Maestro Composer** — a workflow/runbook authoring & execution service that lets the UI compose DAGs, validate them, version them, simulate them, execute them at scale, and audit everything. First‑class **governance, provenance, and policy**. Zero‑downtime deploys.

**Success at Sprint End** (binary):

- A designer in the Composer UI can **create → validate → publish → dry‑run → execute** a workflow via backend APIs.
- Executions are **durable, idempotent, observable**, and **audited** in the provenance ledger.
- Policies (ABAC/OPA) are enforced for CRUD and execution.
- Helm chart deploys green in stage; smoke & k6 perf tests pass; SLO dashboards live.

**SLOs (initial):** p95 `POST /api/workflows/:id/execute` < 300ms enqueue; p95 step handler latency < 1.5s baseline; 0 data loss on worker crash (exactly‑once semantics via idempotency keys + checkpointing).

---

## 1) Scope & Deliverables

### 1.1 API Surface (v1)

Expose/finish the following REST (+OpenAPI) and optional GraphQL subgraph:

- **Workflow CRUD**
  - `POST /api/workflows` — create draft; server assigns `workflowId` & `version=0.1.0-draft`.
  - `GET /api/workflows` — list (filters: owner, tag, state, updatedSince).
  - `GET /api/workflows/:id` — read including latest **published** and **draft**.
  - `PUT /api/workflows/:id` — update draft; server validates against JSON Schema.
  - `DELETE /api/workflows/:id` — soft delete (policy‑gated).

- **Versioning & Publishing**
  - `POST /api/workflows/:id/publish` — transitions `draft → published` (semver bump, immutable snapshot; provenance record created).
  - `POST /api/workflows/:id/clone` — copy to new draft.
  - `GET /api/workflows/:id/versions` — list; diff metadata.

- **Validation & Simulation**
  - `POST /api/workflows/validate` — DAG compile (cycle check, unreachable steps, type checks, timeout/retry lint).
  - `POST /api/workflows/simulate` — dry‑run with mocked step results; returns path decisions, timing, cost estimate.

- **Execution**
  - `POST /api/workflows/:id/execute` — enqueue execution; returns `executionId`.
  - `GET /api/executions` — list (filters: status, startedAfter, workflowId, tenant).
  - `GET /api/executions/:id` — state + step timeline + logs (SSE channel `/api/executions/:id/stream`).
  - `POST /api/executions/:id/cancel` · `POST /api/executions/:id/retry`

- **Triggers**
  - `POST /api/webhooks/workflow/:workflowId/:triggerPath` — HMAC‑signed webhooks; rate‑limited.
  - `POST /api/schedules/reconcile` — ensure cron schedules registered (idempotent).

- **Human‑in‑the‑Loop**
  - `GET /api/human-tasks` · `GET /api/human-tasks/:id` · `POST /api/human-tasks/:id/complete` (+assign/escalate).

- **Templates & Builder**
  - `GET /api/workflow-templates` · `POST /api/workflow-templates/:id/create`
  - `POST /api/workflow-builder` — programmatic construction for common patterns (routing, RAG, ETL, approvals).

- **Analytics & Cost**
  - `GET /api/analytics/workflow-stats` · `GET /api/analytics/execution-metrics` — RED/USE metrics and estimated cost per run.

**OpenAPI v3** must be generated & published (swagger.json + Redoc page). **GraphQL (optional)**: federate read‑only queries into the gateway (`workflow(id)`, `workflows`, `execution(id)`).

### 1.2 Data Model (Postgres + Redis + Neo4j)

Create migrations & models for:

- `workflow_definitions(id, tenant_id, name, slug, description, owner_id, tags[], created_at, updated_at, state[draft|published|archived])`
- `workflow_versions(id, workflow_id, semver, schema_json, compiled_plan_json, policy_digest, published_at, published_by)`
- `workflow_steps(version_id, step_id, type, config_json, connections_json, created_at)`
- `workflow_executions(id, workflow_version_id, tenant_id, correlation_id, status, started_at, finished_at, error, cost_estimate_cents)`
- `execution_events(id, execution_id, ts, step_id, event_type, payload_json)`
- `human_tasks(id, execution_id, step_id, assignees[], due_at, form_schema_json, state)`
- `webhook_secrets(workflow_id, trigger_path, secret, rotation_at)`

**Redis**: queues, dedupe keys (idempotency), rate limit buckets.
**Neo4j**: optional linkage: store DAG topology for graph queries & XAI overlays (nodes: Step; edges: Flow).

### 1.3 DSL & Validation

- Author a **JSON Schema** for `WorkflowDefinition` (steps: `task|condition|loop|human|subprocess|delay`; triggers: `event|webhook|schedule`).
- Implement a **compiler** that produces a normalized DAG with: topological order, fan‑out limits, step timeouts, retry/backoff policy, and resource hints (CPU/mem/quota).
- Build **linters**: missing timeouts, unbounded retries, orphaned outputs, secret usage without vault reference, policy label absence.

### 1.4 Governance, AuthZ, Audit

- **ABAC/RBAC** via OPA policies; bind attributes: `tenant`, `role`, `clearance`, `purpose`, `legal_basis`.
- **Provenance integration** with `prov-ledger`: register (a) published versions (hash manifest), (b) execution evidence bundle (inputs, decisions, outputs) with license & reason‑for‑access.
- **Reason‑for‑access prompts** on sensitive calls; log to audit index.

### 1.5 Observability & SRE

- **OTEL tracing** across API→queue→worker; **Prom metrics** (RED); **health** `/health` includes dependencies.
- Grafana dashboards (latency, queue depth, failures, timeouts).
- **Budgets/Backpressure**: token buckets per tenant; slow‑query/execution killers; QoS governed by `router/qos.yaml`.
- **Chaos**: pod kill of worker verifies at‑least‑once with idempotency.

### 1.6 Packaging & Deploy

- Helm chart for `workflow-engine` (deployments: api, worker; config: Postgres/Redis/Neo4j/OPA endpoints; secrets via sealed‑secrets).
- Terraform modules (env wiring); preview env per PR.

---

## 2) Epics → Stories → Acceptance Criteria

### Epic A — Definitions & Versioning (8–13 pt)

1. **JSON Schema + Type Guards (3 pt)**
   _AC:_ Invalid graphs rejected with actionable errors; 100% sample fixtures validated.
2. **Versioning & Publish Flow (3 pt)**
   _AC:_ `draft→published` immutability; semver bump; provenance record stored.
3. **Diff & Snapshot (2 pt)**
   _AC:_ `/versions` returns structural diff summary (added/removed/changed steps).

### Epic B — Execution Runtime (13–21 pt)

4. **Queue & Worker Pool (5 pt)** — Redis streams + consumer groups; idempotent handlers.
   _AC:_ Exactly‑once observable behavior under retry; crash test passes; replay safe.
5. **Checkpointing & Recovery (5 pt)** — per‑step checkpoint records; resume on restart.
   _AC:_ Kill worker mid‑flight; resume within 30s; no duplicate side‑effects.
6. **Human Task State Machine (3 pt)** — assign/escalate/complete; SLA timers.
   _AC:_ SLA breach emits event; escalation policy fires.

### Epic C — Triggers & Webhooks (5–8 pt)

7. **HMAC Webhooks (3 pt)** — per‑workflow secret; rotation; replays rejected.
   _AC:_ Signature verify; clock skew tolerance; 429 on abuse.
8. **Schedule Reconciler (2 pt)** — cron registry; drift fix.
   _AC:_ Missed tick recovery window configurable; idempotent.

### Epic D — Governance & Audit (8–13 pt)

9. **OPA Policy Gates (5 pt)** — `create/update/publish/execute` checks w/ reasons.
   _AC:_ Denied calls return machine‑readable rationale & appeal path.
10. **Provenance Hooks (3 pt)** — publish + execution export to ledger.
    _AC:_ External verifier validates manifest; hash tree matches.

### Epic E — Observability & SLOs (5–8 pt)

11. **OTEL + RED (3 pt)** — tracing spans, RED metrics, dashboards.
    _AC:_ Dashboards show live runs; alerts on SLO burn.
12. **Perf Baseline (2 pt)** — k6 smoke profiles
    _AC:_ p95 enqueue < 300ms; sustained 200 RPS enqueue with < 1% error.

### Epic F — Federation & SDK (5–8 pt)

13. **GraphQL Read Subgraph (3 pt)** — `workflow`, `workflows`, `execution` queries.
    _AC:_ Rover compose OK; gateway resolves.
14. **TS SDK (2 pt)** — thin client for Composer UI.
    _AC:_ Single import yields typed client; examples compile.

> **Note:** Existing endpoints under `apps/workflow-engine/src/server.ts` provide a head start; the sprint finishes missing behaviors, hardens contracts, and adds provenance/policy/observability.

---

## 3) Non‑Functional Requirements

- **Security:** JWT/OIDC auth; scope checks; input validation; secrets in vault; TLS only; rate limits per tenant.
- **Privacy & Policy:** purpose limitation tags; license/TOS engine consulted on export.
- **Resilience:** RTO ≤ 1h, RPO ≤ 5m; DR docs; graceful degradation.
- **Docs:** OpenAPI/Redoc; runbooks (operator, on‑call); ADRs for schema, runtime choices.

---

## 4) Dependencies

- Postgres, Redis, Neo4j endpoints available in stage; OPA & policy bundles; `prov-ledger` API reachable.
- Gateway federation plumbing (Apollo Rover) or direct GraphQL addition to `server/*`.

---

## 5) Risks & Mitigations

- **Lost idempotency → duplicate side‑effects** → use idempotency keys + outbox pattern; compensating actions.
- **Policy regressions** → contract tests w/ policy fixtures; dry‑run sim.
- **Perf cliffs on fan‑out** → concurrency caps; backpressure; budget guards.

---

## 6) Test Plan

- **Unit:** compiler/validator, policy gates, HMAC verifier, worker idempotency.
- **Integration:** supertest API suite; Redis/PG/Neo4j containers; provenance calls mocked.
- **E2E:** sample workflows (routing, RAG, approval) from template → publish → simulate → execute.
- **Load:** k6 enqueue/run; chaos kill worker; verify checkpoints.

---

## 7) Definition of Done (DoD)

- All ACs green; coverage ≥ 80% on `apps/workflow-engine/src/*` critical paths.
- OpenAPI published; examples in `/samples` runnable.
- Dashboards & alerts wired; on‑call runbook updated.
- Helm release to **stage** successful; rollback plan committed and tested.
- Security checks (dependency scan, secret lint, OPA dry‑run) pass in CI.

---

## 8) Day‑by‑Day Plan (suggested)

- **D1–D2:** JSON Schema, compiler, lints; base migrations; OpenAPI skeleton.
- **D3–D4:** Queue/worker + idempotency; checkpoints; HMAC webhooks.
- **D5:** OPA gates; provenance publish.
- **D6:** Observability; dashboards; perf baseline.
- **D7:** GraphQL subgraph + TS SDK.
- **D8:** E2E flows & chaos drills.
- **D9:** Docs, Helm, Terraform, smoke in stage.
- **D10:** Buffer, bug‑burn, release review.

---

## 9) Story Board (IDs temporary)

|  ID | Epic | Title                              | Points | Owner |
| --: | :--- | :--------------------------------- | :----: | :---- |
| A‑1 | A    | Author JSON Schema + guards        |   3    |       |
| A‑2 | A    | Publish flow + semver + provenance |   3    |       |
| A‑3 | A    | Version diff endpoint              |   2    |       |
| B‑1 | B    | Redis queue + worker pool          |   5    |       |
| B‑2 | B    | Step checkpoints & resume          |   5    |       |
| B‑3 | B    | Human task state machine           |   3    |       |
| C‑1 | C    | HMAC webhooks + rotation           |   3    |       |
| C‑2 | C    | Schedule reconciler                |   2    |       |
| D‑1 | D    | OPA policy gates for CRUD/exec     |   5    |       |
| D‑2 | D    | Provenance hooks (publish/exec)    |   3    |       |
| E‑1 | E    | OTEL spans + RED metrics           |   3    |       |
| E‑2 | E    | k6 perf baselines                  |   2    |       |
| F‑1 | F    | GraphQL read subgraph              |   3    |       |
| F‑2 | F    | TS SDK for Composer UI             |   2    |       |

---

## 10) Hand‑Off Artifacts (due by Sprint End)

- OpenAPI (`/apps/workflow-engine/openapi.yaml`), Redoc HTML, GraphQL schema (if used).
- Helm chart + values examples; Terraform module.
- ADRs: **WF‑DSL‑001** (schema/DSL), **WF‑RUNTIME‑002** (queue/checkpointing), **WF‑POLICY‑003** (OPA gates), **WF‑PROV‑004** (ledger integration).
- Sample workflows in `/samples/workflows/*` with `simulate.sh` and `run.sh`.
- Grafana dashboards JSON + alert rules; runbooks in `docs/`.

---

### Out of Scope (this sprint)

- Frontend Composer UI beyond SDK integration.
- Advanced connectors, long‑running external jobs (leave stubs).
- Multi‑region DR (document plan only).
- Marketplace for templates (prototype later).

---

**Kickoff Checklist (5 min):** env vars set; Postgres/Redis/Neo4j reachable; policy bundle loaded; provenance endpoint configured; preview env alive.
**Stand‑ups:** blockers called early; critical path is **compiler → runtime → policy → provenance**.
