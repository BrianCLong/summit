# CompanyOS Paved-Road Delivery Suite (v1)

This document bundles the eight delivery tracks requested for CompanyOS into a coherent, production-ready blueprint. Each track includes architecture, implementation notes, controls, and runbooks so individual teams can execute independently while remaining aligned.

---

## 1) Golden Path Platform – Paved-Road Service Scaffold + CI/CD

### Architecture & Decisions (ADR-001)
- **Language/Framework:** TypeScript + Express with OpenTelemetry (HTTP + DB instrumented) for fast iteration and rich telemetry.
- **Repo Layout:** Monorepo-ready template (see `templates/golden-path-service`) with `/src` for app code, `/deploy/chart` for Helm, and `.github/workflows` for CI.
- **Testing Strategy:** Jest for unit/integration, supertest for HTTP contracts, smoke tests baked into CI; coverage threshold 80%+.
- **Deployment Model:** OCI image pushed to registry (e.g., GHCR) signed via cosign; Helm chart supports progressive rollouts and rollback-friendly values.

### Component Diagram (C4-style, logical)
- **API Layer (Express HTTP)** → **Controllers** → **Service Layer** → **Adapters (DB/External)**. 
- **Middleware:** request context (trace/request IDs), auth policy hook, structured logging, metrics.
- **Sidecars/Infra:** OPA sidecar (policy), OTel collector (traces/metrics), Env/Secret store (no inline secrets), ingress → service pod (stateless) → managed DB/cache.
- **Statelessness:** All state externalized to DB/cache; config via env/secret references.

### Service Scaffold Highlights
- Health (`/healthz`) and readiness (`/readyz`) endpoints.
- Structured logging with pino; trace/span IDs injected via cls-hooked request context; prom-client metrics for HTTP, DB, and external calls.
- Config exclusively via env vars (12-factor) with validation; secrets expected from secret store references.

### CI/CD Pipeline
- Build/test → lint → coverage; SBOM via `syft`; container build via `docker buildx`; cosign signing; push to registry.
- Helm chart with values for image tag, HPA, pod disruption budget; rollback via `helm rollback` with stored release history.
- Example workflow: `.github/workflows/golden-path-ci.yml` inside template directory.

### Policies & Gates
- **Pre-merge:** lint, tests, SAST (`npm audit`/`semgrep`), secret scan (`gitleaks`).
- **Pre-deploy:** SBOM + vuln report artifact; cosign signature verification; policy check gate.

### Definition of Done
- Hello World service scaffold ready; pipeline configured for demo env deploy via Helm; runbook below demonstrates commit → production path.

### Runbook (new team onboarding)
1. `npm install` in template; set envs from `.env.example`.
2. `npm run lint && npm test` locally.
3. `npm run docker:build` (optional) then push via CI.
4. Trigger pipeline with branch push; CI builds, signs, and publishes image; deployment job applies Helm values for demo env.
5. Verify `/healthz` and `/metrics`; review Grafana/Loki dashboards seeded by chart values.

---

## 2) Identity & Policy – ABAC + Step-Up Auth

### Model & ADR (ADR-002)
- **Attributes:**
  - User: id, roles, assurance level, mfa methods, tenant, risk score.
  - Resource: type, owner, classification, residency, lineage tag.
  - Action: verb, sensitivity level, requires-step-up (bool), audit-scope.
  - Context: device posture, network zone, time, request ip/geo, session age.
- **Resolution:** user attributes from IdP/JWT claims; resource attributes from service DB or Data Spine registry; context from request metadata; merged into OPA input.
- **Threats:** privilege escalation (role abuse), lateral movement (tenant pivot), policy bypass (missing context), replay (stale assurance). Mitigations: deny-by-default, bounded attribute TTL, explicit tenant binding, signed JWT with nonce, decision logging.

### Policy Engine Integration
- OPA sidecar evaluating `can(user, action, resource, context)`; input includes request + resolved attributes; outputs decision + obligations (e.g., `step_up_required=true`).
- Decision logs shipped to audit sink with trace IDs.

### Step-Up Authentication
- WebAuthn (preferred) or TOTP fallback; policy marks high-risk actions (e.g., `transfer:approve`); service validates fresh WebAuthn assertion before proceeding.
- Audit events include decision, challenge issuance, and verification outcome.

### Developer Experience
- Lightweight SDK (REST/JSON) sample in template code: `policyClient.checkAccess()` returning decision + obligations.
- Example policies show deny-by-default, explicit allow with conditions, and cohort-based step-up triggers.

### Definition of Done
- Demo endpoint guarded by ABAC + step-up contract documented in template README; audit trail example supplied in the doc.

---

## 3) Observability First – SDK + Golden Dashboards

### Instrumentation Standard (ADR-003)
- **Logs:** JSON, fields: `ts`, `level`, `msg`, `traceId`, `spanId`, `requestId`, `userId`, `tenant`, `route`, `status`.
- **Metrics:** RED/USE—`http_request_duration_seconds`, `http_requests_total{status,method,route}`, `http_request_errors_total`, DB/external latency and error gauges.
- **Tracing:** W3C TraceContext; propagate via headers; OTel SDK default sampler 1% prod, 20% staging.

### SDK / Libraries
- Auto-instrument Express HTTP server + axios/http client; middleware attaches correlation IDs; metrics emitted via prom-client; trace spans for DB + outbound.

### Golden Dashboards
- Grafana dashboards: service health (RED), infrastructure saturation, SLO view (availability/latency/error budget burn). Panels wired to metrics above.

### SLO & Alerting Kit
- Example SLOs: 99.9% availability, p95 latency <300ms for read, <800ms for write; error budget burn alerts (pager) at 2%/1h, (ticket) at 5%/24h.

### Definition of Done
- Reference template ships with OTel/Prometheus hooks and Grafana JSON snippets; onboarding steps in runbook.

---

## 4) Data Spine – Schemas, Lineage, Retention & Residency

### Data Model & Classification (ADR-004)
- Canonical schemas:
  - **Account:** `id`, `name`, `status`, `tier`, `ownerUserId`, `createdAt`, `region`.
  - **User:** `id`, `accountId`, `email`, `roles`, `assuranceLevel`, `createdAt`, `residencyRegion`.
  - **Event:** `id`, `accountId`, `actorUserId`, `type`, `payload`, `occurredAt`, `ingestSource`, `lineage`.
- **Classification Levels:** Public, Internal, Confidential, Regulated. Residency constraints apply to `User.residencyRegion` and `Event.region`; regulated data pinned to region-specific stores.

### Schema Management
- JSON Schema registry with semantic versioning (MAJOR.MINOR.PATCH); backward-compatible changes allowed for MINOR/PATCH; deprecations logged and scheduled.
- Migrations with drift detection; registry entries tagged with producer commit SHA.

### Lineage & Provenance
- Each pipeline hop annotates `lineage` with `{producer, version, commitSha, policyId, timestamp}`. Reference ingest → transform → store flow supplied in doc; emitted to audit sink.

### Retention & Deletion
- Policy table: Public (365d), Internal (180d), Confidential (90d), Regulated (per-jurisdiction default 180d with hold support).
- Scheduled job per store (e.g., Postgres) enforces retention; logs deletions with count + watermark.

### Definition of Done
- Example dataset walkthrough in this doc demonstrates lineage stamping and retention job behavior; residency controls documented for Helm values.

---

## 5) Reliability & Release – Canary & Auto-Rollback

### Rollout Strategy (ADR-005)
- **Canary by Percentage:** 5% → 25% → 50% → 100% with hold periods; cohort-based override for tenant or region if needed.
- **Signals:** SLO error budget burn, p95 latency delta vs baseline, HTTP 5xx rate, custom business KPI (success ratio). Failure modes: slow degradation, burst errors, bad migrations. Mitigations: fast halt + rollback, DB migration guardrails, synthetic probes.

### Canary Manager
- Helm values support canary Deployment with separate Service; traffic split via ingress annotations (NGINX/Service Mesh). Manager monitors metrics and writes promotion/rollback decisions with evidence.

### Auto-Rollback
- Scripted rollback uses `helm rollback` with reason + metrics snapshot. Audit event emitted with trace ID and decision metadata.

### Validation & Testing
- Synthetic probe job hits canary routes; chaos-lite fault (latency injection) to validate auto-rollback path.

### Definition of Done
- Demo steps captured in runbook and example values; charts for canary vs baseline metrics included.

---

## 6) Developer Ergonomics – Local Dev Kit & Golden Paths

### Local Stack Design (ADR-006)
- Run API + Postgres locally; message bus via Redpanda/Mock; external services mocked. Secrets loaded from `.env.local` using dotenv-safe; no inline secrets.
- Performance guardrail: stack starts <60s; services limited to 1 CPU/1.5GB by Compose defaults.

### Dev Environment
- Docker Compose recipe in template (`docker-compose.dev.yml`) bringing up API, Postgres, Redpanda; hot-reload via `ts-node-dev`.

### Fixtures & Seed Data
- Deterministic seed script `npm run seed` loading base accounts/users/events; reset via `npm run reset:db` (drop+reseed).

### Developer Workflows
- `make dev-up` analogue via npm script `npm run dev:stack` to start Compose and run smoke check hitting `/healthz`.

### Definition of Done
- Steps ensure new engineer can clone, run `npm install` + `npm run dev:stack`, and hit localhost endpoint within 15–30 minutes; walkthrough in RUNBOOK.

---

## 7) Product Vertical – Flagged Feature Delivery (90-day)

### Problem & ROI Brief
- Feature: **Secure Payment Approval** with ABAC + step-up. Target: finance admins approving high-value payouts. ROI: reduce fraud losses by 20%, cut approval time by 30%. Success metrics: adoption rate, step-up completion success, false-positive denials <2%.

### Feature Design
- API: `POST /payments/:id/approve` requiring policy allow + step-up; UI uses feature flag `payments.secureApproval`. Data model references Account/User/Event schemas; audit event emitted with lineage tags.
- Policy matrix: finance_admin can approve with step-up if amount > threshold; auditor read-only; tenant binding enforced.

### Implementation
- Built on scaffold; observability SDK enabled; deployed via canary; feature flag includes expiry + cleanup task; rollout via cohort of pilot tenants.

### Evidence & Telemetry
- SLOs for approval latency and success rate; product analytics events (`approval_initiated`, `step_up_prompted`, `approval_completed`).

### Definition of Done
- Pilot cohort live; release + migration notes captured; initial usage review scheduled after 2 weeks with next-step recommendations.

---

## 8) Risk & Compliance Automation – SBOM, CVE Budget, Attestations

### Risk Model (ADR-007)
- Track per artifact: SBOM, vuln report, cosign signature, build provenance (commit, builder, timestamp), license set.
- CVE budget: block Critical/High; warn on Medium with 30-day SLA; allowed licenses: MIT/Apache/BSD/ISC; deny GPLv3/AGPL for services.

### SBOM & Scan Pipeline
- CI step runs `syft` for SBOM, `grype` for vulns, `npm audit` for JS deps, `trivy` for image; artifacts uploaded.

### Policy Gate
- Deployment job verifies cosign signature and checks vuln budget + license allowlist; failure emits actionable message with links to reports.

### Attestations
- In-toto provenance generated during build; cosign attestations stored alongside image; deploy step verifies attestations before Helm upgrade.

### Definition of Done
- Template workflow exercises full chain; compliance report bundle example described in RUNBOOK with pointers to SBOM/VEX artifacts.

---

## Innovation Opportunities
- Enforce **progressive delivery-as-code**: policy-driven promotion decisions encoded as reusable `canaryPolicy.yaml` consumed by CI.
- Add **automatic SLO budget-aware autoscaling**: tie HPA targets to error-budget burn and latency to prevent overload.
- Adopt **OpenPolicyAgent bundles** for offline policy validation in CI to catch drift before deploy.

