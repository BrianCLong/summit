# Wave 17 Codex Campaign Plan (Prompts 129–136)

This plan sequences eight independent but merge-safe backends into a coherent delivery wave. Each mission has crisp ownership, integration contracts, validation gates, and rollout guidance so teams can land work in parallel without blocking shared services.

## Operating Principles

- **APIs and data contracts first:** Define schemas, key naming, and versioning before wiring clients.
- **Additive, backward compatible changes:** New services produce data and APIs without mutating upstream schemas.
- **Tenant/user awareness:** Every service accepts tenant + user context; defaults are explicit.
- **Observability and auditability:** Ship structured logs, traces, and audit trails for all state transitions.
- **Test gates per mission:** Synthetic fixtures and stability tests catch regressions before integration.

## Mission Breakdown

### 129. `i18n/` Localization Core & Language Profiles

- **Deliverables:** String catalog format (YAML/JSON), language profile resolver (tenant → user → env), bundle fetch API, key registration CLI/CI, MT draft hook flagged for human review.
- **Architecture:**
  - `i18n/catalog/` versioned bundles keyed by locale; fallback chain en→regional→custom.
  - `i18n/service/` exposes REST/GraphQL: `GET /bundles/{locale}?v=`, `POST /keys/register`, `GET /profiles/{tenant}/{user}`.
  - Integrations: UI consumes by key; copilot/report/timeline pass `Accept-Language` + `targetLocale` hints.
- **Testing gates:**
  - Fallback behavior (missing keys resolve to English + loud log/metric).
  - Lint rule to detect hard-coded strings in tri-pane/case/explorer.
  - Format checks for date/number/currency per locale using fixtures.
- **Rollout:** Wire case workspace as pilot; require `needs_review` flag on MT strings before promotion.

### 130. `data-value/` ROI & Utility Scoring

- **Deliverables:** Metric adapters for catalog, analytics, ML evals, carbon/lifecycle; scoring config; ranking API.
- **Architecture:**
  - `data-value/ingest/` pulls signals; caches per dataset snapshot.
  - `data-value/score/` applies weighted metrics → value class (`core`, `standard`, `legacy`, `archive-candidate`).
  - API: `GET /datasets/{id}/score`, `GET /reports/value-ranking?timewindow=`.
- **Testing gates:** Synthetic catalog with controlled usage to validate monotonic scoring; stability test (small usage delta ≠ class flip); lifecycle integration to surface retention reduction candidates only.
- **Rollout:** Start read-only; export reports to governance/lifecycle dashboards.

### 131. `extension-store/` Plugin Registry & Review

- **Deliverables:** Manifest schema (capabilities, perms, data access, endpoints, authors), review workflow states, approval/audit log, revoke/quarantine flags.
- **Architecture:**
  - `extension-store/registry/` for manifests + versions.
  - `extension-store/review/` enforces security/governance hooks; integrates with vuln-center & safety-console kill switches.
  - APIs: `POST /extensions` (register/update), `GET /extensions?tenant=`, `POST /extensions/{id}/revoke`.
- **Testing gates:** Schema validation (reject over-privileged), lifecycle of install→update→revoke with audit, propagation of revoke IDs to runtime and safety-console.
- **Rollout:** Treat runtime as client; no sandbox changes; start with internal extensions.

### 132. `hunt-workbench/` Saved Hunts & Recipes

- **Deliverables:** Hunt schema (queries, targets, expected signals), execution engine wrapper, storage for runs/results/pivots, template clone/export hooks.
- **Architecture:**
  - `hunt-workbench/model/` (JSON schema + minimal DSL for query sets).
  - `hunt-workbench/engine/` orchestrates graph/search/CEP calls; stores results + pivot chains.
  - APIs: `POST /hunts` (create/run), `PUT /hunts/{id}`, `POST /hunts/{id}/clone`, `POST /hunts/{id}/export` (cases/reports/academy).
- **Testing gates:** Synthetic hunts over demo data with expected matches; idempotency on static data; performance on long windows.
- **Rollout:** Pilot with shared case notes export; all integrations read-only to upstream systems.

### 133. `presence-collab/` Presence & Co-Editing

- **Deliverables:** Presence tracking, soft/hard locks, conflict detection, optional OT/CRDT channel for specific docs, WS endpoints.
- **Architecture:**
  - `presence-collab/state/` for presence and lock maps keyed by object/tenant.
  - `presence-collab/ws/` channels: subscribe, announce edit intent, broadcast ops.
  - Integrations: collab comments, case/report backends; metadata only (source-of-truth elsewhere).
- **Testing gates:** Concurrency simulations for N users; lock escalation/deadlock safety; fan-out perf tests.
- **Rollout:** Enable on shared case notes first; feature flag per tenant/object type.

### 134. `rca-engine/` Causal Graphs for Incidents

- **Deliverables:** Causal graph model (nodes: services, metrics, config/deploy changes), ingestion from forensics/incidents/metrics, hypothesis generator, annotation API.
- **Architecture:**
  - `rca-engine/ingest/` adapters for incident-cmd, traces, metrics, change logs.
  - `rca-engine/graph/` builds causal DAG, ranks hypotheses, tracks evidence.
  - APIs: `POST /rca/{incidentId}` (generate), `POST /rca/{id}/annotations`, `GET /rca/{id}/export` (postmortem/program-graph).
- **Testing gates:** Synthetic incidents with known causes; sensitivity tests (noise tolerance); integration with incident-cmd references.
- **Rollout:** Advisory only; outputs stored separately, no incident lifecycle mutations.

### 135. `ethics-review/` High-Risk Change Review

- **Deliverables:** Review item model (context refs, roles), lifecycle (proposed→in-review→approved/denied with conditions), decision/audit log, intake from high-risk detectors.
- **Architecture:**
  - `ethics-review/intake/` consumes program-graph/safety-console events and manual submissions.
  - `ethics-review/workflow/` enforces required roles (legal/ethics/security/product) and mitigation tracking.
  - APIs: `POST /reviews` (submit), `POST /reviews/{id}/decision`, `GET /reviews?status=`.
- **Testing gates:** Lifecycle state machine tests; integration that high-risk events auto-create reviews; audit completeness (rationale + actor required).
- **Rollout:** Start with manual submissions; gate automation/playbooks that touch restricted scopes.

### 136. `lowcode-flow/` Citizen Workflow Backend

- **Deliverables:** Flow graph DSL (whitelisted ops, branching), validator/static analyzer, versioning (draft→test→active), sandbox test trigger.
- **Architecture:**
  - `lowcode-flow/model/` defines node/edge schema + allowed automation ops.
  - `lowcode-flow/validator/` enforces governance, tenant constraints, and forbidden patterns.
  - `lowcode-flow/runtime/` bridges to automation/ for test runs; configs stored versioned per tenant.
  - APIs: `POST /flows` (create/validate), `PUT /flows/{id}` (update), `GET /flows?tenant=`, `POST /flows/{id}/test`.
- **Testing gates:** Validation fixtures (good vs dangerous flows), sandbox execution with synthetic ops, isolation per tenant.
- **Rollout:** Feature flag by tenant; no arbitrary code paths; approvals required for promotion to active.

## Sequencing & Dependencies

1. **Foundation:** finalize schemas/contracts for `i18n/`, `extension-store/`, `lowcode-flow/` (unblocks UI and governance integration). Own lint rules in `i18n/` early.
2. **Analysis engines:** stand up `data-value/`, `rca-engine/`, `ethics-review/` in parallel—read-only integrations minimize coupling.
3. **Collaboration & hunting:** deliver `presence-collab/` and `hunt-workbench/` pilots once schemas are frozen; limit rollout via flags.
4. **Hard gates before GA:** per-service fixture tests + integration smoke; shared observability (logs/traces, audit) must be green; feature flags per tenant/object before expansion.

## How to Contribute to Wave 17 Missions

- Align on key/DSL schemas first; keep changes additive and versioned.
- Land CI/lint hooks with fixtures in the same PR as new services.
- Document API examples and promotion steps alongside code (`README.md` per service).
- Use feature flags and tenant scoping for all new capabilities; default to off.
