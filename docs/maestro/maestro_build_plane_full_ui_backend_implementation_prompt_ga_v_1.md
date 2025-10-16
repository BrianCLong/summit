# Maestro Build Plane — Full UI & Backend Implementation Prompt (GA v1.0)

> Target: **maestro-dev.topicality.co** (dev) → staging → prod. This prompt consolidates the existing repo docs/code and the competitor matrix into a single, build-ready brief for UI + backend to reach complete, operator-grade functionality.

---

## 0) Vision & Scope

- **North Star:** A _single, intuitive control plane_ for everything the Maestro build plane does: plan → build → verify → ship → observe → prove. Visual-first, policy-first, evidence-first.
- **Personas:** Operator (primary), SRE, Release Manager, Security/Compliance, Finance/FinOps, Developer, Exec Observer.
- **Outcomes:**
  - Full **granular control** of pipelines, runs, routing, guardrails, budgets, and environments.
  - Deep **observability** (metrics, logs, traces, SLOs, error budgets, cost burn) with drilldowns to steps and artifacts.
  - **Evidence bundles**: one-click signed attestations (SBOM, cosign verify, policy checks, rollouts snapshots).
  - **Comparative excellence**: incorporate best UX/flows from leading CI/CD, gateways/routers, eval+guardrail suites.

---

## 1) Information Architecture (IA)

Top-level nav:

1. **Control Hub** (Home)
2. **Runs & Pipelines**
3. **Routing Studio** (Gateway/Model routing)
4. **Recipes Library** (Templates, verified builds)
5. **Observability** (SLOs, dashboards, alerts)
6. **Autonomy & Guardrails** (Policy, feature flags, safe launch)
7. **FinOps** (Budgets, quotas, cost analytics)
8. **Tickets & Integrations** (GitHub/Jira)
9. **Admin** (Access, connectors, secrets, audit)

Global:

- **Command Palette** (⌘K): actions, quick nav, resource lookup.
- **Environment Switcher**: dev/staging/prod; show drift and config deltas.
- **Omnibar**: search runs, pipelines, artifacts, tickets, alerts.
- **Status Ribbon**: live health (green/amber/red), current release, error budget %.

---

## 2) Screens & UX Flows

### 2.1 Control Hub

- **Release Overview:** current canary/% traffic, rollout health, quick actions (pause, promote, rollback).
- **Top KPIs:** build success %, mean lead time, p95 build duration, SLO burn, cost burn, queue depth.
- **What’s Hot/Cold:** flapping tests, flaky pipelines, noisy alerts, slowest steps, top cost centers.
- **Compliance at a Glance:** signatures verified, SBOM diff OK, policy denials (last 24h), evidence bundles generated.

### 2.2 Runs & Pipelines

- **Runs Table:** real-time stream; filters (status, pipeline, owner, label, env, branch, cost-range). Saved views.
- **Run Detail:**
  - Timeline (Gantt) of steps; **live logs** with structured fields; artifact list (images, SBOMs, reports).
  - **Attestations:** cosign verify status, SBOM digest, SLSA level; policy check results (OPA/Gatekeeper/Kyverno).
  - **Observability tab:** OTel trace waterfall; step metrics; linked Prom panels; related alerts.
  - **Evidence tab:** one-click **Witness Bundle** (deny test, synthetic alert, SLO + rollout snapshots, policy proof, artifact digests) → signed & downloadable.
  - **Controls:** rerun (same inputs), _promote from run_, create ticket, create recipe from run (templatize).
- **Pipeline Graph:** DAG with status heat; **Compare** pipeline versions (diff nodes/params/artifacts/policies). Export/share.
- **Visual Builder:** drag-drop steps, gates, and guards; parameter forms; input/output contracts; versioning & reviews.

### 2.3 Routing Studio (Gateway/Model Routing)

- **Candidates Panel:** per request/class with score breakdown (latency, cost, reliability, policy grade); **Pin/Unpin** overrides; **A/B** or **Canary** routing.
- **Policy Sheet:** allowed models/providers by env/tenant; data residency; rate/throughput limits; fallback strategy.
- **Traffic & Health:** per-provider success/latency, token/s/$ burn; backoff/failover events; saturation.
- **Key Management:** provider keys, scopes, quotas; per-tenant model aliases; incident “kill switches.”

### 2.4 Recipes Library

- Verified recipes (Signed templates): build/test/deploy patterns; infra as code; policy & budget presets.
- **Trust indicators:** signer, endorsements, last-used, reliability score.
- **One-click instantiate** → new pipeline, with guided parameters.

### 2.5 Observability

- **SLOs & Error Budgets:** per service (control plane, runners), per pipeline; burn-rate charts, triggers.
- **Dashboards:** latency, errors, throughput, queue; cost and time correlations; flaky test trends.
- **Alerts:** list & detail (annotations + runbook links); **Ack/Assign** (sync to PagerDuty/Jira if configured).

### 2.6 Autonomy & Guardrails

- **Feature Flags / Safe Launch:** per feature/pipeline; exposure %, cohorts; guard conditions; auto-disable criteria.
- **Policy Center:** author/simulate **OPA/Rego** checks; import Kyverno/Gatekeeper; **What‑if** simulation; approval workflows.
- **Validation Suites:** pre‑merge & pre‑deploy checks; red-team prompts; jailbreak defenses; data/provenance policies.

### 2.7 FinOps

- **Budgets & Quotas:** tiering (bronze/silver/gold), monthly/quarterly caps; alerts at thresholds; freeze/slowdown actions.
- **Cost Explorer:** per run/step/model/provider/env; show $/artifact; forecast vs. actual; **burndown** w/ anomalies.

### 2.8 Tickets & Integrations

- **GitHub/Jira:** link PRs/issues to runs; auto-create/close rules; build badges; commit annotations; trace links in PR checks.

### 2.9 Admin

- **Access & Tenants:** roles, projects, env mapping, SCIM sync, SSO (OIDC/SAML), API tokens w/ scopes.
- **Connectors:** GitHub, Jira, Grafana/Prom, Alertmanager/PagerDuty, container registry, SBOM store, S3, gateways.
- **Secrets:** namespaced, rotated, access logs; secret scanners; dry-run impact.
- **Audit:** immutable log (append-only); export signed CSV/JSON.

---

## 3) Data Model (Core Entities)

- **Pipeline** {id, name, version, dag, params, policies[], flags[], createdBy, verifiedBy}
- **Run** {id, pipelineId, commit, env, status, startedAt, endedAt, durationMs, cost{}, inputs{}, outputs{}, artifacts[], attestations[], alerts[], traceId}
- **Step** {id, runId, name, status, logs, metrics, attemptN}
- **Artifact** {id, type, uri, digest, sbomRef?, signed:boolean}
- **Attestation** {id, type:[SBOM|SLSA|Cosign], status, details, evidence[]}
- **Policy** {id, type:[OPA|Kyverno|Gatekeeper], source, version, result, reason}
- **Budget** {id, tier, caps{tokens,usd}, usage[], alerts[]}
- **Provider/Model** {id, provider, model, quota, health, alias}
- **Ticket** {id, source, key, status, assignee, links{runId, pipelineId}}
- **User/Tenant** {id, roles[], scopes[], projects[]}

---

## 4) API & Events (Contracts)

> Default: REST + SSE for streams; GraphQL acceptable for reads. All responses JSON. Auth via OIDC JWT (bearer) + tenant scopes.

### 4.1 REST (examples)

- `GET /api/runs?status=&pipeline=&env=&q=&limit=&cursor=` → RunPage
- `GET /api/runs/{id}` → RunDetail (expand steps, artifacts, attestations)
- `GET /api/runs/{id}/logs?step=&since=` → NDJSON (structured log stream)
- `POST /api/runs/{id}/actions` {action: "promote"|"pause"|"resume"|"rerun"}
- `GET /api/pipelines` / `POST /api/pipelines` / `PUT /api/pipelines/{id}`
- `POST /api/pipelines/{id}/simulate` {changes, policies[]} → {diff, violations[]}
- `GET /api/routing/candidates?class=req.type` → {candidates[] with scores}
- `POST /api/routing/pin` {class, provider, model, ttl?}
- `GET /api/recipes` / `POST /api/recipes/{id}/instantiate`
- `GET /api/slo` → {service, slo, burn, alerts[]}
- `GET /api/budgets` / `POST /api/budgets/{id}/freeze`
- `GET /api/alerts` / `POST /api/alerts/{id}/ack`
- `GET /api/integrations/github/status` ; `/jira/status`
- `POST /api/evidence/run/{id}` → generates **witness bundle** (zip) + signs; returns URL
- `GET /api/audit?since=` → append-only log

### 4.2 Streams

- **SSE/WebSocket:** `/api/streams/runs`, `/api/streams/logs`, `/api/streams/alerts`, `/api/streams/routing`.
- Event envelope: `{ts, type, id, entity, payload, traceId}`. Types include `run_started`, `run_progress`, `run_completed`, `policy_denied`, `budget_warning`, `alert_fired`, `routing_failover`, etc.

### 4.3 Error & Pagination

- Cursor pagination; idempotent POSTs with `Idempotency-Key`.
- Problem+JSON error format; include `traceId` and remediation.

---

## 5) Observability & Evidence

- **OpenTelemetry** auto-instrumentation; trace every run → step; link to logs & metrics.
- **Prometheus** metrics exposed: `maestro_runs_total{status}`, `maestro_run_duration_ms_bucket`, `maestro_queue_depth`, `maestro_budget_spend_usd_total`, `maestro_policy_denials_total`, gateway health, provider latency.
- **SLOs**: e.g., _Control Plane Availability 99.9%_, _Run success ≥ 97%_, _p95 Build ≤ 10 min_, _UI p95 TTI ≤ 2.5s_.
- **Alerts** (with runbooks): SLO burn rates, queue saturation, rollout stuck, denials spike, budget breach, provider outage.
- **Witness Script** (CLI/Job): performs deny test, fires a synthetic alert, snapshots current SLO dashboards + rollout state + policy proofs + cosign/SBOM verifications into a signed zip stored in evidence bucket; API exposed via `/api/evidence/run/{id}`.

---

## 6) Security, Compliance, Governance

- **AuthN/Z:** OIDC/SAML SSO; SCIM; RBAC (tenant/project/env scopes). API tokens with least-privilege.
- **Supply Chain:** require image digests; cosign verify on deploy; SBOM ingest & diff; SLSA attestations.
- **Policy Engine:** OPA/Rego primary; support Gatekeeper/Kyverno; policy simulation with “what‑if” and dry-run.
- **Secrets:** Vault/KMS-backed; access audit; rotation; secret scanning on configs.
- **CSP/Headers:** strict CSP, HSTS, frame-ancestors none, CSRF, session hardening.
- **Audit:** append-only, signed; exportable.
- **A11y:** WCAG 2.1 AA; Playwright + axe checks in CI.

---

## 7) FinOps & Quotas

- **Budgets:** per-tenant tier with caps (tokens, $); **freeze/slowdown** actions; pre-emptive routing downgrades.
- **Explorer:** time series of spend by run/step/provider/model; forecast, anomalies, top-K cost drivers.
- **Export:** CSV/Parquet; webhook to finance.

---

## 8) Integrations

- **GitHub/Jira** (existing hooks in repo: _use_ `useGitHubIntegration.ts`, `useJIRAIntegration.ts`).
- **Grafana/Prometheus**: embedded panels; Grafana service account + signed snapshots for evidence.
- **Alertmanager/PagerDuty**: bidirectional ack/resolve; templated annotations include runId/traceId.
- **Container Registry**: GHCR/ECR; cosign keyless; SBOM store (OCI artifact).
- **Gateways/Routers**: provider keys, aliases; usage analytics per tenant; failover/backoff; request capture for evals.

---

## 9) Tech Stack (UI & Server)

- **UI:** React + TypeScript + Vite + Tailwind; shadcn/ui; recharts; framer-motion; React Router v6 (lazy); TanStack Query; Zod schemas from OpenAPI.
- **Server:** Node.js (Express/Fastify) or GraphQL Gateway; REST + SSE; OpenAPI 3.1 spec generated; OTel SDK; Prisma/SQL for config state; Redis for streams/queues.
- **Workers/Runners:** containers with sidecar agent (logs/traces/metrics emitters) and signed artifact uploader.
- **Build/Deploy:** Helm/K8s or Compose; Argo Rollouts for canary; Feature flags service; Playwright E2E; GH Actions.

---

## 10) UI Components (Key)

- **RunList, RunCard, RunDetailTabs** (Timeline, Logs, Observability, Evidence).
- **PipelineGraph** (with **GraphDiff** import from docs patches; version compare).
- **RoutingPinPanel** (pin/unpin, A/B, canary; health gauges).
- **GrafanaPanel** (signed snapshot + live embed).
- **BudgetBar** (caps, burn, ETA, freeze action).
- **PolicyResult** (OPA decision, reason, links to policy source).
- **CommandPalette** (resource nav + actions).

---

## 11) Acceptance Criteria (Definition of Done)

- **Coverage:** All IA sections implemented with non-mock endpoints. No `TODO`/stub in surfaced paths.
- **E2E:** Playwright flows:
  1. Start → observe → complete a Run with logs/artifacts → generate **Witness Bundle**.
  2. Canary rollout: pause/resume/promote/rollback controls affect live rollout; evidence snapshot captured.
  3. Routing: create class, pin model, observe traffic & failover in stream; budget breach triggers downgrade.
  4. Policy: author Rego rule; simulate; see denial on bad config; what‑if passes after fix.
  5. FinOps: set budget; trigger threshold → alert + freeze; export CSV.
- **Perf Budgets:** UI TTI p95 ≤ 2.5s; stream updates < 1s; run list paginate ≤ 300ms; log viewer smooth at 10k lines.
- **A11y:** axe passes on all pages; keyboard navigation; focus order; color contrast.
- **Security:** CSP nonces; CSRF tokens on mutating calls; RBAC enforcement verified; audit trail present.

---

## 12) Migration & Cutover

- Dev at **maestro-dev.topicality.co** with environment banner & feature flags on.
- Staging soak with synthetic load; SLOs green 72h.
- Prod canary 10→25→50→100 with rollback guard. Evidence bundles archived per release.

---

## 13) Competitive Feature Borrowing (Highlights)

- **Gateway control** (inspired by LiteLLM/OpenRouter/Portkey/Helicone): unified provider routing, model aliasing, per-tenant quotas, analytics, failover controls.
- **EvalOps & Observability** (Weave/Arize/TruLens/Langfuse/HoneyHive): dataset/slice management, prompt/version lineage, feedback capture in run detail; correlation charts.
- **Guardrails & Testing** (Lakera/Guardrails AI/Giskard/Patronus/Ragas/promptfoo): pre/post checks catalog; red-team suites; scorecards; regression gates wired to Policy Center.
- **Serving Futures** (BentoML/KServe/Triton/Ray Serve): pluggable backends; health and autoscaling panels for self-hosted models.
- **Agent Graph UX** (LangGraph/CrewAI/LlamaIndex/AutoGen): stateful graph view in **Run Detail** with step replay & inspection.

---

## 14) Deliverables

1. **OpenAPI 3.1** spec (UI contracts above), generated clients.
2. **UI** pages & components listed; skeleton states; loading/error patterns; docs pages.
3. **Server**: endpoints + SSE streams; OTel, Prom metrics; policy simulation; evidence bundler job.
4. **Dashboards**: Grafana JSONs for SLOs, queue, budgets; Alertmanager rules.
5. **Runbooks**: linked in-alert.
6. **E2E** test suite; axe checks.
7. **GA checklist** mapped to repo’s GA report; all gates PASS.

---

## 15) Nice-to-Haves (Post‑GA)

- Live **Query Console** for OPA policies with sample inputs.
- **Run Sandbox**: replay with alternative routing/policies for counterfactuals.
- **Annotation system** for steps/artifacts; emoji reactions; sharelinks.
- **Saved Views** with sharable URLs and team-wide defaults.

---

## 16) Implementation Notes (Repo Hooks You Already Have)

- Leverage: `apps/web/src/lib/maestroApi.ts` type contracts; `useGitHubIntegration.ts`, `useJIRAIntegration.ts`; docs patches under `docs/maestro/maestro-ui-next-patches-*` for **GraphDiff**, **RoutingPinPanel**, **Observability** tabs; runbooks & SLO/alerts docs; GA compliance doc.
- Replace `conductor-ui/frontend/src/maestro/api.*` mocks with real gateway calls; wire **SSE** streams.
- Embed Grafana panels via service account JSON; add signed **snapshot** capture for evidence.
- Ensure **cosign/SBOM/SLSA** attestations surface in Run Detail.

> Ship the Control Hub + Runs + Run Detail + Evidence first; then Routing Studio + Observability; follow with Guardrails/FinOps/Admin.
