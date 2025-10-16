# IntelGraph Platform + Maestro Conductor — MVP‑2 & GA PRD

_Date:_ **September 30, 2025**  
_Owner:_ **Royalcrown IG (Ops & Delivery Orchestrator)**  
_Repo:_ `BrianCLong/summit`

> **One platform, two personas**: **IntelGraph** (analyst/investigator) + **Maestro Conductor** (orchestrate build/deploy/govern). This PRD captures where we are, gaps to close, and a 360° plan to ship **MVP‑2** and **GA** safely with progressive delivery and full observability.

---

## 0) TL;DR

- **Today:** Working **Conductor UI** (React/Vite) with multi‑panel ops console; a lightweight **Apollo GraphQL** backend (`conductor-ui/backend/server.mjs`); **docker‑compose** envs; **Helm/Argo Rollouts** charts; security scaffolding (OPA ABAC, signing/SBOM docs); Grafana dashboard JSON; extensive GitHub Actions (canary/rollback/attest/etc.). Some infra is **placeholder** (Terraform `infra/aws/main.tf`). Many archived/salvage code paths exist.
- **MVP‑2 (4–6 weeks of focused scope):** Ship a **coherent Conductor control plane** with: health + burndown, routing studio, RAG console, Neo4j Guard stream, policy decisions (OPA) surfaced in UI, structured logs + traces, golden‑signal dashboards wired, canary + auto‑rollback, artifact SBOM+provenance in pipeline, step‑up auth for privileged operations. Deliver **dev+stage** reliably; limited prod **design‑partner** ready.
- **GA (post‑MVP‑2 8–12 weeks):** Enterprise hardening: multi‑tenant RBAC/ABAC, SSO (OIDC/SAML), DR (cross‑region), cost/budget guardrails, signed images + provenance ledger, migration gates, feature‑flagged advanced services (agent runtime, predictive suite), compliance guardrails and immutable audit.

---

## 1) Current State (Evidence‑based)

### 1.1 Product & UX

- **Conductor UI** (`conductor-ui/frontend/`): React 18 + TS + Vite; single‑file `App.tsx` wiring panels: Dashboard, Routing Studio, RAG Console, Neo4j Guard, Budgets, Policies/LOA, Logs, CI & Chaos, Docs. Degrades gracefully using `window.__SYMPHONY_CFG__` + URL params.
- **Backend preview** (`conductor-ui/backend/server.mjs`): Apollo Server with `_health`, `previewRouting`, `conduct` mocks. Useful for UI integration but not yet a durable control plane.

### 1.2 Platform & Runtime

- **Compose** (`deploy/compose/docker-compose.full.yml`, `...dev.yml`): Defines API gateway, prov‑ledger, graph‑xai, conductor‑api, agent‑runtime, predictive‑suite, Redis, etc. Some services map to **salvage** paths—indicates planned but not fully wired images.
- **Helm** (`charts/app/*`): Includes Argo Rollouts canary strategy (10%→50% with pauses), HPA, PDB, ConfigMap templates. Values support repo/tag deployment.
- **Terraform** (`infra/aws/main.tf`, envs/_): **Placeholder**; DR files present but not complete. Grafana dashboards JSON present (`infra/grafana/dashboards/_`).

### 1.3 CI/CD & Supply Chain

- **GitHub Actions** (`.github/workflows/*`): Rich set—canary deployment, auto‑rollback, build‑images, CI comprehensive, k6 perf, policy (conftest), SBOM + attest. Some steps contain placeholder tokens and may need linters/fixups.
- **Security Supply Chain**: Cosign/attest documented (`SECURITY/signing/README.md`, `SECURITY/sbom/*`). DLP rules present. ZAP config present. Need end‑to‑end pipeline proof.

### 1.4 Security, Policy, Compliance

- **OPA ABAC** (`SECURITY/policy/opa/abac.rego`): Default‑deny, role‑aware, step‑up gating for privileged ops. Trust policy, DPIA and threat model docs exist. Secrets policy + rotation scaffolding (`SECURITY/secrets/*`).

### 1.5 Observability

- **Dashboards**: Golden signals JSON for API & workers. OTel wrapper scripts exist; several OTel files exist under archived trees. Need active, uniform OTel init in running services and Grafana/Tempo/Jaeger wiring.

### 1.6 Data & Integrations

- **Declared**: Neo4j, Postgres, Redis, Elasticsearch. **Reality**: only Redis is consistently referenced in current live compose; Neo4j Guard stream UI exists; ingestion/search/ML components are present in historic branches but not an MVP‑ready pipeline.

**Conclusion:** Strong scaffolding and vision; need to **tighten the core** around Conductor as the operational control plane and make a minimum set of backends real with end‑to‑end tests, observability, and rollback.

---

## 2) Goals & Non‑Goals

### 2.1 MVP‑2 Goals

1. **Single‑pane Conductor**: Dashboard shows fleet health, build/deploy status, SLO burn, budgets.
2. **Routing Studio**: Deterministic routing preview + audit of decisions.
3. **RAG Console**: Minimal RAG with pluggable retriever; demo dataset; latency <1.5s p95 for simple queries.
4. **Neo4j Guard (stream)**: Live SSE stream from a mock or minimal Neo4j check pipeline.
5. **Policy Surface**: OPA decisions + LOA gates visible; step‑up auth modal enforced for privileged actions.
6. **Obs First**: OTel traces, Prom metrics, structured logs; Grafana golden dashboards live; SLO burn alerts.
7. **Progressive Delivery**: Helm + Argo Rollouts canary with **auto‑rollback** on golden‑signal breach.
8. **Supply Chain**: CI builds with SBOM (CycloneDX), image signing (Cosign), provenance attest; artifacts kept.
9. **Secrets**: No plaintext; sealed‑secrets and rotation runbook.

### 2.2 GA Goals

- **Enterprise Auth**: OIDC (Auth0/Okta) + SAML; ABAC/RBAC via OPA bundle delivery.
- **Multi‑tenant & Governance**: Tenant isolation; budget/cost guard; immutable audit with reason‑for‑access.
- **DR**: Cross‑region replicas; RPO≤15m; RTO≤1h; periodic drills.
- **Data Services**: Production‑grade Postgres, Neo4j, and search with backup/restore + migration gates.
- **Feature Flags**: Graduated rollout of Agent Runtime, Predictive Suite, License Registry.
- **Compliance**: DPIA/retention, dual‑control deletes, step‑up for risky ops, SBOM attest + verification on deploy.

### 2.3 Non‑Goals (both phases)

- Full ML pipeline training; advanced anomaly models; full e2e ingestion from all connectors; mobile clients.

---

## 3) Personas & User Stories

### 3.1 Personas

- **Platform/DevOps Engineer**: deploys, monitors, rolls back; needs SLO dashboards & canary controls.
- **Security Officer**: verifies policy decisions, attestations, and audit trails.
- **Analyst/Operator**: uses RAG/Neo4j Guard to answer questions and validate graph constraints.
- **Release Captain**: drives release train, approvals, and change communication.

### 3.2 MVP‑2 Top Stories

1. _As a Platform Eng_, I can deploy Conductor to **stage** using Helm with a canary at 10%→50%, and if error rate >2% or p95 >1.5s, rollout auto‑rolls back.
2. _As a Security Officer_, I can view OPA decision traces and require **WebAuthn** step‑up for `conduct()` with sensitivity="high".
3. _As an Operator_, I can preview routing for a task; decisions are logged with reason/confidence, and I can export evidence.
4. _As a Release Captain_, I can see SBOM + Cosign attestations linked to the running image in the UI.
5. _As an SRE_, I can tail structured logs and see correlated traces for an action from UI.

---

## 4) Scope (What we ship)

### 4.1 MVP‑2 Feature Scope

- **Conductor UI**
  - Dashboard cards wired to live health endpoints; SLO burn down tile.
  - Panels: Routing Studio, RAG Console (demo index), Neo4j Guard stream, Policies (OPA decision badge), Logs (SSE), CI/Chaos (manual fire drill), Docs.
  - Config via `window.__SYMPHONY_CFG__` + `.env.*` presets; e2e tests for each panel.
- **Conductor API**
  - Promote `server.mjs` to `conductor-api` service with typed schema, health, routing, run orchestration, audit emit.
  - SSE endpoints for logs/neo4j guard; decisions include `reason`, `confidence`, `policy_context`.
- **Observability**
  - OTel SDK init in frontend (web‑vitals events) and all backend services; traces → OTLP collector; metrics → Prom.
  - Deploy Grafana + Tempo/Jaeger + Prometheus via Helm; import dashboards under `infra/grafana/dashboards/*`.
- **CI/CD**
  - CI: build, unit, Playwright e2e, k6 smoke; SBOM gen + attest; image sign; push to registry.
  - CD: Helm upgrade with Argo Rollouts; policy gate (conftest) on K8s manifests; auto‑rollback job.
- **Security & Policy**
  - OPA bundle containing `abac.rego` served to API; step‑up auth route; LOA gating for risky actions.
- **Data**
  - Minimal Postgres (runs/events/audit) with migrations and backup CronJob.
  - Neo4j optional; if absent, simulate guard stream deterministically.

### 4.2 GA Incremental Scope

- Multi‑tenant authz; SSO (OIDC/SAML); org/role provisioning.
- Cross‑region Postgres + Neo4j replicas with PITR; DNS failover.
- Cost guard (budgets, throttling); License registry integration; provenance ledger.
- Search service (Elasticsearch/OpenSearch) wired to RAG; connector framework v1.

---

## 5) Acceptance Criteria

### 5.1 Functional (MVP‑2)

- **Health**: `/health` returns `ok` for UI+API; dashboard shows green within 5s of boot.
- **Routing**: `previewRouting(task,maxLatencyMs)` returns deterministic decision; logged with correlation ID; visible in UI with reason.
- **RAG**: Given seeded demo corpus, top‑1 answer ≤1.5s p95; accuracy baseline documented.
- **Policy**: Privileged ops require step‑up; deny by default; decisions recorded with policy version hash.
- **Canary**: Rollout proceeds to 50% then stable **iff** error rate <2% and p95 <1.5s for 30m.
- **Rollback**: Breach triggers automated rollback; audit event recorded.

### 5.2 Non‑Functional (MVP‑2)

- p95 UI route <600ms (stage), API p95 <400ms for control operations.
- 99.5% availability target (stage);
- All services emit OTel traces + Prom metrics; dashboards render without manual steps.
- SBOM present for each image; Cosign signature verifies; artifact retention ≥90 days.

### 5.3 GA Extras

- 99.9% availability SLO; RPO≤15m, RTO≤1h; quarterly DR drill evidence.
- SSO live; audit trail immutable (append‑only) with reason‑for‑access.

---

## 6) System Architecture (Target)

**MVP‑2**

- **UI**: `conductor-ui/frontend` served via Nginx; config injected at runtime.
- **API**: `conductor-api` (Node/Apollo) behind ingress; publishes events to Postgres (audit) and Redis (streams/SSE).
- **Obs**: OTel collector, Prometheus, Tempo/Jaeger, Grafana.
- **CD**: Argo Rollouts‑backed Deployment; HPA; PDB; sealed‑secrets.

**GA** adds: OIDC/SAML SSO, policy bundle server, multi‑tenant DBs, read replicas, provenance ledger, license registry, cross‑region failover.

---

## 7) Backlog → Plan of Record

### 7.1 MVP‑2 Work Breakdown (mapped to repo)

1. **Conductor API service** (`services/conductor-api`)
   - [ ] Scaffold TypeScript Node service with Apollo, OTEL, pino logs, health.
   - [ ] GraphQL schema v1: `previewRouting`, `conduct`, `auditEvent`.
   - [ ] SSE endpoints: `/stream/logs`, `/stream/neo4j-guard`.
   - [ ] OPA client (bundle fetch + decision logging); step‑up verification endpoint.
   - [ ] DB migrations (Postgres via Prisma/Knex) for runs/events/audit.
2. **Frontend wiring** (`conductor-ui/frontend`)
   - [ ] Replace mocks with API calls; evidence export; OPA decision badge.
   - [ ] Playwright e2e for the 5 key journeys; a11y smoke.
3. **Observability** (`infra/helm/otel`, `infra/grafana/*`)
   - [ ] OTLP collector; service autodiscovery; import dashboards.
   - [ ] Golden‑signal SLOs + burn alerts.
4. **CI/CD** (`.github/workflows/*`)
   - [ ] Consolidate into: `ci.yml`, `build-images.yml`, `deploy-stage.yml`, `promote-prod.yml`.
   - [ ] SBOM + Cosign sign/attest; SARIF upload; conftest policy gate.
   - [ ] Preview env per PR via ephemeral namespace & Helm release; teardown on close.
5. **Delivery** (`charts/app`)
   - [ ] Values for API + UI images; Ingress; Argo Rollouts; HPA tuned; PDB.
6. **Security** (`SECURITY/policy/*`, `SECURITY/secrets/*`)
   - [ ] Bundle build pipeline for OPA; versioned policies; step‑up (WebAuthn) gate in UI.
7. **Data** (`infra/helm/postgres`, `charts/backup/*`)
   - [ ] Postgres StatefulSet; backup CronJob; restore drill; migration gate.

### 7.2 GA Work Breakdown

- **SSO & MT**: OIDC/SAML integration, tenant model & policy tags.
- **DR & Replica**: Cross‑region infra w/ Route53 failover; PITR.
- **Cost & Ledger**: Budget enforcement; provenance ledger integration; license registry.
- **Search & Connectors**: OpenSearch; connector SDK v1; ingestion hardening.

---

## 8) Risks & Mitigations

- **Terraform placeholders** → _Blocker for prod infra_.
  - _Mitigate:_ Stand‑up minimal AWS env module (VPC/EKS/RDS) with `infra/envs/stage` first; reuse Helm.
- **Archived code sprawl** → confusion in builds.
  - _Mitigate:_ Move `_salvage_*` under `/archive/` and exclude in CI via sparse‑checkout context.
- **Workflow drift** → broken Actions.
  - _Mitigate:_ Curate & validate a minimal set; run `act` locally; add `workflow_dispatch` smoke.
- **Observability gaps** → blind canaries.
  - _Mitigate:_ “Obs‑first” gate: deploy blocked without OTel + dashboards green.
- **Secrets handling** → accidental plaintext.
  - _Mitigate:_ Enforce secret scanning, sealed‑secrets, deny PRs introducing `.env` with secrets.

---

## 9) Release Management

- **Cadence:** Weekly release train; hotfix lane allowed with Captain sign‑off.
- **Gates:** All CI green; SBOM present; policy gate pass; canary plan + rollback criteria documented.
- **Canary:** Start 10%→50% with pauses; auto‑promote after 60m stable; auto‑rollback rules encoded in Action.
- **Comms:** Release notes + playbook; owner on‑call.

---

## 10) SLOs, KPIs, and Telemetry

- **SLOs** (MVP‑2): API p95 <400ms; UI p95 <600ms; error rate <1.5%; availability 99.5%.
- **KPIs**: Time‑to‑rollback <5m; % builds with SBOM+sign 100%; % endpoints with traces 95%; Mean Canary Soak 45m.
- **Telemetry**: OTLP traces with correlation IDs; structured JSON logs; Prom metrics; audit events with policy hash & LOA.

---

## 11) Data, Privacy & Compliance

- **DPIA** template filled for routing and RAG features; data retention default 90 days (logs) / 30 days (traces) / 365 days (audit).
- **Dual‑control deletes** for audit; immutable store target (GA).
- **Reason‑for‑access** prompts for sensitive log/audit views.

---

## 12) Rollout & Backout

- **Rollout**: Stage → prod canary; feature flags gating RAG and Neo4j Guard; shadow mode for policy.
- **Backout**: Automated Argo rollback; schema migration gate with down‑migrations or table‑swap; config flip to read‑only.

---

## 13) Open Questions (tracked as issues)

- Which managed IdP for GA (Okta/Auth0/AzureAD)?
- Neo4j license & sizing for GA?
- Provenance ledger implementation (in‑house vs. Sigstore/Rekor integration)?

---

## 14) Appendix — Concrete Tasks and Paths

- **Helm Rollout**: `charts/app/templates/rollout.yaml`
- **Dashboards**: `infra/grafana/dashboards/api-golden-signals.json`
- **OPA ABAC**: `SECURITY/policy/opa/abac.rego`
- **Compose**: `deploy/compose/docker-compose.full.yml`
- **Backend (current)**: `conductor-ui/backend/server.mjs`
- **Frontend (current)**: `conductor-ui/frontend/src/App.tsx`
- **Terraform (placeholder)**: `infra/aws/main.tf`

---

### Definition of Ready (DoR)

- Issue scoped, risks listed, tests defined, migration plan (if any), observability additions noted, flag strategy documented, rollback path described.

### Definition of Done (DoD)

- Code merged via protected PR; preview env passed checks; canary verified; dashboards clean; audits present; docs updated; runbooks amended.
