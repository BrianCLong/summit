# Sprint Prompt — Maestro Composer (Backend) — Sprint 2

**Window:** Sep 15–Sep 26, 2025 (10 workdays, America/Denver)
**Squad:** Orchestrator Platform (Backend) — EM: **_ · PM: _** · TL: \_\_\_
**Codebases touched:** `apps/workflow-engine/*`, `server/src/db/migrations/*`, `server/graphql/federation/*`, `packages/prov-ledger/*`, `contracts/policy/*`, `router/qos.yaml`, `k8s/*`, `helm/*`, `ops/grafana/*`, `docs/*`

---

## 0) Sprint North Star

**Harden the Maestro Composer backend from “works” to “operationally excellent.”** Deliver reliable connectors, first‑class scheduling, enforceable policy/compliance, step‑level observability, and multi‑tenant budgets. Enable federation & CLI so other services and the UI integrate without friction.

**Sprint‑end Definition of Success (binary):**

- Action steps (**email, Slack, Jira, HTTP API, DB, ML**) execute with real providers, retries, timeouts, and secret management.
- **Schedule runner** executes cron jobs across timezones with drift/missed‑tick recovery, audited, and idempotent.
- **OPA ABAC** gates in front of create/update/publish/execute with purpose‑of‑access; **provenance manifests** signed using `packages/prov-ledger`.
- **RED + step metrics** visible in Grafana; analytics endpoints backed by SQL functions are live.
- **Per‑tenant budgets/QoS** applied from `router/qos.yaml`.
- GraphQL federation exposes read queries + enqueue mutation; TS **CLI**/SDK published.

**SLOs (Sprint 2 add‑ons):** p95 step execution (networked) < 950ms for Slack/Jira/API; webhook verification < 15ms; schedule trigger skew < 2s @ p95; 99.9% policy decision latency < 25ms (in‑cluster OPA).

---

## 1) Scope & Deliverables

### 1.1 Connectors (real implementations)

Implement the placeholder actions in `apps/workflow-engine/src/services/WorkflowService.ts`:

- **Email** — SMTP or provider (SendGrid/Postmark) with templating; per‑tenant sender ID; DKIM domain config documented.
- **Slack** — Web API client; channel/user addressing; file upload; rich blocks; bot token from secret store.
- **Jira** — REST client; create/update issue; transition workflow; JQL search; OAuth/Token auth.
- **HTTP API** — generic fetch with auth strategies (Bearer, HMAC, API key in header/query), retries (exponential backoff + jitter), circuit breaker.
- **Database** — PG query exec with read/modify separation; safe parameterization; row count limit; timeout.
- **ML** — call internal service(s) (e.g., `services/graph-core` or `cognitive_insights_engine`); handle cold‑start with retries; include request/response hashes in provenance.

_All connectors adhere to:_ per‑step **timeouts**, **retries**, **idempotency key** usage, **secret refs** (env/vault), and structured logs. Update the JSON schema so each action type has typed `actionConfig`.

### 1.2 Scheduling & Triggers v2

- Create **schedule‑runner** loop that reads `scheduled_workflows` (see `server/src/db/migrations/014_workflow_automation_tables.sql`) and enqueues executions.
- **Cron parser** with timezone support; drift fix & missed‑tick replay window.
- Reconcile on boot; admin endpoint `POST /api/schedules/reconcile`.
- Audit and metrics: trigger counts, next_run lag, failures.

### 1.3 Webhooks v2 (Security & Ops)

- **HMAC‑SHA256** signed webhooks (`/api/webhooks/workflow/:workflowId/:triggerPath`) with nonce + timestamp replay window; per‑endpoint secrets in `workflow_webhooks`.
- **Rotation** API + background job; IP allowlist + rate limits; structured failure reasons.

### 1.4 Governance & Compliance v2

- **OPA integration:** use `contracts/policy/abac.rego` and gateway helper in `gateway/src/services/opa.ts` to enforce ABAC on `create/update/publish/execute`. Return machine‑readable deny reasons.
- **Purpose‑of‑access** propagation: require `x‑purpose` on sensitive endpoints; store in audit trail.
- **Provenance manifests:** integrate `packages/prov-ledger` — record per‑step hash inputs/outputs; export bundle on completion; verify with `verifyManifest`.
- **Data retention:** wire `cleanup_old_workflow_logs()` and add configurable TTLs; docs in `docs/DATA_RETENTION_POLICY.md`.

### 1.5 Observability, Analytics & Costing v2

- **Step‑level metrics** (duration, retries, error_class) + exemplars; OTEL span linking across API→worker; correlation IDs.
- **Analytics endpoints**: implement `GET /api/analytics/workflow-stats` and `/api/analytics/execution-metrics` to call SQL functions from migration `014_*` (timeline + aggregates).
- **Budgets/QoS:** apply tenant budgets from `router/qos.yaml`; token bucket per tenant; backpressure signals; emit "budget_exhausted" events.
- Grafana dashboards updated in `ops/grafana/provisioning/dashboards/*`.

### 1.6 Federation, SDK & CLI

- **GraphQL federation**: complete `server/graphql/federation/index.ts` with queries `workflow(id)`, `workflows`, `execution(id)` and **mutation** `enqueueExecution(workflowId, trigger)`.
- **CLI/SDK**: publish a private package exposing typed client + DX commands: `mc workflows publish/simulate/execute`, `mc schedules reconcile`, `mc webhooks rotate`.

### 1.7 Packaging & Deploy

- Helm subchart for **schedule‑runner** (separate deployment); HPA; liveness/readiness; env/secret examples.
- OPA & Prov‑ledger charts already in `k8s/`; ensure values + networkpolicy align.
- CI job for **k6** perf smoke (enqueue, connector RPS) and **chaos kill** worker.

---

## 2) Epics → Stories → Acceptance Criteria

### Epic G — Connectors Hardening (13–21 pt)

1. **Email Connector (3 pt)**
   _AC:_ templated send; provider + SMTP; retries; provenance hashes.
2. **Slack Connector (3 pt)**
   _AC:_ post message + file; mention user; error mapping.
3. **Jira Connector (3 pt)**
   _AC:_ create/update/transition; secure project mapping.
4. **HTTP API Connector + Circuit Breaker (2 pt)**
   _AC:_ backoff+jitter; breaker opens/closes; tracing.
5. **Database Action (2 pt)**
   _AC:_ parameterized exec; timeout; row limit; audit.
6. **ML Action (2 pt)**
   _AC:_ model/version headers; retries; confidence in result.

### Epic H — Scheduling & Webhooks (8–13 pt)

7. **Schedule Runner (4 pt)**
   _AC:_ p95 skew < 2s; missed‑tick replay; idempotent.
8. **Schedules Reconciler API (2 pt)**
   _AC:_ `/api/schedules/reconcile` idempotent; metrics exposed.
9. **Webhook HMAC + Rotation (3 pt)**
   _AC:_ rejects unsigned/replayed; rotation updates records; audit entries.

### Epic I — Governance & Compliance (8–13 pt)

10. **OPA ABAC Gates (5 pt)**
    _AC:_ deny with policy trace; purpose header persisted.
11. **Provenance Export & Verify (3 pt)**
    _AC:_ bundle emits; `verifyManifest` passes; hashes match down to step.

### Epic J — Observability & Costing (5–8 pt)

12. **Step Metrics + Exemplars (3 pt)**
    _AC:_ Grafana shows step lat/err/retry heatmap; trace links.
13. **Tenant Budgets (2 pt)**
    _AC:_ throttle when budget exhausted; events raised; 429s include retry‑after.

### Epic K — Federation & CLI (5–8 pt)

14. **GraphQL Subgraph + Enqueue Mutation (3 pt)**
    _AC:_ rover compose OK; gateway resolves; auth propagated.
15. **CLI/SDK (2 pt)**
    _AC:_ `mc` commands work end‑to‑end; examples in README.

---

## 3) Non‑Functional Requirements

- **Security:** strict input validation; secret refs only; HSTS; CSRF for webhook mgmt; rate limits by tenant.
- **Resilience:** graceful worker shutdown; retry budgets per tenant; DLQ & replay tooling.
- **Docs:** update API/GraphQL references; runbooks for schedules/webhooks; connector guides.

---

## 4) Dependencies

- Provider accounts/creds for Slack/Jira/Email; Vault/secret store ready.
- OPA deployment reachable; policy bundle at `contracts/policy/*`.
- Prov‑ledger lib (`packages/prov-ledger`) and chart (`k8s/prov-ledger/*`).

---

## 5) Risks & Mitigations

- **Third‑party throttling** → circuit breaker + backoff; retry budgets; playbooks.
- **Timezone drift** → centralize TZ handling; canary tests per TZ.
- **Policy false‑negatives** → contract tests; dry‑run policy mode in stage.

---

## 6) Test Plan

- **Unit:** connectors (mocks), cron compute, HMAC verifier, policy decisions.
- **Integration:** supertest for APIs; live Slack/Jira sandbox; DB action on stage read‑only DB.
- **E2E:** sample workflows calling all connectors; schedule/ webhook triggers; provenance verification.
- **Load:** k6 RPS per connector; chaos kill schedule‑runner.

---

## 7) Definition of Done

- All ACs green; coverage ≥ 80% on new modules.
- Grafana dashboards updated; alerts wired.
- Helm release to **stage** successful; rollback tested.
- Security scans + policy dry‑run pass; runbooks merged.

---

## 8) Day‑by‑Day Plan (suggested)

- **D1–D2:** Implement Email/Slack/Jira connectors; schema updates; tests.
- **D3:** HTTP API + DB + ML actions; retries/breakers.
- **D4:** Schedule‑runner + reconcile API; missed‑tick logic.
- **D5:** Webhook HMAC + rotation + audit.
- **D6:** OPA ABAC gates; purpose propagation.
- **D7:** Provenance export/verify; budget/QoS integration.
- **D8:** GraphQL subgraph + enqueue; CLI/SDK.
- **D9:** Observability dashboards; perf/chaos.
- **D10:** Bug‑burn, docs, stage deploy.

---

## 9) Story Board (IDs temporary)

|  ID | Epic | Title                      | Points | Owner |
| --: | :--- | :------------------------- | :----: | :---- |
| G‑1 | G    | Email connector            |   3    |       |
| G‑2 | G    | Slack connector            |   3    |       |
| G‑3 | G    | Jira connector             |   3    |       |
| G‑4 | G    | HTTP API + circuit breaker |   2    |       |
| G‑5 | G    | Database action            |   2    |       |
| G‑6 | G    | ML action                  |   2    |       |
| H‑1 | H    | Schedule runner            |   4    |       |
| H‑2 | H    | Schedules reconciler API   |   2    |       |
| H‑3 | H    | Webhook HMAC + rotation    |   3    |       |
| I‑1 | I    | OPA ABAC gates             |   5    |       |
| I‑2 | I    | Provenance export & verify |   3    |       |
| J‑1 | J    | Step metrics + exemplars   |   3    |       |
| J‑2 | J    | Tenant budgets (QoS)       |   2    |       |
| K‑1 | K    | GraphQL subgraph + enqueue |   3    |       |
| K‑2 | K    | CLI/SDK                    |   2    |       |

---

## 10) Hand‑Off Artifacts (due by Sprint End)

- Updated JSON Schema; connector docs; provider setup guide.
- Grafana dashboards JSON; alert rules; runbooks.
- Helm values + chart for schedule‑runner.
- CLI/SDK package + README; GraphQL schema.

---

### Notes from Repo Scan (grounding)

- Endpoints exist in `apps/workflow-engine/src/server.ts` (workflows CRUD, execute, analytics, webhooks, human tasks).
- Placeholder action methods present in `WorkflowService.ts` (`executeEmailAction`, `executeSlackAction`, etc.) → implement for real.
- DB migrations with full workflow tables & analytics functions at `server/src/db/migrations/014_workflow_automation_tables.sql`.
- Federation stub at `server/graphql/federation/index.ts`.
- Provenance library at `packages/prov-ledger/*`; OPA policies & charts under `contracts/policy/*` and `k8s/opa/*`.
- QoS budgets config in `router/qos.yaml`; Grafana provisioning under `ops/grafana/*`.
