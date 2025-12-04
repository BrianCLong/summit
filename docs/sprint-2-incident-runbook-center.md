# Sprint 2: Incident & Runbook Center v1

## Goal and Theme
- **Theme:** Incident & Runbook Center v1 — investigate, act, and prove what happened within Switchboard.
- **Goal:** Ship an Incident & Runbook Center that lets operators see incidents, invoke runbooks (with approvals where needed), and emit full provenance for every action.

## Outcomes
1. Incident & Runbook Center v1 available in Switchboard (incidents list/detail, runbooks list/execution, approvals linkage).
2. At least one golden-path flow wired end-to-end (e.g., data pipeline degradation) from alert → incident → triage runbook → approvals → mitigation → closure → evidence bundle.
3. Operational readiness with SLOs, dashboards, provenance in Timeline, and operator/admin docs.

## Scope Overview
- **Incident UX:** list/detail views, lifecycle transitions (`new → acknowledged → mitigating → monitoring → resolved → closed`), policy/rationale enforcement, quick actions, mini graph reuse.
- **Runbook UX:** catalog, execution view with step highlighting, high-risk approval coupling, execution state as `runbook_execution` entities.
- **Backend:** incident CRUD and transitions, policy-aware access, runbook definition versioning (draft/published with evidence bundles), execution events into Timeline.
- **Policies & Observability:** OPA bundles for incidents/runbooks, metrics (incidents and runbooks), tracing alert→incident→runbook→approval→action, Grafana operational health dashboard, provenance schemas and receipts.
- **Packaging & Docs:** feature flags (`incident_center_enabled`, `runbook_center_enabled`), Helm/Terraform updates, operator/admin/SRE runbooks.

## Work Breakdown (Ticket-Ready)
### Epic A – Incident Center UX
- **A1 Incidents List**: Nav entry, columns (ID, title, severity, status, primary tenant, created_at, SLA deadline), filters (status, severity, tenant), search by ID/title, ABAC-scoped visibility.
- **A2 Incident Detail**: Display description, status, severity, impact radius, linked alerts/runbooks/approvals, timeline, inline impacted-entity graph, quick actions (assign owner, escalate severity, link runbook).
- **A3 Lifecycle Actions**: Enforce `new → acknowledged → mitigating → monitoring → resolved → closed` transitions, policy checks per transition, rationale required for severity changes or closing without mitigation, provenance events emitted and shown in Timeline.

### Epic B – Runbook Center & Execution Engine
- **B1 Runbook Catalog**: List name, tags, risk level, last updated, usage count; metadata via YAML/JSON spec with per-step risk tags (`low/medium/high`).
- **B2 Execution View**: Start from incident detail or catalog; show steps with current step highlighted, step description/expected outcome/inputs; high-risk steps deep-link to approvals; execution entity recorded and surfaced in Timeline.
- **B3 Approval-Coupled Steps**: For high-risk steps, require approval evidence before completion; roles/attributes gated execution; runbook definition edits subject to policy.

### Epic C – Backend Incident & Runbook Engine
- **C1 Incident API/Model**: CRUD + transitions, attributes (id, tenant(s), severity, status, tags, linked alerts/runbooks/approvals), policy-aware actions (`can_view_incident`, `can_update_incident`, `can_change_severity`).
- **C2 Runbook Definition & Versioning**: List/get versions; create/update with draft vs published; each published version generates evidence bundle (spec, author, approval if needed, hash).
- **C3 Execution & Timeline Integration**: Store current step, outcomes, operator, timestamps; emit events (`runbook_started`, `step_completed`, `step_failed`, `runbook_aborted`, `runbook_completed`) referencing incident_id/approval_ids; render in Timeline.

### Epic D – Policies, Observability & Provenance
- **D1 OPA Policy Bundle**: Rules for creating/assigning/escalating/closing incidents; creating/publishing runbooks; executing steps by risk/tenant/environment; ≥90% policy test coverage; simulation endpoint for enforcement checks.
- **D2 Metrics, Traces & Dashboards**: Metrics (incidents_open_total, incidents_by_severity, mttr_seconds, mtta_seconds, runbook_executions_total, step_failure_rate, high_risk_step_approval_rate); tracing spans across alert→incident→runbook→approvals→actions; Grafana “Operational Health” dashboard with per-tenant cards.
- **D3 Provenance Schemas**: Evidence for incident lifecycle events, runbook definitions, and runbook executions; receipts linking incident ↔ runbook_execution ↔ approvals ↔ actions with hash chaining.

### Epic E – Packaging, Docs, and Runbooks
- **E1 Packaging/Flags**: Helm/Terraform updates for incident/runbook services; feature flags (`incident_center_enabled`, `runbook_center_enabled`); SBOM and image signing updates.
- **E2 Docs/Runbooks**: Operator guides (“handle incident X”, “run/complete a runbook”); admin guides (“define/publish runbooks safely”, “configure severity/SLA/high-risk steps”); SRE runbooks for incident/runbook service degradation and stuck executions.

## Golden-Path Scenario (Data Pipeline Degradation)
1. **Alert ingestion** creates `incident:new` (tenant scoped) with severity and impact radius recorded.
2. **Triage runbook** launched from incident detail; execution recorded as `runbook_started` in Timeline.
3. **High-risk mitigation step** triggers approval request (operation_type, target_entities, incident_id pre-filled); completion blocked until approval evidence is attached.
4. **Mitigation actions** progress runbook steps; failures emit `step_failed`; successes emit `step_completed` and advance highlighted step.
5. **Incident status** transitions to `mitigating` during action, then `monitoring`, and finally `resolved/closed` with rationale captured.
6. **Evidence bundle** generated on closure: incident lifecycle events, runbook definition version, execution log, approvals, and hashes for receipts.

## Acceptance Criteria & Readiness
- ABAC-enforced views; policy enforcement logged and test-covered.
- All status changes and runbook step events appear in Timeline with operator/timestamps.
- Grafana dashboard surfaces incident counts, MTTA/MTTR, runbook success rate, high-risk approval rate per tenant.
- Feature flags gate visibility; disabling removes nav entries and routes but preserves data.
- Operator/admin/SRE docs published; golden-path runbook demoable end-to-end.

## Risks & Mitigations
- **Policy gaps:** Mitigate with simulation endpoint and ≥90% rule test coverage.
- **Approval latency:** Cache recent approvals per incident/runbook execution to reduce re-requests; add alerting on stalled high-risk steps.
- **Provenance integrity:** Hash-chained receipts and evidence bundles; verify on ingestion and before presentation.

## Forward-Looking Enhancement
- Add **adaptive routing** for runbook steps based on live metrics (e.g., auto-select alternate mitigation paths when latency SLO breaches), using policy-evaluated guards and provenance for every branch.
