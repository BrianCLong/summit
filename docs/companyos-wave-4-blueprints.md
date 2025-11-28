# CompanyOS Wave 4 Delivery (Prompts 25–32)

This blueprint expands the wave 4 initiatives into implementation-ready designs. It adds data shapes, interface expectations, observability hooks, rollout steps, and runbooks so teams can ship aligned, secure, and testable slices.

## Cross-Cutting Architecture and Guardrails

- **Contexts:** All experiences and APIs are scoped by `(tenant, environment, region)`; URLs and API headers carry these selectors and every service enforces row-level and capability checks before rendering or mutating data.
- **Identity and authorization:** OIDC with short-lived access tokens and refresh tokens; step-up auth (WebAuthn/TOTP) for risky actions. RBAC for coarse module access; ABAC for per-entity actions (tags: tenant, environment, data-classification, blast-radius).
- **Telemetry defaults:** Every feature emits structured logs (`trace_id`, `tenant`, `actor`, `capability`, `resource`), metrics (latency, error rate, success counts), and audit events for all mutations. Dashboards and alerts are enumerated per section.
- **Evidence and lineage:** All user-visible mutations attach evidence packs (actor, inputs, policy decisions, time, signatures) and are stitched into IntelGraph. Data pipelines carry schema + classification tags with provenance and residency.
- **UX foundations:** Global search + command palette, consistent slide-over “Inspect” panels, inline safe actions with blast-radius previews, optimistic UI guarded by server confirmations, and contextual runbook links.
- **Rollout:** Ship behind feature flags per tenant; staged rollout (internal → pilot tenants → general). Include smoke checks, alert baselines, and rollback/kill-switch per module.

## 25) CompanyOS Console v1 (Unified Front Door)

### Console Model & ADR
- **Personas:** Platform engineer (service topology + deployments), SRE (SLOs/incidents), Security analyst (policies/audit), Tenant admin (config/feature flags). Multi-tenant separation by tenant context; RBAC/ABAC drives visible modules, actions, and data scopes. Step-up auth for break-glass actions (prod changes, tenant-wide policy edits).
- **Navigation:** Global left rail: Services, Tenants, Deployments, Incidents, Policies. Utility bar: global search, notifications, persona switch, tenant/context picker, help. Contextual breadcrumbs per entity.
- **Multi-tenant principles:** Hard tenant scoping in URL + header, no cross-tenant search unless role allows. Policy-aware components render empty/placeholder states when unauthorized rather than error. All mutations gated by capability checks + audit hooks.

### Data & Integration Surfaces
- **APIs:**
  - `GET /console/services/:id` → service overview (health, SLOs, deployments, open incidents, evidence links).
  - `GET /console/tenants/:id` → effective policies, flags, residency posture, export/import states.
  - `GET /console/incidents/:id` → timeline with correlated deployments, alerts, audit events.
- **Pluggable panels:** Registry schema `{id, type, requiredCapabilities, inputs: {serviceId?, tenantId?}, dataContracts}` with sandboxed iframe or federated module loading; panels declare telemetry namespace.
- **Data contracts:** Health cards rely on SLO burn data (`error_budget_remaining`, `burn_rate_5m/1h/24h`), deployment timeline entries (`deploy_id`, `commit`, `maestro_plan`, `evidence_pack_uri`).

### Information Architecture
- **Home (operator landing):** Cards for top service health (SLO burn, current alerts), recent deployments with evidence packs, active incidents with severity/status, tenant configuration summary (flags, policy drift), and quick links to runbooks.
- **Service detail:** SLO overview, error/latency histograms, current alerts, deployment timeline with evidence packs, linked runbooks, and “Inspect entity” side panel (logs, traces, IntelGraph relations, audit trail).
- **Tenant detail:** Effective policies, feature flags by environment, usage highlights, recent config changes, residency posture, and export/import actions with status.

### Integrations
- Pluggable panels for observability (Grafana/Datadog dashboards), Maestro plans/runs (deploy/rollback), and IntelGraph/Audit (“what changed?” timelines). Panels register via schema describing inputs (service id, tenant id) and required capabilities.
- **Observability hooks:** Default alerts—console API p95 latency, 5xx rate, and widget load errors; synthetic flows for landing, service detail, tenant detail, and incident acknowledgement.

### UX Patterns
- Global search across services/incidents/tenants with facet filters and RBAC-scoped results.
- “Inspect this entity” slide-over: quick facts, related entities (IntelGraph), recent audit entries, tail logs, and links to dashboards.
- Safe inline actions: confirmations + blast-radius summary; step-up auth for risky actions; optimistic UI with rollback hints.

### Definition of Done
- Console can navigate to a service and show health + deployments, and to a tenant to show config + effective policies.
- Operator walkthrough doc provided (see [Operator Walkthrough](#operator-walkthrough-day-in-the-life)).

### Operator Walkthrough (Day in the Life)
1. Land on Home, spot elevated error burn for “payments-api.”
2. Global search → service detail; inspect SLO chart and alerts.
3. Open “Inspect” panel → view recent deploy; link to Maestro run and evidence pack.
4. Correlate incident timeline; acknowledge incident; follow runbook link.
5. Apply feature flag mitigation for tenant A (step-up auth) and watch SLO recover.
6. Log audit captured; status auto-updates in Incidents view.

## 26) Analytics & Reporting Fabric v1

### Analytics Model & ADR
- **Taxonomy:** Product events (page views, feature interactions, flag evaluations); Ops events (deployments, incidents, SLO alerts, policy denials).
- **Dimensions:** Tenant, environment, user role, feature/flag, region, client type, app version. Optional PII stored tokenized; linkable via Data Spine privacy kit; residency tags propagate through pipelines.
- **Policies:** Strict separation by tenant; row-level filters enforced; DLP for exports; retention per region.

### Data Model & Storage
- **Event envelope:** `{event_id, occurred_at, tenant, user_id?, role, feature, region, env, client, pii_classification, payload_hash}`.
- **Stores:** Hot path in columnar store partitioned by `tenant/region/day`; cold path archived to object storage with manifest + lineage. Materialized views for feature adoption and retention refreshed hourly.

### Ingestion & Storage
- Event gateway (HTTP + batch) normalizes schema, validates PII tags, stamps residency. Partitioned storage by tenant/region/day. Stream processor hydrates materialized views for ad-hoc (Trino/Presto) and canned reports (tableau/Metabase backed tables).

### Reporting & Dashboards
- Built-ins: Feature adoption per tenant/feature, retention/DAU-MAU, operational KPIs (uptime, latency p95, policy denial rates) surfaced to customer admins.
- **Alerting:**
  - Adoption regression alert: drop >20% week-over-week for top features.
  - Latency regression alert: p95 > target for 3 consecutive intervals per tenant.
- **Exports:** CSV/Parquet with residency enforcement; signed URL expiry ≤24h; audit entries for every export.

### Tenant-Facing Views
- Lightweight console page: time/feature/environment filters, role segmentation, chart + table, CSV export subject to residency+DLP checks; webhook export with signed URLs.
- **Guardrails:** Sampling caps for free trials; per-tenant query concurrency limits; backpressure with retry-after semantics.

### Definition of Done
- Two demo tenants seeded with divergent usage (e.g., Tenant Alpha heavy feature X; Tenant Beta minimal usage).
- Example report: “Feature X adoption over last 30 days by tenant and role.”
- Runbook: how feature teams instrument events and query dashboards.

## 27) SLO Doctor & Performance Coach v1

### SLO Knowledge Model & ADR
- Standard SLOs: availability, latency, error rate. Each maps to metrics (request_success_ratio, latency p90/p95, error_count) with burn-rate windows (5m/1h/24h) and budgets.
- Heuristics: detect noisy alerts (alert-to-incident ratio > threshold), misaligned targets (too tight when stability insufficient), recurrence on endpoints/dependencies, and utilization vs capacity gaps.

### Data Integration
- Inputs: SLO configs from Observability, time series + alert history, incidents/postmortems via IntelGraph/Audit to correlate contributing factors.
- **Contracts:** Metrics must include `service`, `env`, `region`, `sli_type`, `window`, `value`, `objective`; incidents must include root cause tag and impacted endpoints to enable correlation.

### Analysis Engine
- Evaluate alert noise, burn vs budget, endpoint hotspots, dependency-induced errors, and release correlations. Recommendations: adjust thresholds/budgets, add caching, widen error budgets, increase capacity, or update runbooks.
- **Output schema:** `{service, env, score, findings: [{type, evidence, severity, suggested_action, owner}], generated_at, trace_id}`.
- **Safeguards:** Recommendations are read-only until approved; auto-tuning behind a separate flag with dry-run mode and rollback checkpoints.

### UX & Surfacing
- “Doctor view” per service in Console: SLO health score, key findings, recommended actions with links to dashboards/runbooks; optional LLM summary for executive view.
- **Runbooks:** "Reduce pager noise" (dedupe/threshold tuning), "Cache hot endpoints", "Increase capacity" with stepwise actions and validation queries.

### Definition of Done
- At least one service with generated SLO health report and actionable recommendation reducing pager noise or improving reliability.
- Doc: teams use SLO Doctor during reliability reviews.

## 28) Security Operations & Threat Detection Spine v1

### Threat Model & ADR
- Priority threats: account takeover, token theft, privilege abuse, supply chain anomalies.
- Signals: auth anomalies (impossible travel/MFA bypass), policy denials spikes, unusual deploys/admin actions, sensitive config changes.

### Signal Ingest
- Integrate Audit Spine (auth, policy decisions, sensitive actions) + infra/network logs. Normalize into security-event schema (actor, tenant, signal type, severity, evidence, lineage).
- **Data quality:** Enforce source authenticity (mTLS/signatures), clock skew correction, and replay protection via nonce + windowing.

### Detection Rules & Playbooks
- Rules: suspicious login patterns, excessive policy denials, unexpected admin actions/config drift. Playbooks via Maestro: lock account, rotate keys, elevate logging, pause deploy pipeline, notify on-call.
- **Tuning:** Suppression windows to avoid alert storms; per-tenant baselines; detection versioning with canary + auto-rollback on false-positive spikes.

### SOC Console
- Views: open security alerts with severity, event timelines, correlated context, one-click IntelGraph exploration, response playbook execution with audit.
- **KPIs:** MTTD/MTTR, false-positive rate, playbook success rate, investigation dwell time, and reopen rate.

### Definition of Done
- Simulated attacks generate alerts; at least one end-to-end response drill executed; runbook for triage/response provided.

## 29) Change Management & Feature Lifecycle v1

### Lifecycle Model & ADR
- States: idea → experiment → beta → GA → sunset. Features link to flags, releases, tenants, evidence. Each state requires artifacts: PRDs, risk assessment, experiment results, SLO/security checks, approvals.

### Feature Registry
- Central catalog: metadata (owner, objectives, KPIs), links to flags/code/analytics/docs, IntelGraph integration, evidence automation attachments.
- **API contract:** `POST /features` with required fields `{name, owner, objectives, kpis, data_classes, rollout_flag}`; change history immutable with actor + policy decisions.

### Workflow Automation
- Flows for requesting rollout to new tenants, approvals (risk/compliance/SLO/security), optional Maestro plans for rollout/rollback, automatic audit logging.
- **Quality gates:** Block rollout if SLOs regressing, unresolved P0/P1, or missing risk sign-off. Guardrail monitors watch early-life error rates with auto-pause.

### Experimentation Hooks
- Define control/variant, assign rollout %, wire analytics metrics, automatic guardrail alerts (error rate, latency) before expansion.
- **Stat guidance:** Default power analysis targets 80% power with 95% confidence; minimum sample size computed per metric variance; sequential testing discouraged unless explicitly configured.

### Definition of Done
- At least one feature tracked end-to-end; feature review template; dashboard showing features by state with owners/status.

## 30) Tenant Data On/Off-Ramp v1

### Migration Model & ADR
- Formats: NDJSON/CSV/Parquet; schema + classification validation; PII/residency tagging; SLAs for large imports (chunked, resumable) and safe limits.

### Import Pipelines
- Ingest framework validates schema/classification, runs DLP/privacy checks, streams into Data Spine with lineage + audit; quarantine lane for violations; retryable tasks.
- **Integrity:** Checksums per chunk; dedup via content hash; poison-pill handling routes invalid rows to quarantine with redaction.

### Export Pipelines
- Enforce residency/DLP; tenant-initiated exports for closure; export packs include lineage, validation results, signatures; secure delivery via time-bound signed URLs.
- **Revocation:** Immediate revoke path for compromised exports; access logs surfaced in tenant console; export watermarking for forensic attribution.

### Admin UX & Status
- UI to start/monitor/cancel imports/exports, view errors/partial failures, resume/retry; notifications for completion and policy blocks.
- **Throughput safeguards:** Dynamic rate limits and chunk sizing based on backend pressure; progress with ETA; cost estimation shown before execution.

### Definition of Done
- Demo tenant imported from sample dataset; sample export pack with evidence; runbook for large migrations.

## 31) Client SDK & Edge Access Kit v1

### Client Model & ADR
- Platforms: TypeScript web, mobile baseline, CLI. Auth: OIDC/OAuth with PKCE, refresh + rotation, step-up for risky scopes. Multi-tenant + environment selection via scoped client config; isolation of tenant tokens.

### Core SDK Features
- Shared: auth handling, token refresh/rotation, typed API clients (OpenAPI-generated), built-in telemetry (logs, perf, UX events), request signing + retry/backoff, clock skew handling.
- **Interfaces:**
  - `createClient({ tenant, env, region, auth, transport, cache })` returns typed client with `services`, `tenants`, `incidents`, `flags` modules.
  - Telemetry hook: `client.on('telemetry', handler)` emits `{kind, duration_ms, status, tenant, feature}`.

### Offline & Edge Considerations
- Minimal offline queue for safe idempotent ops; retry with jitter; local PII encryption; edge-friendly caching of config/flags.
- **Edge posture:** Optional wasm-compiled signer; per-request HMAC with rotating keys; bounded cache TTL with purge on logout/tenant switch.

### Developer Experience
- Quickstarts: web app with login + API call; CLI for tenant/service interactions; versioning/release via semver + changelog; lint/tests and typed builds.
- **Release hygiene:** Conventional Commits, changelog generation, compatibility matrix (min browser/Node/mobile SDK versions), and sample GitHub Actions publishing workflow with signing.

### Definition of Done
- At least one internal tool/demo built solely using SDK; partner-facing client integration guide.

## 32) Partner & Demo Sandbox v1

### Sandbox Model & ADR
- Clear separation of production/staging/sandbox; synthetic or anonymized data only. Guardrails: rate limits, blocked risky actions (destructive ops), scoped tokens.

### Demo Tenants & Scenarios
- Preconfigured tenants: Ops-heavy (incidents, SLOs, releases) and Admin-heavy (multi-tenant config, analytics). Seeded events for deployments/incidents/usage with replay scripts.
- **Scripts:** Nightly reset job to restore seed state; scripted incidents and deployments emitted via Maestro and Observability fakes; feature adoption curves baked into analytics views.

### Self-Service Trials
- Flow to create time-limited trial tenants with guided tours/checklists to reach value moments; automatic expiration/reset.
- **Limits:** Trial quotas (requests/day, storage caps), masked integrations, and rate limits tuned to prevent abuse while keeping demos snappy.

### Sales & CS Tooling
- Playbooks + console enhancements: “start a demo in 5 minutes,” reset tenant to known state, capture feedback and session notes.
- **Metrics:** Demo conversion rate, time-to-first-wow, and feature coverage per session; feedback form routes to ProductOps with transcript excerpts.

### Definition of Done
- Sales/CS can run end-to-end demo without engineering; demo handbook with recommended stories and flows.

## Validation Matrix and Runbooks

- **Smoke tests (pre-merge):** lint + unit for SDK, schema validation for event envelopes, markdown lint for docs, and static checks for console routes.
- **Synthetic user journeys (post-deploy):** landing → service detail → incident ack; tenant detail → export preview; sandbox trial signup → guided tour completion.
- **Operational runbooks:**
  - Console outage: fail open to cached read-only cards; disable mutations via feature flag; post banner.
  - Analytics backlog: scale consumers, enable backpressure, and trigger catch-up jobs; monitor lag SLO (<5m for hot tenants).
  - SLO Doctor misfire: rollback recommendations, disable auto-tune, and reprocess with previous heuristics.
  - Security alert flood: enable suppression, widen baselines, and engage threat intel review.
  - Migration stuck: surface chunk id + retry token; reroute to quarantine; notify tenant admin.

## Rollout & Compliance

- **Rollout stages:** internal dogfood → pilot tenants (opt-in) → GA with per-tenant flag. Each stage requires passing smoke + synthetic checks, zero P1s, and alert baselines stable for 24h.
- **Compliance hooks:** audit trails for all admin actions; DLP scanning for exports; residency enforcement baked into analytics/migrations; SOC-lite detections align with threat model.
- **Documentation:** Operator walkthrough, reliability review guide (SLO Doctor), feature review template, migration runbook, SDK integration guide, and demo handbook updated alongside releases.
