# Wave 16: Codex Missions 121–128

This wave industrializes eight backend capabilities as merge-safe, additive services. Each module defines its own contracts, testing expectations, and integration surfaces so workstreams can proceed in parallel without blocking existing systems. The summaries below now include target data models, API shapes, CI/ops hooks, and adoption playbooks so teams can implement independently while staying interoperable.

## 121. `docs-hub/` — Docs-as-Code Hub & Spec Synchronization
- **Purpose:** Single source of truth for API specs, architecture docs, ADRs, runbooks, and capability templates that enforces drift control.
- **Model & Linkage:**
  - Index registry spans OpenAPI/GraphQL/proto specs, ADRs, diagrams, and runbooks keyed by service, module, and endpoint identifiers.
  - Link tables connect `endpoint ↔ spec ↔ doc ↔ diagram`, plus `service ↔ ownership ↔ runbook` with freshness timestamps and hash-based change tracking.
  - Optional `evidence` records store lint/validation outputs for specs to short-circuit re-validation during CI.
- **APIs:**
  - `GET /docs?service=X|endpoint=Y|capability=Z` returns authoritative spec/doc pointers and diagram assets (supports `format=markdown|json`).
  - `POST /drift-check` accepts commit metadata and git diff summaries; returns drift findings (spec changed without doc/runbook updates, dead endpoint references).
  - `GET /coverage` surfaces public API coverage (% endpoints with linked doc/spec/runbook) with per-service breakdowns.
- **CI Hooks:**
  - Fails build when specs change without companion doc metadata (configurable allowlist for refactors + per-service overrides).
  - Emits static JSON index + site-friendly markdown bundles for downstream docs sites; publishes schema-visualization artifacts when OpenAPI/GraphQL inputs change.
- **Testing:**
  - Synthetic repos for drift detection (missing docs flagged, matching docs pass).
  - Coverage gates ensure every public API has a spec+doc link.
  - Index performance tests against large doc/spec trees; snapshot tests for generated bundles.
- **Operations & Observability:**
  - Metrics: drift findings count by service, coverage %, index latency; alert when coverage drops or drift grows > threshold.
  - Backfills: nightly job revalidates link graph and refreshes diagrams to catch silent upstream changes.
- **Adoption:** Require new APIs to register spec path, owning team, runbook link, and diagram in `docs-hub/` metadata; add CI policy wiring per repo via reusable workflow template.

## 122. `partner-portal/` — Partner/Reseller Backend & Entitlements
- **Purpose:** Let partners manage their tenant-of-tenants safely with delegated admin.
- **Model:** Partner orgs own tenant lists; overlay entitlements map partner roles → allowed actions (create/suspend/configure tenant, enable feature packs, apply config profiles). Action catalog kept as data for consistent policy evaluation.
- **Integrations:** control-plane (cluster/env mapping), access-admin (delegated roles), tenant-benchmark, sla-guard, autoconfig (safe execution paths), audit trail sink.
- **APIs:**
  - `GET /partners/{id}/tenants` (rollup metrics and readiness/benchmark scores only; pagination + filter by feature-pack status).
  - `POST /partners/{id}/tenants` (create under partner umbrella) and `POST /tenants/{id}/actions/{action}` routed through autoconfig/governance; supports dry-run to preview gating outcome.
- **Safety & Audit:** All partner-driven changes logged; authorization checks ensure partners only touch owned tenants; governance hook prevents direct mutation when autoconfig/gates deny.
- **Testing:** Delegation/entitlement tests, safety routing tests (actions go through autoconfig/governance), audit log assertions, negative tests for cross-partner access attempts.
- **Operations & Limits:** Rate limits per partner org, circuit-breaker around downstream autoconfig/governance failures, and health endpoint exposing integration availability.
- **Adoption:** No direct access to per-tenant data shapes; exposed views are aggregates/rollups only. Provide onboarding playbook for partner metadata seeding and delegated-role issuance.

## 123. `incident-cmd/` — Incident Command & Ops War-Room Orchestrator
- **Purpose:** Backend of record for major incident coordination.
- **Incident Schema:** Type (security/reliability/safety/governance), severity, status (declared → triage → mitigated → resolved → postmortem-ready), commander, comms channels, roles (commander/scribe/comms/responders), linked integrations, linked tickets, and evidence attachments.
- **Integrations:** reliability-service, meta-monitor, safety-console, forensics, gameday; webhook notifications via integration-hub; optional Slack/Teams routing through integration-hub connector.
- **APIs:**
  - `POST /incidents` (from signals or humans), `PATCH /incidents/{id}/status`, `POST /incidents/{id}/timeline` (ingest forensics/storyboard events), `POST /incidents/{id}/actions` (track follow-ups + program-graph linkages), `GET /incidents/{id}/export` (postmortem-ready bundle).
- **Testing:** State-machine lifecycle tests, synthetic trigger integrations, postmortem attachment checks, regression tests for notification/webhook fan-out.
- **Operations & Resilience:** SLA-aware escalations (timeouts escalate severity), idempotent incident declaration for repeated signals, and cold-start ready runbooks for datastore outages.
- **Adoption:** Minimal notification hooks; task tracking remains external (linked tickets only). Provide incident runbook template and checklist for integrating new signal sources.

## 124. `vuln-center/` — Vulnerability Intake, Triage & Remediation Tracker
- **Purpose:** Clearinghouse for security findings from scanners, red teams, bug bounties, and audits through verification.
- **Finding Schema:** Component/service, severity, CVSS-like score, exploitability, affected environments, dedup/grouping keys, status (open → triaged → fixed → verified), code links (repo/commit) and service mapping, evidence references (scanner payload hashes, PoC links).
- **APIs:**
  - `POST /findings` for normalized ingestion; `GET /findings?service=X|severity=Y|age>n` for queries; `POST /findings/{id}/status` for remediation/verification updates; `GET /reports/program-graph|safety-console|control-plane` for exports; `POST /findings/{id}/artifacts` to attach proofs.
- **Policy:** Critical issues automatically surface to safety-console gates; schemas versioned and additive; dedup rules tunable per source to avoid suppression of unrelated root causes.
- **Testing:** Dedup on overlapping findings, lifecycle flows, policy gate surfacing for critical items, export shape validation for downstream consumers.
- **Operations & SLAs:** Breach timers for critical/high severities with alerting; backlog aging dashboards; audit log of dedup decisions for forensics.
- **Adoption:** Integrates with JIRA/ServiceNow via integration-hub (no ticketing replacement). Provide onboarding mapping for each scanner → normalized schema + severity mapping table.

## 125. `consent-hub/` — Consent & Preference Management
- **Purpose:** Authoritative store for data subject consents and preferences, including purposes, channels, retention, opt-outs, and jurisdiction context via reg-knowledge.
- **APIs:**
  - `GET /consent?subject=X&purpose=Y&at=T` answers whether processing is allowed at a specific time; supports batched queries for bulk routing.
  - `POST /consent-events` records consent/withdrawal with provenance; events versioned and immutable; optional `source_system` for audit.
- **Integrations:** governance PDP (policy attribute), lifecycle (opt-out-driven retention), rtx-export/legal-hold/compliance hooks.
- **Testing:** Time-based validity tests, PDP integration scenarios, privacy/tenant-scoping for consent data, regression tests around daylight savings/UTC boundaries.
- **Operations & Privacy:** Encryption at rest + scoped access tokens per tenant; retention of consent events follows legal guidance; replay job to rebuild consent state for audits.
- **Adoption:** Services must call `consent-hub/` before regulated processing paths; schemas are data-driven and versioned. Publish purpose catalog and mapping guide for product teams.

## 126. `airgap-export/` — Physical Media & Air-Gapped Regulator Export
- **Purpose:** Package regulator-grade offline bundles with redaction, attestation, and integrity guarantees.
- **Workflow:**
  - Accept export requests for cases, explanation bundles (rtx-export), compliance reports, DPIAs, audit logs.
  - Apply redaction via redaction-view/privacy-engine; sign via attestation; package with directory standards, manifests, hashes, and integrity checks; emit printable manifests for chain-of-custody.
- **APIs:**
  - `POST /exports` (profile + payload references), `GET /exports/{id}` for status, `GET /exports/{id}/artifact` for encrypted signed payload + manifest bundle; `POST /exports/{id}/verify` to validate integrity before handoff.
- **Testing:** Packaging fixtures for stable archives/manifests, tamper detection integrity tests, authorization/audit checks for export requests, manifest schema validation.
- **Operations & Security:** Dual-control approval option for sensitive export profiles; HSM-backed signing when available; export profile registry codifies redaction + retention expectations.
- **Adoption:** No hardware writing; output is ready for offline media transfer only. Include printable manifest template and custody handoff checklist.

## 127. `playbook-miner/` — Case-to-Playbook Mining
- **Purpose:** Mine historical cases and traces into candidate automation playbooks and investigation patterns.
- **Inputs & Outputs:** Consumes storyboards, forensics traces, case histories, automation/playbook runs; emits draft playbooks for `automation/` and investigation patterns for `invest-patterns/` with rationales and success metrics.
- **Processing:** Sequence mining + clustering to identify frequent triage/evidence/report flows; de-duplicate near-identical sequences; enforce governance-safe steps; optional human feedback loop to score usefulness of drafts.
- **APIs:**
  - `POST /mining-jobs` (scope + data sources), `GET /mining-jobs/{id}` for status/results, `POST /drafts/{id}/publish` to handoff drafts to human review queues, `POST /drafts/{id}/feedback` to adjust clustering weights.
- **Testing:** Synthetic logs with known patterns, quality deduping, safety filters against one-off hacks, regression tests ensuring personal/sensitive data is excluded from mined templates.
- **Operations & Quality:** Metrics on draft acceptance rate and time-saved estimates; guardrails preventing overfit to single-incident outliers; scheduled retraining cadence.
- **Adoption:** Outputs are drafts only; no auto-deploy of playbooks without human curation. Document review rubric and import pathway into automation/invest-patterns repos.

## 128. `analyst-graph/` — Analyst Identity Graph & Skills Intelligence
- **Purpose:** Internal graph of analysts, teams, skills, training completion, workflows, and collaboration to power academy personalization and triage routing.
- **Data & Signals:** Ingest product analytics (feature usage), academy scores, xai-feedback, user-feedback; compute skill profiles and collaboration edges (co-working, mentorship). Profiles include freshness and confidence scores to avoid stale routing.
- **Integrations:** academy (personalized training), triage (expert routing), personalization (defaults tuned to skill profile); analytics are internal-only and non-punitive.
- **APIs:**
  - `GET /analysts/{id}` (profile + skill scores + collaboration highlights), `POST /ingest` for new signals, `GET /recommendations` for training/triage pairing, `GET /teams/{id}/map` to visualize collaboration clusters.
- **Testing:** Profile correctness on synthetic behavior patterns, privacy/visibility constraints, stability tests to avoid noisy swings, fairness checks to prevent skew against low-activity users.
- **Operations & Privacy:** Access scoped to internal roles; anonymized aggregates for leadership reporting; smoothing functions to prevent whiplash from bursty behavior.
- **Adoption:** Graph stored separately; references only use analyst IDs—no changes to access-admin core models. Provide data dictionary and access request process.

## Implementation Notes & Parallelization
- All modules are additive, avoiding changes to existing service schemas.
- Each service owns its store and contracts; integrations are read-only unless explicitly routed via governance/autoconfig/attestation.
- CI expectations: unit+integration tests per module as listed, plus static exports or indexes where noted; include coverage reports and schema snapshot validation where applicable.
- Documentation for each module should live alongside its code (e.g., `/docs-hub/README.md`, `/partner-portal/README.md`) and link back into `docs-hub/` indexes to stay synchronized.
- Delivery playbook: create repo scaffold, add OpenAPI/contracts, wire CI template, seed fixtures, then register service-level SLOs and alerts before exposing externally.
