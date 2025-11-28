# CompanyOS Wave 4 Solution Pack (Prompts 25–32)

The wave 4 pack now documents the end-to-end model, architecture, data and control flows, and validation artifacts needed to make each domain implementable and testable. Cross-cutting guardrails: zero-trust defaults, tenant isolation by design, evidence-first automation, and observability-by-default.

## 25) CompanyOS Console v1

### Console Model & ADR
- **Personas**: Platform engineers (service ownership, deployments, infra hooks), SREs (SLOs, incidents, runbooks), Security analysts (policies, audit, anomalies), Tenant admins (configuration, feature flags, policy views). Secondary personas: finance ops (chargeback views) and support (tenant-scoped diagnostics) with read-only defaults.
- **Core navigation**: Global nav exposing Services, Tenants, Deployments, Incidents, Policies, Search, and Admin (for role/tenant span). Context bar shows selected tenant/environment/service and effective role with elevation timer.
- **Multi-tenant + RBAC/ABAC principles**:
  - All resources are scoped by tenant, environment, and service ownership with policy-enforced filters and late-binding evaluation.
  - UI states derived from entitlements: disable instead of hide when discoverability is safe; hide when access could leak presence. Inline “why can’t I?” helper cites policy reason.
  - Step-up auth required for risky actions (policy edits, force-redeploy, tenant-level changes). Evidence and audit trails captured for all elevated operations with signed bundles.
  - Cross-tenant aggregation is allowed only for operators with explicit span-of-control grants; default to least privilege with tenancy selector locked to current context and scoped search indices.

### Information Architecture
- **Landing overview**: service health (SLO burn down, alert banner, top error budgets), recent deployments with evidence packs, active incidents with status/owner, tenant configuration highlights and feature flag drift, “what changed last 24h” activity digest.
- **Workspace layout**: left nav (domains), top context switcher (tenant/env/service), main workspace with cards for health, deployments, incidents, policy posture, and change events. Secondary rail hosts pluggable panels and live runbook links.
- **Detail views**:
  - **Service**: health/SLOs, current alerts, dependencies, recent deployments + evidence, change calendar, "inspect entity" panel (IntelGraph, logs, traces, audit).
  - **Tenant**: configuration summary, effective policies, feature flags and rollout state, recent admin actions, outstanding requests, policy simulation (proposed vs effective decisions).
  - **Incidents**: status, timeline, linked alerts/deployments, runbook links, ownership, mitigations, live war-room notes, responder roster.

### Integrations
- Pluggable panels for observability dashboards (Grafana/Tempo/Loki), Maestro plans/runs (deploy, rollback, mitigation), and Audit & IntelGraph timelines ("what changed" with evidence diffs). Panels use a signed embedding model with ABAC filters.

### UX Patterns
- **Global search** across services/incidents/tenants with intent shortcuts (e.g., `:svc api-gateway`). Autocomplete respects tenant scope and recent context.
- **Inspect side panel** with entity metadata, related alerts/deployments, deep links to IntelGraph, audit, logs/traces. Supports “freeze view” for sharing a permalink with signed context.
- **Safe inline actions**: pause rollout, apply policy, open runbook, trigger Maestro plan; step-up auth for high-risk, preflight checks with projected blast radius and dry-run evidence.

### Definition of Done
- Navigate to a service and view health + deployments with evidence, including last deploy log excerpt and linked SLO impact.
- Navigate to a tenant to view config and effective policies with simulation results for a sample request.
- "Day-in-life" operator walkthrough covering alert triage, service drill-in, deployment verification, and tenant policy review with screenflow references.
- **Validation hooks**: console smoke test checklist, permission matrix per persona, and audit event IDs for all risky actions.

---

## 26) Analytics & Reporting Fabric v1

### Analytics Model & ADR
- **Event taxonomy**: product events (feature usage, navigation, conversions) vs ops events (deployments, incidents, policy decisions, SLO state changes). Standard envelope: `tenant_id`, `user_role`, `feature`, `environment`, `region`, `session_id`, `consent_scope`, `purpose`.
- **Dimensions**: tenant, user role, feature, region, environment, device, plan, experiment arm, residency zone, and data quality tier.
- **Privacy/PII**: minimize collection; classify fields with Data Spine labels; enforce residency, retention, and purpose bindings; default pseudonymization for user identifiers and bounded lookback; deletion hooks for subject requests with lineage.

### Ingestion & Storage
- Streaming ingestion from services/frontends with schema registry; partition by tenant/region/environment; validation for classification tags; dead-letter for violations with auto-feedback to producers.
- Storage: hot (columnar OLAP for recent 30–90 days), warm (object storage with manifest + Iceberg), and privacy-aware access controls bound to tenant and region; query accelerators via materialized views.
- Query model: ad-hoc (SQL/Trino) with row/column-level filters; canned report templates materialized for frequent dashboards; cost controls via query budget per tenant/admin.

### Reporting & Dashboards
- Built-in reports: feature adoption per tenant/role, retention & active usage cohorts, operational KPIs (uptime/latency) for customer admins with SLO overlays; anomaly ribbons that highlight statistically significant shifts.

### Tenant-Facing Views
- Tenant console with filters (time, feature, environment, role), comparison to plan benchmarks, export with residency/DLP checks and audit emission. Exports are signed bundles with manifest and policy evaluation proof.

### Definition of Done
- Two demo tenants seeded with distinct profiles (high-adoption vs low-engagement) and contrasting regional footprints.
- Example report: "Feature X adoption over last 30 days by tenant and role" with drilldown to sessions and conversions, plus anomaly markers.
- Runbook: instrumentation guide for feature teams and how to read dashboards, including schema examples and consent tagging.
- **Validation hooks**: synthetic event generator, schema conformance dashboard, and row-level access tests for two tenants.

---

## 27) SLO Doctor & Performance Coach v1

### SLO Knowledge Model & ADR
- Standard SLOs: availability, latency percentiles, error rate, throughput saturation. Each SLO maps to service metrics (requests, errors, duration, saturation) with budgets and alerting rules.
- Heuristics: detect noisy alerts (flapping, low burn), misaligned SLOs (too tight/loose vs historical), hotspot endpoints, dependency-induced errors, and budget burn acceleration. Includes seasonal baselines and deploy-aware change windows.

### Data Integration
- Inputs: SLO configs from Observability, time series + alert history, incidents and postmortems via IntelGraph/Audit, deploy timelines. Correlate by service, version, and dependency graph.

### Analysis Engine
- Evaluate alert precision/recall vs incidents; flag SLOs with chronic false positives/negatives.
- Pattern detection: endpoints with repeated burn, dependency correlation, regression after deploy, cache hit anomalies.
- Recommendations: threshold tuning, budget policy changes, caching/queueing suggestions, capacity headroom, circuit-breaker/timeout adjustments. Includes expected risk/benefit notes and “pager noise delta” estimate.

### UX & Surfacing
- Doctor view per service: health score, SLO adherence, noisy rule list, top contributing endpoints/dependencies, and change calendar.
- Actionable recommendations with links to dashboards and runbooks; optional LLM summarization for exec-friendly notes; copyable Maestro plan snippets for rollout.

### Definition of Done
- At least one service with generated SLO health report and actionable recommendation that reduces pager noise or improves reliability.
- Doc: guidance for teams using SLO Doctor in reliability reviews plus a checklist for adopting recommendations safely.
- **Validation hooks**: synthetic noisy-alert scenario, regression after deploy scenario, and acceptance criteria for recommendation quality (signal-to-noise score).

---

## 28) SecOps & Threat Detection Spine v1

### Threat Model & ADR
- Priority threats: account takeover, token theft, privilege abuse, supply-chain anomalies. Signals include auth anomalies, policy denials, unusual deploys/infra changes, privileged data exports, and consent-scope escalations.

### Signal Ingest
- Integrate Audit Spine (auth, policy decisions, sensitive actions) plus infra/network logs; normalize into security event schema with entity linkage (users, tenants, services, assets). Clock-skew normalization and deduplication enforced.

### Detection Rules & Playbooks
- Initial rules: suspicious login patterns, excessive policy denials, unexpected admin/config changes, unusual deploy cadence. Maestro playbooks: lock account, rotate keys, raise log level, isolate service, notify owners, and create incident with prefilled context.

### SOC Console
- Views: open security alerts with severity/owner, timelines with correlated context, one-click IntelGraph links for relationships and blast radius, suppression/ack with audit, and MITRE ATT&CK tagging.

### Definition of Done
- Simulated attacks generate alerts; at least one end-to-end response drill executed; runbook for SecOps triage and response of new alerts with evidence capture steps.
- **Validation hooks**: red-team replay scripts, false-positive review loop, and SLA targets for TTD/TTR.

---

## 29) Change & Feature Lifecycle v1

### Lifecycle Model & ADR
- Feature states: idea → experiment → beta → GA → sunset. Features link to flags, releases, tenants, objectives, KPIs, and required evidence (SLO, security, compliance) per state. Includes "blocked" and "paused" sub-states with rationale tracking.

### Feature Registry
- Central catalog storing metadata (owner, objectives, KPIs), links to flags/code/docs, IntelGraph relationships, and evidence automation hooks. Supports API + CLI for updates with validation against required evidence per state.

### Workflow Automation
- Requests for tenant rollout with approvals and risk checks (SLO health, security posture, compliance). Maestro plans for rollout/rollback with guardrails, blast-radius simulation, and auto-rollback thresholds.

### Experimentation Hooks
- Define control vs variant, bind to product analytics, auto-capture metrics and segment by tenant/role/environment. Includes exposure logging and holdback controls.

### Definition of Done
- At least one feature tracked end-to-end; feature review template for decisions; dashboard showing features by state with status/owners; exportable audit of state transitions.
- **Validation hooks**: schema validator for registry entries, approval policy tests, and rollout canary checklist.

---

## 30) Tenant Data On/Off-Ramp v1

### Migration Model & ADR
- Supported formats: CSV/Parquet/JSON with schema registry; trust/validation for schema + PII tags; residency-aware storage; SLAs for large migrations with rate/size limits. Data classification and residency are enforced at ingress with reject + reason codes.

### Import Pipelines
- Validate schema/classification, run DLP/privacy checks, write into Data Spine with lineage, quarantine violations with feedback and retry. Supports chunked uploads, checksum verification, and replay-safe idempotency keys.

### Export Pipelines
- Enforce residency/DLP; support tenant-initiated exports (including account closure) with evidence of validation and audit events; signed export packs with manifest and per-file hashes.

### Admin UX & Status
- UI to start/monitor/cancel imports/exports; show progress, errors, partial failures, retry options; evidence pane for lineage and validation results; SLA timer with alerts when breached.

### Definition of Done
- Demo tenant imported from sample dataset; sample export pack with lineage/validation evidence; runbook for safe large tenant migrations; dry-run mode validated.
- **Validation hooks**: checksum mismatch test, residency violation test, and resumable upload scenario.

---

## 31) Client SDK & Edge Access Kit v1

### Client Model & ADR
- Platforms: TypeScript web SDK, mobile baseline (React Native/native bindings), CLI. Auth via OIDC/OAuth with refresh + step-up; tenant/environment selection encoded in tokens and client context. Supports signed pre-auth for service-to-service and edge token minting.

### Core SDK Features
- Auth handling with refresh + step-up prompts; typed API clients (OpenAPI-generated); built-in telemetry for logs/perf/UX events; multi-tenant headers and service discovery; pluggable storage for tokens with secure defaults.

### Offline & Edge Considerations
- Queued requests with backoff; limited offline cache for safe data; PII minimization with secure storage; edge-friendly retries and idempotency keys; clock-drift detection for token validity.

### Developer Experience
- Quickstarts: web login + API call, CLI for tenant/service operations. Versioning with semantic releases and changelog automation; example CI snippets for lint/tests/build/publish.

### Definition of Done
- At least one internal tool/demo built solely with SDK; client integration guide for partners; automated contract tests against mock server; telemetry opt-in/out toggles.
- **Validation hooks**: token refresh storm test, offline queue replay test, and type generation CI gate.

---

## 32) Partner & Demo Sandbox v1

### Sandbox Model & ADR
- Separation of prod/stage/sandbox with strict controls; synthetic/anonymized data; guardrails (rate limits, restricted actions, expiring creds, capped resources). Includes automated reset-to-baseline workflows and time-bounded access tokens.

### Demo Tenants & Scenarios
- Preconfigured tenants: ops-heavy (incidents, SLOs, releases) and admin-heavy (multi-tenant config, analytics). Seeded deployments/incidents/usage to drive dashboards; scripted event playback for deterministic demos.

### Self-Service Trials
- Flow to create time-limited trial tenants with guided tours/checklists for key value moments; automated cleanup and policy-scoped permissions; in-app “next best step” tips.

### Sales & CS Tooling
- Playbooks + console helpers: start demo fast, reset tenant to known state, capture feedback, share replay/evidence packs; one-click “sanitize + share” for prospect-safe exports.

### Definition of Done
- Sales/CS can run end-to-end demo without engineering; demo handbook with recommended stories and paths; telemetry showing demo completion funnel; rollback to clean state under 2 minutes.
- **Validation hooks**: sandbox reset smoke test, rate-limit enforcement check, and synthetic demo tour recording.
