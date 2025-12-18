# Wave 10 Execution Plan — Prompts 73–80

This plan sequences the new capabilities into discrete workstreams with hard interfaces so they can progress in parallel without cross-team contention. Each module is API-first and scoped to avoid touching underlying engines directly.

## 73. Investigation Pattern Library (`invest-patterns/`)
- **Objective:** Provide declarative investigation recipes with stable schemas and versioned executions that sit on top of existing graph/time/analytics APIs.
- **Key Artifacts:**
  - Pattern DSL/schema covering inputs, underlying queries/analytics, expected outputs, and version metadata.
  - 5–10 starter patterns (ego-net/paths, social cluster, pressure points, anomaly trails, common counterparties).
  - Execution service with list/inspect/execute endpoints.
  - **Work package:** author DSL + JSON Schema + validation library → build pattern registry + storage → wire executor to existing graph/time/analytics APIs → add golden fixtures + perf harness.
- **APIs:** `GET /patterns`, `GET /patterns/{id}/versions/{v}`, `POST /patterns/{id}/execute` (async job + result retrieval), `GET /patterns/{id}/schema`.
- **Testing:** Golden synthetic graphs for outputs, version-stability regression tests, performance envelopes for complex paths.
- **Integration:** Calls graph analytics/time/projection/copilot only via published APIs; no engine changes. Outputs are structured slices/metrics, not prose.
- **Guardrails:** Patterns are data-driven; engine immutability enforced. Versioned definitions are immutable once published. **Hard gate:** cannot merge new pattern unless golden fixtures + perf threshold recorded and schema migration reviewed.

## 74. Multi-Party Clean Room (`cleanroom/`)
- **Objective:** Federated analytics across tenants with privacy-preserving outputs (aggregates/tokens) and strict session governance.
- **Key Artifacts:**
  - Session model (participants, scopes, legal basis, allowed operations, policies).
  - Operation catalog (overlap counts, co-occurrence, motif checks) with DP/threshold controls.
  - Tokenization/hashed-key adapters from `tokenization/`.
  - **Work package:** define allowed op catalog + policy DSL → session lifecycle service + approvals → distributed execution coordinator + per-tenant adapters → DP/threshold enforcement layer → audit log and export pipeline.
- **APIs:** `POST /sessions` (propose), `POST /sessions/{id}/approve`, `POST /sessions/{id}/queries`, `GET /sessions/{id}/results`, `GET /sessions/{id}/audit`.
- **Testing:** Privacy leakage tests on synthetic cross-tenant data, federated correctness vs centralized truth, policy allow/deny governance tests.
- **Integration:** Uses governed service APIs only; outputs stored in cleanroom space, not tenant data stores.
- **Guardrails:** Whitelisted operations only; DP/threshold gates mandatory; per-tenant approvals. **Hard gate:** any op returning <k threshold is suppressed; queries without explicit session approvals are rejected.

## 75. Graph Federation (`graph-federation/`)
- **Objective:** Execute logical queries across core and external graphs with stitched results and provenance, without ETL-ing external data.
- **Key Artifacts:**
  - Federated source registry (endpoints, schemas, capabilities, trust/timeouts).
  - Query planner that decomposes logical queries, routes subplans, harmonizes IDs via ontology, and stitches results with provenance tags.
  - Modes: on-the-fly federated execution and pre-materialized projection hooks.
  - **Work package:** source registry + health/latency probes → mapping service using ontology for ID/schema harmonization → planner decomposition strategies + stitching executor → provenance annotator + partial-failure policy matrix → perf/timeout tunables per source.
- **APIs:** `POST /sources`, `GET /sources/{id}`, `POST /federated-query` (with source selection/timeouts), `GET /queries/{id}/status|result`.
- **Testing:** Planner decomposition/stitching on synthetic cases, timeout/partial-failure handling, governance scoping/security tests.
- **Integration:** Consumer of core graph APIs; no schema changes. ID/schema mapping via ontology/domain-model services.
- **Guardrails:** Provenance preserved per source; graceful degradation on partial failures. **Hard gate:** no federated source moves to prod without latency/error budget SLOs + provenance correctness tests.

## 76. Regulatory Knowledge (`reg-knowledge/`)
- **Objective:** Centralized, versioned store of regimes, jurisdictions, and obligations for governance/compliance lookups.
- **Key Artifacts:**
  - Models for regimes/rulesets (scope, obligations, data categories, subject rights, retention), jurisdictions, applicability mappings.
  - Version history with effective dates and audit log.
  - Lookup service for regime/obligation queries.
  - **Work package:** regime/jurisdiction schema + migration scripts → author minimal viable regimes (GDPR/CCPA/etc.) with effective dates → lookup API with caching → audit/version diff viewer → governance contract tests.
- **APIs:** `GET /regimes`, `GET /regimes/{id}/versions/{v}`, `POST /regimes` (additive), `GET /lookup?tenant=...&dataCategories=...&subjectLocation=...`.
- **Testing:** Rule lookup fixtures for tenant/data/jurisdiction combos, version comparisons, integrity/audit coverage.
- **Integration:** Facts-only service; enforcement handled by governance/privacy engines.
- **Guardrails:** Additive changes with deprecation tags; no deletions; immutable versions. **Hard gate:** no write path without audit trail + effective date validation; lookup responses must enumerate sources/versions for downstream auditability.

## 77. Auto-Report Drafting (`report-auto/`)
- **Objective:** Generate draft report sections grounded in evidence, with template-specific styles and provenance.
- **Key Artifacts:**
  - Prompt assembly layer integrating case data, `prov-ledger`, report templates, and copilot/LLM.
  - Draft storage with provenance (model/prompt, evidence IDs).
  - Guardrails enforcing evidence grounding and style constraints.
  - **Work package:** prompt builder with template constraints → grounding validator against `prov-ledger` → LLM call adapter with retry/budget limits → draft store + provenance metadata → redaction/safety filter before persistence.
- **APIs:** `POST /drafts` (template+section+constraints), `POST /drafts/{id}/regenerate`, `GET /drafts/{id}`, `GET /drafts/{id}/provenance`.
- **Testing:** Grounding tests ensuring only existing evidence IDs are cited, style/length conformance checks, safety/governance redaction tests.
- **Integration:** Consumes copilot/templates/case data; outputs drafts only (never auto-publish); human edits stored separately.
- **Guardrails:** Reject hallucinated IDs; enforce template tone/length; respect governance filters. **Hard gate:** drafts failing grounding or safety checks are discarded; provenance must include model version + prompt hash.

## 78. Personalization (`personalization/`)
- **Objective:** Store per-user preferences and lightweight signals to tune UI defaults and copilot hints within policy bounds.
- **Key Artifacts:**
  - User profile schema (UI layouts/themes/filters, copilot style knobs, saved searches/views).
  - Signal extraction for recency/frequency (patterns, entities, cases, queries).
  - Suggestion engine producing next-action hints.
  - **Work package:** profile schema + RBAC/tenancy enforcement → signal ingestion pipeline (event adapter + recency/frequency store) → suggestion service with explainability traces → pilot integration hooks (tri-pane defaults + copilot style hints).
- **APIs:** `GET/PUT /users/{id}/preferences`, `GET /users/{id}/suggestions?context=...`, `POST /users/{id}/signals` (ingest usage events).
- **Testing:** Preference CRUD with tenant/role scoping, suggestion shifts based on usage, privacy isolation between users/teams.
- **Integration:** Optional overlays for tri-pane defaults, copilot answer style, search ranking tweaks; no new permissions granted.
- **Guardrails:** Cross-tenant isolation; opt-out/default-safe behavior; explainable suggestion traces. **Hard gate:** no personalization surface can bypass access controls or leak cross-tenant signals; suggestions must be suppressible per user/tenant policy.

## 79. A/B Testing Framework (`ab-testing/`)
- **Objective:** Governed experimentation for product features with deterministic bucketing and basic stats.
- **Key Artifacts:**
  - Experiment model (population filters, variants, rollout fractions, start/stop, guardrails).
  - Bucketing/assignment service integrated with feature flags; exposure logging hooks to product analytics.
  - Stats engine for lifts, confidence intervals, guardrail metrics.
  - **Work package:** experiment CRUD with audit + RBAC → deterministic bucketing library (salted hashing + namespace) → feature-flag adapter + exposure logging → stats snapshot generator + guardrail checks → export/report endpoints.
- **APIs:** `POST/PUT /experiments`, `POST /experiments/{id}/stop`, `GET /assignments?user=...`, `GET /experiments/{id}/results`.
- **Testing:** Deterministic bucketing and traffic splits, toy-metric stats validation, feature-flag/analytics interaction tests.
- **Integration:** Variants only toggle feature-flag paths; no permanent behavior change. Audited/permissioned administration.
- **Guardrails:** Consistent hashing with salt/namespace, rollout/kill-switch controls, guardrail metric thresholds. **Hard gate:** experiments auto-stop on guardrail breach; variant assignment must be reproducible given user + experiment id.

## 80. Storyboard Engine (`storyboard/`)
- **Objective:** Capture missions end-to-end from event streams and export structured storyboards for replay/training.
- **Key Artifacts:**
  - Event listener/ingestor subscribing to cross-service streams.
  - Mission grouper (case/incident/training centric) with tagging (success/failure/detours).
  - Storyboard assembler + exporter (ordered steps with view links and references).
  - **Work package:** event tap + schema normalizer → mission grouping heuristics + explicit start/stop control plane → storyboard builder with references to tri-pane/report/compliance views → export formats (JSON + signed bundle) → retention/redaction policy enforcement.
- **APIs:** `POST /missions` (start/stop explicit), `GET /missions/{id}/storyboard`, `POST /missions/auto-detect` (enable inference), `GET /missions/{id}/export`.
- **Testing:** Mission grouping on synthetic event sequences, export completeness/order validation, privacy/tenancy redaction tests.
- **Integration:** Read-only consumption of event/log streams; outputs referenced by IDs for academy/demo consumers.
- **Guardrails:** Respect redaction/tenancy; provenance for all steps; no mutation of upstream events. **Hard gate:** exporting or replaying a mission requires redaction policy evaluation + provenance completeness score.

## Sequencing and Parallelization
- **Foundational (Week 1–2):** Define schemas/DSLs for `invest-patterns/`, `cleanroom/` session/operation catalog, `graph-federation/` source registry, `reg-knowledge/` regime model. Stand up stub APIs with contract tests. Deliver “hello world” fixture tests for each to lock schemas before executor work begins.
- **Middle (Week 3–5):** Implement execution engines + adapters (`invest-patterns` runner, cleanroom federation ops, federation planner, reg-knowledge lookups); wire baseline tests. Begin `personalization/` signals and `ab-testing/` bucketing. Add load/latency benchmarks for federation and pattern execution to set SLOs.
- **Late (Week 6–7):** Integrate `report-auto/` grounding/guardrails, finalize `personalization` suggestions, connect `ab-testing` to feature flags/analytics, and ship `storyboard/` recorder/exporter. Run performance/privacy/failure drills before rollout; document rollback and kill-switch levers.
- **Stability Gates:** Immutable versioning for patterns/regimes; whitelisted ops for cleanroom; provenance for federated/LLM/storyboard outputs; deterministic bucketing with guardrails; redaction/privacy enforcement proven with fixtures before any external data touch.

## Definition of Done (per module)
- API contracts documented and versioned.
- Golden/fixture tests green (including privacy/governance where applicable).
- Integration harnesses for dependent services (mocked where needed).
- Audit/provenance logging implemented.
- “How to define/use” guide published for new pattern/regime/report draft/etc.
- Runbook for rollback/kill-switch + observability dashboard links captured.
