# Sprint Prompt — Maestro Composer (Backend) — Sprint 3

**Window:** Sep 29–Oct 10, 2025 (10 workdays, America/Denver)

**Squad:** Orchestrator Platform (Backend) — EM: **_ · PM: _** · TL: \_\_\_
**Codebases touched:** `apps/workflow-engine/*`, `server/*`, `packages/*` (prov-ledger, sdk, cli), `server/graphql/federation/*`, `ops/grafana/*`, `helm/*`, `k8s/*`, `contracts/policy/*`, `router/qos.yaml`, `docs/*`

---

## 0) Sprint North Star

Elevate Maestro Composer from “robust single‑region orchestration” to **resilient, reusable, and cost‑aware orchestration at scale**. Deliver sub‑workflows, compensation (sagas), deterministic result caching, bulk APIs, and multi‑tenant isolation. Ship active‑passive DR in stage with zero‑downtime deploys.

**Sprint‑end Definition of Success (binary):**

- Designers can **reuse** published workflows as **sub‑workflows** (version‑pinned) with inputs/outputs typed and validated.
- Runtime supports **compensation** for failed transactional graphs with rollback steps and idempotent guarantees.
- Deterministic **step result cache** reduces redundant calls; cache keys appear in provenance.
- **Bulk APIs** (import/export, bulk publish, bulk execute) exist and are policy‑gated.
- Stage demonstrates **DR failover** (active‑passive) with RPO ≤ 5m, RTO ≤ 30m; deploys are **blue/green**.
- Per‑tenant **isolation** (namespaced queues + budgets) enforced; noisy neighbor prevention verified.

**SLO add‑ons:** p95 sub‑workflow enqueue < 350ms; compensation dispatch latency < 500ms p95; cache hit ratio target ≥ 30% for deterministic HTTP/DB steps; DR failover recovery within 30m in stage.

---

## 1) Scope & Deliverables

### 1.1 Advanced Orchestration

- **Sub‑Workflows (Call/Invoke):** new step type `subworkflow` that invokes `workflow_version_id` with typed `inputSchema`/`outputSchema`.
  - Version pinning + compatibility check (semver range).
  - Fan‑out cap + circuit‑breaker integration.

- **Compensation/Sagas:** per step `compensate` handler; define transaction boundaries; global policy for when to run compensations (on error / on cancel).
  - Add `execution_events` types: `COMPENSATE_REQUESTED/STARTED/COMPLETED/FAILED`.
  - UI hooks via SSE unchanged.

### 1.2 Deterministic Result Caching

- Opt‑in **memoization** for pure/deterministic steps (HTTP GET, DB read, ML inference with stable model+params).
- Cache store in Redis with namespace `{tenant}:{workflowVersion}:{stepId}:{hash(inputs, env, secretRefs, externalIds)}`; eviction by TTL and LRU.
- **Provenance**: record cache hit/miss and cache key; analytics endpoint exposes hit‑rate.

### 1.3 Multi‑Tenant Isolation & Quotas v2

- Namespaced **queues per tenant** or per priority tier (router budget classes).
- Strict **budget enforcement** (token buckets) with per‑tenant backpressure and work shedding for non‑critical classes.
- Guardrails: payload size caps, step fan‑out limits, per‑tenant concurrency limiters.

### 1.4 DR, Blue/Green & Zero‑Downtime Migrations

- **Active‑passive DR** in stage (Region A→B): replica Postgres and Redis; promote via runbook; health probes and DNS failover.
- **Blue/Green deploys** for API + workers with queue drain + checkpoint resume.
- **Online migrations**: additive migrations only; ghost/expand‑contract pattern; migration linter in CI.

### 1.5 Bulk APIs & Artifact Portability

- **Import/Export**: tarball format containing workflow defs, templates, policies; signed manifest.
- **Bulk publish/execute** endpoints with job tracker; **rate‑limited & policy‑gated**.
- CLI additions: `mc workflows export|import`, `mc workflows bulk-publish`.

### 1.6 Policy & Compliance v3

- **OPA decision caching** (in‑memory with TTL + ETag on bundles).
- **Data retention** enforcement job (TTL for `execution_events`, logs) with export to object storage and keyed encryption (KMS).
- **DLP hooks** (PII detection stubs) with policy flags to block export if PII present and no legal basis.

### 1.7 Observability v3

- **Queue depth & saturation** per tenant; predictive alerts (burn‑rate).
- **Step heatmaps** (duration×retry×error) per action type.
- **DR dashboard**: replication lag, failover health; deploy safety checks.

---

## 2) API Surface (additions)

- `POST /api/workflows/:id/versions/:ver/invoke` — invoke as sub‑workflow (server enqueues child execution; returns child `executionId`).
- `POST /api/executions/:id/compensate` — manual trigger; policy‑gated.
- `POST /api/workflows/export` · `POST /api/workflows/import` — signed artifact portability.
- `POST /api/workflows/bulk-publish` · `POST /api/workflows/bulk-execute` — async job; `GET /api/jobs/:id` status.
- `GET /api/analytics/cache-metrics` — hit/miss, evictions, TTLs per tenant/workflow.

OpenAPI must be updated; GraphQL add: `mutation enqueueSubworkflow(...)` and fields on `Execution` for `compensationState`.

---

## 3) Data Model (migrations)

- `subworkflow_edges(parent_version_id, child_version_id, mapping_json, created_at)`
- `compensation_handlers(version_id, step_id, handler_config_json)`
- `cache_index(tenant_id, workflow_version_id, step_id, cache_key, created_at, ttl_at, size_bytes, hit_count)`
- `jobs(id, type, status, payload_json, created_at, updated_at, error)`
- Extend `execution_events.event_type` enum with compensation events.

---

## 4) Epics → Stories → Acceptance Criteria

### Epic L — Sub‑Workflows & Reuse (13–21 pt)

1. **Sub‑Workflow Step Type (5 pt)**
   _AC:_ call published version with input/output schema validation; parent tracks child `executionId`; fan‑out cap; traces linked.
2. **Version Pinning & Compatibility (3 pt)**
   _AC:_ publish rejects incompatible changes if dependencies specify exact/semver range; diff explains breakage.
3. **GraphQL/CLI Support (2 pt)**
   _AC:_ CLI `mc subworkflow invoke`; GraphQL mutation resolves through gateway with auth.

### Epic M — Compensation/Sagas (8–13 pt)

4. **Compensation DSL & Runtime (5 pt)**
   _AC:_ per‑step `compensate` executes on configured policy; idempotent; events recorded.
5. **Manual Compensation Endpoint (2 pt)**
   _AC:_ ops can trigger compensation; audited & policy‑checked.

### Epic N — Caching & Performance (8–13 pt)

6. **Deterministic Result Cache (5 pt)**
   _AC:_ ≥30% hit‑rate on demo flows; cache keys visible in provenance; TTL respected.
7. **Cache Analytics & Controls (3 pt)**
   _AC:_ admin can invalidate by key/prefix; metrics surfaced; alerts on low hit‑rate.

### Epic O — Isolation & Quotas (5–8 pt)

8. **Tenant Namespaced Queues (3 pt)**
   _AC:_ workload isolation; chaos test shows neighbor unaffected.
9. **Guardrails (2 pt)**
   _AC:_ payload/step caps enforced; 413/429 emitted with retry‑after guidance.

### Epic P — DR & Deploys (8–13 pt)

10. **Stage DR (active‑passive) (5 pt)**
    _AC:_ simulated Region A failure; promote Region B within 30m; no data loss > 5m; runbook executed.
11. **Blue/Green + Online Migrations (3 pt)**
    _AC:_ deploys without downtime; ghost pattern validated; linter blocks forbidden changes.

### Epic Q — Bulk Ops & Portability (5–8 pt)

12. **Export/Import Artifacts (3 pt)**
    _AC:_ signed tarball round‑trips; verify signature; policies preserved.
13. **Bulk Publish/Execute (2 pt)**
    _AC:_ async job tracker; progress; rate‑limited; audited.

### Epic R — Policy, Retention & DLP (5–8 pt)

14. **OPA Decision Cache (3 pt)**
    _AC:_ p99 decision < 25ms; cache invalidates on bundle ETag change.
15. **Retention & Archive (2 pt)**
    _AC:_ TTL job trims; archives to object store with KMS key; restore documented.

### Epic S — Observability v3 (5–8 pt)

16. **Tenant Queue Dashboards (3 pt)**
    _AC:_ per‑tenant depth, lag, service time; alerts configured.
17. **DR & Deploy Safety Board (2 pt)**
    _AC:_ replication lag panel; canary pass/fail; release guard shows green.

---

## 5) Non‑Functional Requirements

- **Security:** least privilege; secrets only via vault refs; artifact signatures verified; strict request size limits.
- **Reliability:** graceful degradation on cache/DR components; circuit breakers everywhere.
- **Docs:** ADRs for sub‑workflows, compensation, caching, DR; runbooks for failover & blue/green.

---

## 6) Test Plan

- **Unit:** sub‑workflow IO mapping; cache hashing; compensation policy evaluator; OPA cache.
- **Integration:** parent↔child execution linking; cache invalidation; bulk ops job tracker; DR replica promotion smoke.
- **E2E:** demo app with nested sub‑workflows + compensation paths; chaos tests for tenant isolation and region failover.
- **Load:** k6: 1k RPS enqueue with 100 concurrent workers; measure cache hit‑rate impact.

---

## 7) Definition of Done

- All ACs green; coverage ≥ 80% on new modules.
- OpenAPI/GraphQL/CLI updated; examples in `/samples` runnable.
- Grafana dashboards + alerts for queues, cache, DR live.
- Stage proves DR failover within SLA; blue/green deploy verified; rollback tested.
- Security scans, migration linter, and policy checks pass in CI.

---

## 8) Day‑by‑Day Plan (suggested)

- **D1–D2:** Sub‑workflow step type, IO mapping, version pinning.
- **D3:** Compensation DSL + runtime plumbing; events & auditing.
- **D4:** Deterministic cache core; provenance/analytics wiring.
- **D5:** Tenant queues & guardrails; chaos isolation test.
- **D6:** DR replication setup + runbooks; failover rehearsal in stage.
- **D7:** Blue/green deploy flow + migration linter.
- **D8:** Bulk export/import + job tracker; CLI and GraphQL additions.
- **D9:** Observability dashboards; alerting; perf runs.
- **D10:** Bug‑burn; docs; stage demo & sign‑off.

---

## 9) Story Board (IDs temporary)

|  ID | Epic | Title                             | Points | Owner |
| --: | :--- | :-------------------------------- | :----: | :---- |
| L‑1 | L    | Sub‑workflow step type            |   5    |       |
| L‑2 | L    | Version pinning & compat checks   |   3    |       |
| L‑3 | L    | GraphQL/CLI subworkflow support   |   2    |       |
| M‑1 | M    | Compensation DSL & runtime        |   5    |       |
| M‑2 | M    | Manual compensation endpoint      |   2    |       |
| N‑1 | N    | Deterministic result cache        |   5    |       |
| N‑2 | N    | Cache analytics & controls        |   3    |       |
| O‑1 | O    | Tenant‑namespaced queues          |   3    |       |
| O‑2 | O    | Guardrails (payload/fan‑out caps) |   2    |       |
| P‑1 | P    | Stage DR (active‑passive)         |   5    |       |
| P‑2 | P    | Blue/green + online migrations    |   3    |       |
| Q‑1 | Q    | Export/import artifacts           |   3    |       |
| Q‑2 | Q    | Bulk publish/execute              |   2    |       |
| R‑1 | R    | OPA decision cache                |   3    |       |
| R‑2 | R    | Retention & archive               |   2    |       |
| S‑1 | S    | Tenant queue dashboards           |   3    |       |
| S‑2 | S    | DR & deploy safety board          |   2    |       |

---

## 10) Hand‑Off Artifacts (due by Sprint End)

- ADRs: **WF‑SUB‑005** (sub‑workflows), **WF‑SAGA‑006** (compensation), **WF‑CACHE‑007** (deterministic cache), **WF‑DR‑008** (DR & deploys).
- OpenAPI/GraphQL schema diffs; CLI updates & README.
- Grafana dashboards + alert rules; failover runbook.
