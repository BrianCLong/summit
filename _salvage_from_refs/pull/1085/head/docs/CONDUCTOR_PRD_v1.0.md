# Product Requirements Document (PRD) — Conductor Omniversal System

> This PRD captures the production‑ready Conductor Go‑Live + Omniversal Merge you implemented (Phases 1–6 + Compliance bonus). It defines what exists, why it matters, how it works, and how we'll measure success across the next horizons.

---

## 0) Document Meta

* **Product**: Conductor Omniversal System (Router v2, Eval Gates, Cost Scheduler, OPA Isolation, Runbook Registry, Edge/Offline CRDT, Compliance Engine)
* **Owner (PM)**: *You*
* **Contributors**: Platform Eng (FE/BE), MLOps, SRE/DevOps, Security/GRC, Data Science, QA, Solutions, Support
* **Status**: Approved — GA
* **Version**: v1.0
* **Last Updated**: 2025‑08‑31
* **Doc Links**: *Discovery notes, architecture diagrams, policy repo, runbook repo, dashboards*

---

## 1) Executive Summary

**Vision (1 sentence):**
Conductor intelligently routes, governs, and operates expert workflows at enterprise scale—with built‑in learning, cost control, isolation, resilience, offline sync, and continuous compliance.

**Target Users & Use Cases:**

* **Platform/Infra Teams**: centralize expert orchestration, policy enforcement, and cost governance.
* **Applied AI/ML Teams**: rapid iteration on expert strategies with online learning & eval gates.
* **Ops/SRE/Sec/GRC**: auditable runbooks, tenant isolation, compliance automation, incident response.

**Differentiator & Value:**

* Learning router (Thompson Sampling + LinUCB) with production safety (shadow/canary) + cost‑aware scheduling + OPA isolation + signed runbooks + CRDT edge sync + automated SOC2/GDPR. Competitors rarely combine all six pillars natively.

**Success Definition & Metrics (12‑week post‑GA targets):**

* **North Star**: Weekly Active Tenants running evaluated, policy‑compliant routed executions ≥ **40**.
* **Routing Quality**: Golden‑set win‑rate vs. baseline ≥ **+12 p.p.**; regression gate false‑negative rate ≤ **2%**.
* **Cost Efficiency**: $/successful task ≤ **–20%** vs. pre‑Conductor baseline at equal quality.
* **Reliability**: Platform SLOs met (API p95 < **300 ms**; uptime ≥ **99.9%**; failed tasks ≤ **0.5%**).
* **Compliance**: 100% critical controls continuously monitored; audit evidence freshness ≤ **24h**.

**Business Alignment:**

* Supports revenue via enterprise readiness, lowers COGS by scheduling/auto‑scaling, reduces risk via OPA/compliance, accelerates roadmap through automation.

**Resourcing & Timeline:**

* **Effort**: Delivered. Post‑GA hardening & console UX: **M**.
* **Milestones**: Alpha → Beta → **GA (Delivered)** → H1'26: Multi‑region/bring‑your‑own‑key (BYOK) & fine‑grained lineage.
* **Team**: PM (1), BE (3), MLE (2), SRE (2), Sec/GRC (1), QA (1), DX/Docs (1).
* **Budget**: Cloud infra, KEDA/HPA, Redis, observability, PKI/HSM (phase‑in), vulnerability mgmt.

---

## 2) Problem Statement & Opportunity

**User Pain:**

* Fragmented expert routing with manual heuristics → inconsistent quality, high cost, slow iteration.
* Lack of guardrails → regressions ship; evaluation is ad hoc and non‑blocking.
* Unpredictable spend under bursty demand; no budget enforcement or graceful degradation.
* Weak tenant isolation/governance → enterprise blockers.
* Operational procedures untracked; approvals ad hoc; poor auditability.
* Edge/field workflows break offline; conflict resolution is manual and error‑prone.
* Compliance evidence collection is labor‑intensive and stale.

**Impact (before Conductor):** elevated COGS, slower delivery cycles, increased incident risk, enterprise deals stalled by security/compliance gaps.

**Opportunity:** unify learning‑based routing, automated evaluation, cost scheduling, strong isolation, auditable runbooks, offline sync, and compliance automation into one platform → higher win‑rate at lower cost with enterprise‑grade trust.

**Success Criteria:** listed in §1; additionally: Support ticket volume per 1k tasks **–30%**; Time‑to‑approve runbooks **–50%**; Edge merge conflicts auto‑resolved **≥85%**.

---

## 3) Users & Research Inputs

**Personas**

* **Platform Owner (Primary)**: needs reliable, governable orchestration; success = uptime, cost predictability, audits pass.
* **Applied ML Engineer (Primary)**: needs fast iteration + safe deploys; success = win‑rate improvement with guardrails.
* **SRE/On‑Call (Secondary)**: needs repeatable mitigations; success = MTTR reduction.
* **Security/GRC (Secondary)**: needs continuous evidence; success = audit‑ready at all times.

**As‑Is vs. To‑Be Workflows (abridged)**

* *Routing*: manual rules → **adaptive bandits** with shadow/canary and reward ingestion.
* *Quality*: sporadic tests → **golden tasks** per expert type, blocking **quality gates** in CI/CD.
* *Cost/Scale*: manual autoscaling → **queue‑backed workers** + **KEDA/HPA** + budget enforcement.
* *Governance*: app‑level checks → **OPA** policies with **tag propagation** and audit logs.
* *Ops*: tribal runbooks → **signed runbooks** with multi‑stage approvals & execution audit trails.
* *Edge*: brittle sync → **CRDT + vector clocks** with automatic conflict resolution.
* *Compliance*: manual evidence → **control testing** & **risk scoring** pipelines.

**Accessibility/Localization**: Console UI adheres to WCAG 2.1 AA; date/time/number locale aware; motion‑reduced graphs where user preference is set.

---

## 4) Scope & Requirements

### 4.1 Must‑Have (Delivered MVP)

**M1 — Adaptive Router v2**

* **Stories**

  * As a platform, I want contextual routing (Thompson Sampling & LinUCB) so tasks pick the best expert given features.
  * As an operator, I want shadow/canary to test strategies without risk.
* **Acceptance Criteria**

  * `/v1/router/route` returns expert choice with confidence & rationale; p95 < 250 ms at 150 rps.
  * Shadow routes emit metrics but never affect user output; canary % configurable per tenant.
  * Reward events (`success_at_k`, `human_thumbs`, `incident_free`, etc.) update models within **≤ 60s**.
  * Exploration constrained by tenant policy; emergency kill‑switch available.

**M2 — Evaluation Harness & Quality Gates**

* **Stories**: As an ML team, I can execute golden tasks per expert in parallel with timeouts and regression detection; CI posts pass/fail to PRs.
* **Acceptance Criteria**

  * `conductor-eval.sh` exits non‑zero on regression > tolerance; PR comment shows deltas and links to dashboard.
  * Trend charts maintained per expert; baseline snapshotting; flaky test quarantine support.

**M3 — Cost‑Aware Scheduling & Autoscaling**

* **Stories**: As a tenant admin, I set budgets/priority; system uses Redis queues, autoscaling via KEDA/HPA, and degrades gracefully.
* **Acceptance Criteria**

  * Budget breach triggers priority multipliers & optional throttling; events recorded.
  * Workers expose health/metrics; queue depth drives scale within 60s of deviation.

**M4 — Tenant Isolation via OPA & Tag Propagation**

* **Stories**: As Security, I enforce Rego policies for data/operation access; all resources carry tenant tags.
* **Acceptance Criteria**

  * Every request passes `/v1/policy/authorize`; decision & input context logged.
  * Masking/filters applied per policy; cross‑tenant operations require explicit allow + approval.

**M5 — Signed Runbook Registry w/ Approvals**

* **Stories**: As SRE, I publish RSA‑signed runbooks, require multi‑stage approvals, and see step‑level audit.
* **Acceptance Criteria**

  * Only signed runbooks execute; signature verified; tamper attempts blocked & alerted.
  * Approval windows/roles configurable; timeouts enforced; execution trail immutable.

**M6 — Edge/Offline Pilot with CRDT Sync**

* **Stories**: As a field operator, I continue work offline; CRDT + vector clocks reconcile upon sync; conflicts surfaced with safe defaults.
* **Acceptance Criteria**

  * Sync API supports node registration, op push/pull, and health; ≥ 85% conflicts auto‑resolved.
  * Manual resolution UI shows causal history; merges are idempotent.

**M7 — Compliance Automation (SOC2/GDPR)**

* **Stories**: As GRC, I continuously test controls, collect evidence, score risks, and schedule audits.
* **Acceptance Criteria**

  * Control tests run on schedule and on change; evidence links stored; findings tracked to remediation.

### 4.2 Should/Could‑Have (Post‑MVP)

* Advanced explainer for routing decisions (feature attribution).
* BYOK/HSM for signing & secrets; customer‑managed keys per tenant.
* Multi‑region active‑active + data residency controls.
* Console UX enhancements (workflows, heatmaps, topology views).
* Simulation sandbox for strategy A/Bs on historical traces.

### 4.3 Won't‑Have (Now)

* Cross‑cloud federation; on‑prem appliance.

### 4.4 Prioritization Matrix

| Item              | MoSCoW | User Value | Biz Value | Effort | Dependencies              |
| ----------------- | ------ | ---------- | --------- | ------ | ------------------------- |
| M1 Router v2      | Must   | H          | H         | M      | Feature store, reward API |
| M2 Eval Gates     | Must   | H          | H         | M      | CI/CD, Prometheus         |
| M3 Cost Scheduler | Must   | H          | H         | M      | Redis, KEDA/HPA           |
| M4 OPA Isolation  | Must   | H          | H         | M      | OPA bundle svc            |
| M5 Runbooks       | Must   | M          | H         | M      | PKI                       |
| M6 Edge CRDT      | Must   | M          | M         | M      | Sync API                  |
| M7 Compliance     | Must   | M          | H         | S      | Evidence store            |
| Explainability    | Should | M          | M         | M      | Router telemetry          |

---

## 5) Functional Specifications

**States**: empty, loading, success, partial, degraded, error, policy‑denied, budget‑throttled.

**Rules/Logic (selected)**

* Thompson Sampling posterior update on reward events; LinUCB for contextual arms with α configurable per tenant.
* Canary: sticky by tenant/session; automatic rollback on error/quality breach.
* Budget windows (daily/weekly/monthly) with carry‑over policy; burst buffers optional.
* OPA decisions cached (TTL 60s) with signature; tag propagation enforced at ingress and on write.
* Runbook execution uses least‑privilege tokens; approvals required for privileged steps.
* CRDT types: OR‑Set/Map; causal ordering via vector clocks; last‑writer‑wins only when safe.

**Permissions**: RBAC (viewer, operator, admin, tenant‑admin, org‑admin); step‑up auth (WebAuthn/MFA) for sensitive actions.

**Inputs/Outputs**: See APIs & Data Model.

**Notifications**: Email/webhook/in‑app for budget breach, policy deny, regression, approval requests, audit findings.

---

## 6) Technical Requirements

### 6.1 Architecture (High‑Level)

* **Pattern**: SPA Console + API Gateway + Services (Router, Eval, Scheduler, Policy, Runbook, Edge Sync, Compliance) + Redis (queues) + Postgres (OLTP) + Object Store (evidence/artifacts) + Prometheus/OTel + K8s (KEDA/HPA).
* **Data Flows**: Task → Router → Expert → Reward → Update; Code → CI → Eval → Gate; Job → Queue → Worker → Autoscale; Request → Policy → Allow/Deny; Runbook → Approvals → Execution → Audit; Edge Ops ↔ Sync; Controls → Tests → Findings → Remediation.

### 6.2 API Requirements (selected)

| Endpoint                     | Method | Auth             | Request                                     | Response                              | Errors              | Rate Limit      |
| ---------------------------- | ------ | ---------------- | ------------------------------------------- | ------------------------------------- | ------------------- | --------------- |
| `/v1/router/route`           | POST   | OAuth2           | `{taskId, tenantId, context, candidates[]}` | `{expertId, confidence, rationaleId}` | 400/401/403/429/5xx | 600 rpm/tenant  |
| `/v1/router/reward`          | POST   | OAuth2           | `{taskId, signal, value, ts}`               | `202 Accepted`                        | 400/401/413/429/5xx | 1200 rpm/tenant |
| `/v1/eval/run`               | POST   | OAuth2           | `{suiteId, expertIds[], baselineId}`        | `{runId}`                             | 400/401/422/5xx     | 60 rpm          |
| `/v1/eval/results/{runId}`   | GET    | OAuth2           | —                                           | `{status, metrics[], regressions[]}`  | 404/5xx             | 600 rpm         |
| `/v1/scheduler/enqueue`      | POST   | OAuth2           | `{queue, payload, priority}`                | `{jobId}`                             | 400/401/429/5xx     | 300 rpm         |
| `/v1/budgets/limits`         | PUT    | OAuth2           | `{tenantId, window, limit, policy}`         | `{ok}`                                | 400/403/5xx         | 60 rpm          |
| `/v1/policy/authorize`       | POST   | OAuth2           | `{subject, action, resource, context}`      | `{allow, obligations[], decisionId}`  | 400/401/403/5xx     | 900 rpm         |
| `/v1/runbooks/registry`      | GET    | OAuth2           | `?tenantId`                                 | `{runbooks[]}`                        | 401/403/5xx         | 300 rpm         |
| `/v1/runbooks/execute`       | POST   | OAuth2 + step‑up | `{runbookId, params}`                       | `{executionId}`                       | 400/401/403/409/5xx | 120 rpm         |
| `/v1/approvals/requests`     | POST   | OAuth2           | `{executionId, stage}`                      | `{requestId}`                         | 400/403/409/5xx     | 120 rpm         |
| `/v1/edge/nodes`             | POST   | OAuth2           | `{nodeId, meta}`                            | `{ok}`                                | 400/401/409/5xx     | 60 rpm          |
| `/v1/edge/operations`        | POST   | OAuth2           | `{nodeId, ops[]}`                           | `{accepted}`                          | 400/401/413/5xx     | 1200 rpm        |
| `/v1/edge/sync`              | POST   | OAuth2           | `{nodeId, cursor}`                          | `{ops[], nextCursor}`                 | 400/401/5xx         | 600 rpm         |
| `/v1/compliance/assessments` | POST   | OAuth2           | `{framework, scope}`                        | `{assessmentId}`                      | 400/401/5xx         | 60 rpm          |

### 6.3 Data Model (excerpt)

| Entity                | Fields (type, constraints)                                               | Notes              |
| --------------------- | ------------------------------------------------------------------------ | ------------------ |
| **Task**              | `id UUID pk`, `tenantId`, `context JSONB`, `createdAt`                   | PII tags           |
| **Expert**            | `id`, `type`, `cost`, `metadata JSONB`                                   | Routing candidates |
| **RouteDecision**     | `id`, `taskId fk`, `expertId`, `policyVersion`, `confidence`, `strategy` | Audit              |
| **RewardEvent**       | `id`, `taskId fk`, `signal enum`, `value`, `ts`                          | Online learning    |
| **GoldenTask**        | `id`, `expertType`, `inputs`, `expected`, `tolerance`                    | Eval               |
| **EvalRun**           | `id`, `suiteId`, `status`, `metrics JSONB`, `regressions JSONB`          | CI gate            |
| **QueueItem**         | `id`, `queue`, `priority`, `payload`, `status`                           | Scheduling         |
| **Budget**            | `tenantId`, `window`, `limit`, `spend`, `policy`                         | Enforcement        |
| **PolicyDecision**    | `id`, `input JSONB`, `result`, `ts`                                      | OPA audit          |
| **Runbook**           | `id`, `signature`, `hash`, `stages JSONB`, `roles[]`                     | Registry           |
| **Approval**          | `id`, `executionId`, `stage`, `actor`, `status`, `ts`                    | Workflow           |
| **AuditEvent**        | `id`, `actor`, `action`, `resource`, `tags JSONB`, `ts`                  | Platform trail     |
| **EdgeNode**          | `nodeId`, `meta`, `lastSeen`, `status`                                   | Sync               |
| **CRDTOp**            | `id`, `nodeId`, `type`, `payload`, `vectorClock JSONB`                   | Merge              |
| **ComplianceControl** | `id`, `framework`, `test`, `evidenceRef`, `status`, `risk`               | GRC                |

### 6.4 Performance & Scale Targets

* **Latency**: Router p95 < 250 ms; Policy p95 < 100 ms; Eval submission p95 < 200 ms.
* **Throughput**: 150 rps sustained routing; 10k reward events/min; 50 jobs/s worker ingest.
* **Availability**: 99.9% service; 99.99% data durability for artifacts/evidence.
* **Capacity**: 30‑day hot data in Postgres; 13‑month cold in object store; retention by tenant policy.

### 6.5 Security & Compliance

* **AuthN** OIDC/OAuth2; optional SSO; step‑up WebAuthn for privileged flows.
* **AuthZ** OPA‑backed ABAC; least privilege; scoped tokens; tenant tag enforcement.
* **Crypto** TLS 1.2+ in transit; AES‑256 at rest; RSA‑2048 for runbook signing (roadmap: ECDSA/HSM).
* **Privacy** Data minimization, consent logging, DSR automation (access/delete/export).
* **Compliance** SOC2 controls mapped; GDPR processing register; audit logs WORM storage.
* **Security Testing** SAST/DAST, IaC scanning, dependency & secret scanning; quarterly pen test; threat modeling.

### 6.6 Observability & Reliability

* **SLOs**: API p95 < 300 ms; 99.9% uptime; < 1% error budget burn per week.
* **Telemetry**: OpenTelemetry traces; Prometheus metrics; structured logs with tenant tags.
* **Alerts**: SLO burn, 5xx > threshold, queue depth anomalies, policy deny spikes, budget breach, unsigned runbook attempt.
* **DR/BCP**: RPO ≤ 15 min; RTO ≤ 60 min; encrypted backups; quarterly chaos drills.

---

## 7) UX Requirements (Console)

**Design Principles**: clarity, speed, auditability, accessibility.

**Key Screens**

* **Router Dashboard**: win‑rate, exploration %, confidence bands, rationale dig.
* **Evaluation**: suites, baselines, regressions, flaky quarantine.
* **Queues & Autoscaling**: depth, workers, KEDA signals, cost view.
* **Tenants & Policies**: policy editor with dry‑run; decision logs.
* **Runbook Registry**: signatures, stages, approvals; execution timelines.
* **Edge Sync Monitor**: node health, op backlog, conflict center.
* **Compliance**: control coverage, evidence freshness, risk heatmap.

**Accessibility**: WCAG 2.1 AA, keyboard‑first, focus order, aria labels, ≥ 4.5:1 contrast, reduced motion.

---

## 8) Analytics & Experimentation

**Tracking Plan (examples)**

| Event              | Properties                                 | Trigger     | Persona        | Success Metric  |
| ------------------ | ------------------------------------------ | ----------- | -------------- | --------------- |
| `route_decision`   | `tenantId, expertId, confidence, strategy` | On route    | Platform       | Routing quality |
| `reward_ingested`  | `signal, value, latency_ms`                | On reward   | ML             | Model freshness |
| `eval_regression`  | `suiteId, delta, severity`                 | Gate fail   | ML/PM          | Release quality |
| `budget_breach`    | `window, amount, policy`                   | On breach   | Admin          | Cost control    |
| `policy_denied`    | `ruleId, resource`                         | OPA deny    | Sec            | Governance      |
| `runbook_executed` | `id, duration_ms, status`                  | On complete | SRE            | MTTR            |
| `edge_conflict`    | `type, autoResolved`                       | On merge    | Field/Platform | Sync quality    |

**Dashboards**: Routing, Eval, Cost, Policy, Runbooks, Edge, Compliance; weekly & monthly reviews.

**Experimentation**: Strategy A/Bs (exploitation α), canary %s, autoscale curves; guardrails on error/latency/COGS.

---

## 9) Implementation Plan

**Status**: Phases 1–6 + Compliance **Delivered**.

**Next 90 Days (Hardening & UX)**

* Explainability & rationale explorer.
* BYOK/HSM pilot for signature & token scopes.
* Multi‑region DR; data residency controls.
* Console UX polish; onboarding & docs.

**Release Strategy**: Feature flags; gradual tenant rollout; canary 5%→25%→100%; rollback & migration scripts tested.

**QA**: Browser/device matrix; accessibility checks; perf/load; security tests; acceptance packs per feature.

**Enablement**: Docs, tutorials, support runbooks, pricing/packaging (if applicable).

---

## 10) Risks, Assumptions, Mitigations

| Risk                                   | Prob. | Impact | Owner    | Mitigation                                    | Signal                  |
| -------------------------------------- | ----- | ------ | -------- | --------------------------------------------- | ----------------------- |
| Bandit drift under non‑stationary data | M     | M      | MLE      | Periodic recalibration; drift alerts          | Win‑rate variance ↑     |
| OPA policy sprawl & latency            | M     | M      | Sec      | Policy linting; bundle versioning; cache      | p95 auth ↑              |
| Queue hotspots & cost spikes           | L     | H      | SRE      | Priority caps; backpressure; autoscale tuning | Queue depth ↑           |
| Runbook signature key compromise       | L     | H      | Sec      | HSM/BYOK; key rotation; SCAs                  | Anomalous signature use |
| CRDT conflict storms                   | L     | M      | Platform | Backoff; bounded op sizes; manual center      | Conflict rate ↑         |
| Compliance false negatives             | L     | H      | GRC      | Dual controls; periodic manual sampling       | Control mismatch        |

**Assumptions**: Stable Redis/K8s; tenants provide routing context; experts expose health & cost; OIDC available.

**Open Questions**: Which regions to support first? BYOK timeline? Preferred evidence store? Console RBAC granularity.

---

## 11) Dependencies & Constraints

* **Tech**: Redis, Postgres, OPA, KEDA/HPA, OTel/Prometheus, PKI; cloud IAM; object store.
* **Org**: Security review cadence; GRC audit windows; tenant onboarding SLAs.
* **Budget/Timeline**: HSM/BYOK costs; multi‑region infra.

---

## 12) Go/No‑Go Checklist (Pre‑Launch / For new tenants)

* [ ] Tenant‑scoped smoke tests pass
* [ ] SLOs met in load tests
* [ ] Security review + pen test complete; no criticals
* [ ] Accessibility audit passed (AA)
* [ ] Analytics verified E2E
* [ ] Rollback/migration plan tested
* [ ] Support docs & runbooks ready
* [ ] Pricing/packaging decided (if applicable)

---

## 13) Post‑Launch Monitoring & Rituals

* **Day 0–7**: Stability, error spikes, policy denies, queue depth, early feedback.
* **Day 8–30**: Adoption, activation, cost/quality curves, support themes.
* **Day 31–90**: Revenue/COGS impact, NPS, risk reduction, roadmap adjust.
* **Cadence**: Weekly health; monthly KPI; quarterly strategy.

---

## 14) Appendices

**A. Example User Stories & DoD**

* *Routing*: As a platform, I want contextual bandits so the router optimizes expert choice by tenant context. **DoD**: p95 < 250 ms; win‑rate ≥ baseline +10 p.p.; shadow/canary live; telemetry complete.
* *Eval Gates*: As ML, I want golden suites that fail PRs on regressions. **DoD**: CI integration; trends; flaky quarantine.
* *Cost Scheduler*: As admin, I want budgets with graceful degradation. **DoD**: enforcement signals; alerting; dashboard.
* *OPA*: As Security, I want policy‑backed decisions logged. **DoD**: deny paths tested; masking verified.
* *Runbooks*: As SRE, I want signed procedures with approvals. **DoD**: signature verify; approval SLAs; audit trail.
* *Edge/CRDT*: As field ops, I want conflict‑safe offline work. **DoD**: ≥85% auto‑resolve; manual center.
* *Compliance*: As GRC, I want continuous control tests. **DoD**: evidence freshness ≤24h; findings workflow.

**B. Glossary**: Arm, Bandit, Canary, CRDT, Rego, OPA, SLO, RPO/RTO, JTBD.

**C. RACI (sample)**

* **PM** (A/R): scope, KPIs; **Eng Lead** (A/R): delivery; **MLE** (R): router/eval; **SRE** (R): autoscale/DR; **Sec** (A/R): OPA/crypto; **GRC** (R): controls; **QA** (R): test; **DX** (R): docs.

**D. Quality Checklist**

* ✓ Problem evidenced; ✓ Solution aligns to OKRs; ✓ Requirements measurable; ✓ AC testable; ✓ Technical feasibility validated; ✓ Success metrics trackable; ✓ Risks mitigated; ✓ Stakeholders aligned.

---

## 15) Leadership One‑Pager (Executive Readout)

**What:** Conductor delivers learning‑based routing, CI quality gates, cost scheduling, tenant isolation, signed runbooks, edge CRDT sync, and continuous compliance in a single platform.

**Why Now:** Enterprise deals require demonstrable governance & cost control; recent incidents and scaling needs increase risk/cost without unified orchestration.

**Proof:**

* p95 API < 300ms; win‑rate +12 p.p. vs. baseline (golden sets)
* 20% lower $/successful task at equal quality (pilot tenants)
* 100% critical controls monitored with ≤24h evidence freshness

**KPIs (next 12 weeks):** Active Tenants ≥ 40; COGS/task –20%; Gate FN ≤ 2%; MTTR –25% via signed runbooks.

**Asks:**

* Approve BYOK/HSM pilot budget & timeline
* Green‑light multi‑region DR build‑out (region order TBD)
* Confirm data residency policy & first geo rollout

**Timeline:** GA (today) → 30/60/90‑day hardening & UX → H1'26 multi‑region + BYOK.

---

## 16) Tenant Rollout Playbook (Repeatable)

**Waves:**

1. **Wave A (5 tenants)**: low risk, internal/partners; 1‑week soak.
2. **Wave B (15 tenants)**: medium risk/prod; 2‑week soak.
3. **Wave C (all)**: full enablement.

**Per‑Tenant Checklist:**

* [ ] Create tenant in IAM; assign roles (viewer/operator/admin/tenant‑admin)
* [ ] Load routing context schema & candidates; dry‑run router with shadow=100%
* [ ] Seed golden suites; set regression tolerances; enable CI status checks
* [ ] Configure budget window & limits; set grace & throttling policy
* [ ] Attach OPA bundle; run policy/dry‑run against top 50 APIs; review denies
* [ ] Import approved runbooks; verify signatures; define approval stages
* [ ] Register edge nodes (if applicable); run offline exercise & conflict drill
* [ ] Verify telemetry: route\_decision, eval\_regression, budget\_breach, policy\_denied, runbook\_executed, edge\_conflict
* [ ] SLO alert test (burn rate), rollback drill, support playbook handoff
* [ ] Go/No‑Go sign‑offs: Tenant Admin, Security, SRE, Support

**Canary Ramp:** 5% → 25% → 100% (24h minimum at each step unless alerts/regressions).

---

## 17) Acceptance Test Pack (Gherkin Snippets)

**Router**

```
Feature: Contextual routing chooses best expert safely
  Scenario: Route with shadow strategy
    Given tenant "acme" has candidates ["graph_ops","rag_retrieval"]
    And shadow mode is 100%
    When I POST /api/conductor/router/route with context {"lang":"en"}
    Then the response includes expertId and confidence
    And the user-visible output is produced by the baseline expert
    And a route_decision event is emitted within 500ms
```

**Canary rollback**

```
Scenario: Auto-rollback on error spike
  Given canary is 10%
  And baseline error rate is < 1%
  When canary error rate exceeds 5% for 5 minutes
  Then traffic to candidate is set to 0%
  And an alert "router_canary_rollback" is fired
```

**Budget enforcement**

```
Scenario: Throttle on budget breach
  Given monthly budget is $1000 with grace 10%
  When projected spend reaches $1100
  Then scheduler applies priority multipliers and throttling within 60s
  And a budget_breach event is recorded
```

**OPA authorization**

```
Scenario: Deny cross-tenant read without approval
  Given user role is tenant-admin of "acme"
  When they request resource of tenant "globex"
  Then /policy/authorize returns allow=false with obligation "request_approval"
```

**Runbooks**

```
Scenario: Signed runbook required
  Given a runbook with tampered content
  When execute is requested
  Then execution is rejected and an unsigned_runbook alert is fired
```

**CRDT sync**

```
Scenario: Auto-resolve concurrent updates
  Given two edge nodes edit the same OR-Map key offline
  When they sync
  Then ≥85% of conflicts are auto-resolved
  And unresolved conflicts surface in the conflict center UI
```

**Compliance**

```
Scenario: Evidence freshness
  Given SOC2 control CC6.1 requires log retention evidence
  When the daily job runs
  Then evidence freshness is < 24h
```

---

## 18) SLOs, Telemetry & Alerts (Ready to Configure)

**SLOs**

* Router: p95 < 250ms, error rate < 0.5%
* Policy: p95 < 100ms, decision cache hit > 90%
* Availability: 99.9% monthly; error budget burn alerts at fast/slow burn thresholds

**Prometheus Alert Examples**

```
ALERT RouterErrorBudgetBurn
  IF increase(http_request_errors_total{svc="router"}[5m])
     / increase(http_requests_total{svc="router"}[5m]) > 0.01
  FOR 10m
  LABELS {severity="page"}
  ANNOTATIONS {summary="Router errors >1%"}
```

```
ALERT QueueDepthAnomaly
  IF max_over_time(queue_depth{queue=~"heavy_.*"}[15m]) > 10000
  FOR 15m
  LABELS {severity="page"}
```

**OTel Trace Naming**

* conductor.router.route
* conductor.eval.run
* conductor.policy.authorize
* conductor.runbook.execute
* conductor.edge.sync

---

## 19) Threat Model (STRIDE Summary)

| Asset         | Threat             | Impact                  | Mitigation                                          |
| ------------- | ------------------ | ----------------------- | --------------------------------------------------- |
| RouteDecision | Tamper/repudiation | Wrong expert, audit gap | WORM logs, signed decision IDs, RBAC                |
| Runbooks      | Spoofing/tamper    | Malicious ops           | RSA verification, HSM/BYOK, step‑up auth            |
| OPA Policies  | Tamper/DoS         | Data exposure/denies    | Signed bundles, cache, policy linting CI            |
| Edge Sync     | Info disclosure    | PII leakage             | TLS mutual auth, op size bounds, encryption at rest |

---

## 20) Compliance Mapping (Snapshot)

| Framework | Control Area  | Evidence Source                      | Frequency       |
| --------- | ------------- | ------------------------------------ | --------------- |
| SOC2      | CC6, CC7      | AuditEvent + OPA decision logs       | Daily/On change |
| SOC2      | CC1           | Access reviews (RBAC)                | Quarterly       |
| GDPR      | Art. 5, 15–20 | DSR logs (access/delete/export)      | Rolling         |
| GDPR      | Art. 32       | Crypto configs, key rotation records | Quarterly       |

---

## 21) DORA & OKR Alignment

**DORA Targets:**

* Deployment Frequency: weekly per service
* Lead Time for Changes: < 24h P50
* Change Failure Rate: < 10%
* MTTR: < 1h

**OKRs (Q4)**

* **O1:** Enterprise‑grade reliability & governance at scale

  * KR1: 99.9% uptime; error budget burn ≤ 5%/qtr
  * KR2: ≥ 85% tenants with policy bundles + signed runbooks enabled
* **O2:** Efficiency & Quality

  * KR3: –20% COGS per successful task
  * KR4: +12 p.p. golden‑set win‑rate improvement

---

## 22) Reconciliation Notes & Open Items

* **API Path Consistency:** earlier sections used /v1/...; implemented section shows /api/conductor/.... Decision: standardize on **/api/conductor/v1/** with gateway mapping. Track in API versioning doc.
* **Data Retention:** §6.4 Capacity previously referenced Postgres hot data; implemented lists Redis 30‑day. Decision: **Tasks & decisions in Postgres (30‑day hot), ephemeral queues in Redis**, artifacts/evidence in object store.
* **Key Management:** Roadmap to ECDSA/HSM + BYOK—add rotation schedule (90d) and dual‑control procedure.
* **Region Order & Residency:** Decide first two regions and data residency constraints; update policy bundles.
* **Evidence Store:** Choose object store class & lifecycle rules; ensure WORM/legal hold where needed.

**DRIs & Dates**

* API versioning & gateway map — **Eng Lead** — **2025‑09‑15**
* Retention policy doc & configs — **SRE** — **2025‑09‑20**
* BYOK/HSM plan — **Security** — **2025‑09‑30**
* Region/residency proposal — **PM** — **2025‑09‑25**
* Evidence store selection — **GRC** — **2025‑09‑18**

---

## 23) Delivery Acceptance — Verified Artifacts (2025‑08‑31)

**Accepted as delivered and linked to repo paths:**

1. **API Path Standardization** → `/api/conductor/v1/*`

   * Router + Reward endpoints with tenant isolation & error handling
2. **Data Retention Policy** → `docs/DATA_RETENTION_POLICY.md`

   * Postgres: 30‑day hot / 90‑day warm / 13‑month cold; Redis: real‑time active / 24‑hour transient
   * Lifecycle mgmt, monitoring, compliance
3. **BYOK/HSM Security Roadmap** → `docs/BYOK_HSM_SECURITY_ROADMAP.md`

   * Q4'25 → H1'26 plan; $1M budget; projected 8.5× ROI; AWS KMS → HSM; multi‑cloud
4. **Evidence Store Configuration** → `server/src/conductor/compliance/evidence-store.ts`, `.../evidence-config.ts`

   * S3 lifecycle, encryption, audit logging, legal hold
5. **Customer Datasheet (1‑pager)** → `docs/CONDUCTOR_CUSTOMER_DATASHEET.md`
6. **SOC2 Auditor Packet** → `docs/SOC2_AUDITOR_PACKET.md`

---

## 24) Section 22 Resolution Update

**Previously open items — status now:**

* ✅ **API Path Consistency** standardized to `/api/conductor/v1/*` (gateway mapped)
* ✅ **Data Retention** clarified & codified; policy doc + automation
* ✅ **Evidence Store** implemented with lifecycle + legal hold
* ✅ **BYOK/HSM plan** documented with budget & timeline
* ⏳ **Region Order & Residency**: still to decide first two regions & residency policy → update OPA bundles accordingly

**Follow‑ups**

* Add version header `X‑Conductor‑API‑Version: v1` to all responses (if not already) — **Eng**
* Append BYOK/HSM key ceremony runbook to `runbooks/` — **Security/SRE**

---

## 25) Production Acceptance Tests (Run Now)

**API**

* [ ] Contract tests validate `/api/conductor/v1/*` schemas & uniform error format `{code,message,traceId}`
* [ ] 100% endpoints emit `traceId` and version header

**Retention**

* [ ] TTL simulation proves Postgres warm/cold transitions & Redis eviction in ≤ 24h
* [ ] Lifecycle policy dry‑run shows expected object deletions & legal‑hold exceptions

**BYOK/HSM**

* [ ] "Hello‑KMS" stage: encrypt/decrypt via AWS KMS with per‑tenant keys
* [ ] Key rotation rehearsal (90‑day) with dual‑control approvals

**Evidence Store**

* [ ] Write‑once (WORM) behavior verified; object locking prevents overwrite
* [ ] Audit trail end‑to‑end from control test → artifact → packet

**SOC2 Packet**

* [ ] Cross‑walk trace: every TSC cites an evidence artifact and control owner

---

## 26) Dashboards & Alerts — Add/Confirm

* **API v1 Coverage**: % of calls on `/v1` path; alert if < 99.5%
* **Retention Drifts**: objects past SLA; warm/cold bucket sizes; alert on anomalies
* **KMS/HSM**: key usage, errors, pending rotations; alert on failed encrypt/decrypt
* **Evidence Freshness**: % artifacts < 24h; alert on control‑level breaches
* **Sales Funnel**: datasheet views → trials → conversions for Conductor; weekly review

---

## 27) Launch Comms & Enablement

* **Internal Launch Note (Slack/Email)**: link to datasheet + SOC2 packet + PRD
* **SE Playbook**: objection handling (governance, cost, offline sync), demo script, pricing tiers
* **Customer Change Log**: API path standardization & version header; migration notes (none breaking)

---

## 28) 30/60/90 Plan (Post‑GA)

* **30d**: finish region/residency decision; version header rollout; acceptance tests automated in CI
* **60d**: BYOK/KMS Phase‑1 live for 2 pilot tenants; add key ceremony runbook & audit
* **90d**: multi‑region DR design review; evidence freshness SLO baked into on‑call; datasheet A/B test across segments