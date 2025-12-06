# Wave 9: Parallel Capability Missions (65–72)

Eight self-contained service blueprints that can be owned by separate Codex teams and merged independently. Each section states the charter, scope, API/data contracts, testing expectations, and rollout notes.

## 65. Ontology & Taxonomy Engine (`ontology/`)
- **Purpose:** Shared semantic backbone for concepts, hierarchies, and controlled vocabularies used by ingest, search, XAI, compliance, and reporting.
- **Core models:**
  - `Concept` (id, name, description, synonyms, parents, deprecated, aliases, lineage version).
  - `Vocabulary` families: `RiskType`, `AssetType`, `IncidentType`, `Sector`, `Channel`, etc., stored as concepts plus family metadata.
  - `Mapping` records: source system/field/code → canonical concept ID; crosswalks between vocabularies with confidence + provenance.
- **APIs:**
  - `GET /ontology/concepts/:id` (with ancestors/descendants toggle), `GET /ontology/search?q=`.
  - `POST /ontology/resolve` to normalize arbitrary labels/codes → canonical IDs (returns confidence + chosen family).
  - `GET /ontology/vocabularies/:family/snapshot` for export/versioning; `GET /ontology/mappings/:source` for crosswalks.
- **Behaviors:**
  - IDs are immutable; deprecations handled via aliasing/redirects, not deletion.
  - Deterministic resolution: explicit mappings win over heuristics; versioned mapping tables to preserve backward compatibility.
- **Testing:**
  - Hierarchy graph tests (parent/child/sibling queries, cycle prevention).
  - Mapping determinism tests with fixtures for external codes/local customer labels.
  - Backward-compat tests ensuring deprecated IDs still resolve via aliases.
- **Rollout:** Additive schemas only; other services reference IDs/tags, never hard-code enums.

## 66. Report Template Library & Narrative Blocks (`report-templates/`)
- **Purpose:** Library of reusable report/brief templates and parameterized narrative blocks consumed by Case/Report Studio.
- **Core models:**
  - `Template` (id, version, title, sections/subsections, required/optional fields, exhibit types, allowed narrative blocks).
  - `NarrativeBlock` (id, version, markup/text with parameters, required data bindings, sample inputs/outputs).
  - `TemplateInstance` linking a case/report to a template version plus block usage audit.
- **APIs:**
  - `GET /templates` and `GET /templates/:id` for structure metadata.
  - `POST /templates/:id/instantiate` → populated scaffold with placeholders for a case/report.
  - `POST /templates/:id/validate` to check mandatory sections/fields/exhibits and narrative block bindings.
- **Behaviors:**
  - Templates are immutable once versioned; `v1` instances remain valid after `v2` ships.
  - Narrative block expansion supports parameter substitution and snapshotting of rendered text for audit.
- **Testing:**
  - Validation tests for missing/invalid sections and exhibits.
  - Versioning tests to ensure existing instances bound to earlier versions stay valid.
  - Snapshot tests for narrative block expansion on demo cases.
- **Rollout:** Treat case/report service as a client; only add optional template IDs on their records.

## 67. Alert & Case Triage Prioritization Engine (`triage/`)
- **Purpose:** Produce ranked, routed worklists from alert/case feeds using configurable rules and model scores without mutating source records.
- **Core models:**
  - `TriageInput` (severity, entity types, pattern hits, tenant risk, SLA tier, timestamps).
  - `PriorityScore` (base score, time decay, SLA escalation, fairness caps) and `Routing` (queue/team/owner hints).
  - `Override` records for audited manual adjustments.
- **APIs:**
  - `POST /triage/score` for batch/scalar scoring; `GET /triage/worklist?team=` for ranked queues.
  - `POST /triage/overrides` to adjust scores/routes with audit trail.
- **Behaviors:**
  - Config-driven rule sets; model scores pulled from model-serving when present.
  - Fairness guardrails to avoid starvation across tenants/categories; SLA-driven aging boosts.
- **Testing:**
  - Priority rule fixtures yielding expected rankings and queue assignments.
  - SLA time-decay escalation tests.
  - Fairness tests to validate guardrail enforcement on synthetic mixes.
- **Rollout:** Outputs emitted as overlays/worklists; no mutation of source alert/case records.

## 68. Multimodal Ingest Alignment (`multimodal-ingest/`)
- **Purpose:** Align speech/audio, video, image, and text-derived outputs into synchronized, searchable timelines/entities.
- **Core models:**
  - `AssetTrack` references (audio/video/image/PDF IDs) and derived tracks (transcripts, OCR blocks, detections).
  - `MultimodalEvent` with time span, source references, aligned text, entities, and confidence.
  - `AlignmentSession` metadata (inputs used, heuristics applied, gaps).
- **APIs:**
  - `POST /multimodal/align` with asset + derived track references → stream of aligned events.
  - `GET /multimodal/tracks?asset_id=&start=&end=` for synchronized tracks (audio text, keyframes, entities).
  - `GET /multimodal/query?asset_id=&entity=` to locate appearances of an entity/time ranges.
- **Behaviors:**
  - Works on references only (no direct blob storage coupling); tolerant of partial/missing segments.
  - Emits additive events suitable for search/timeline/graph indexing.
- **Testing:**
  - Synthetic alignment fixtures with known timestamps/entities.
  - Robustness tests for degraded transcripts or missing spans.
  - Performance tests for long recordings and large video assets.
- **Rollout:** Outputs attachable to cases and searchable timelines; no mutation of base evidence.

## 69. Policy Scenario Simulator (`policy-sim/`)
- **Purpose:** Governance "what-if" engine to replay historical activity against proposed policy bundles and report behavioral deltas.
- **Core models:**
  - `PolicyBundle` snapshot (authz/privacy/lifecycle/legal-hold inputs, immutable version + provenance).
  - `SimulationRun` (time window, tenants, action types, sampled historical events/logs) and `SimulationResult` (delta approvals/denials, per-tenant/role metrics, risk vs. usability diffs).
- **APIs:**
  - `POST /policy-sim/run` with bundle reference + scope filters.
  - `GET /policy-sim/runs/:id` for summary/detailed diffs vs. current policy behavior.
- **Behaviors:**
  - Read-only against external PDP/privacy/lifecycle endpoints; never mutates production policy state.
  - Deterministic replay with fixed seeds for comparable results.
- **Testing:**
  - Toy correctness cases (small policy tweaks yielding expected approval/denial deltas).
  - Scale tests on wide time windows and large log sets.
  - Safety checks ensuring simulation mode cannot write to live systems.
- **Rollout:** Inputs are immutable snapshots; integration limited to simulation endpoints.

## 70. Tokenization & Pseudonymization Service (`tokenization/`)
- **Purpose:** Controlled replacement of sensitive identifiers with reversible tokens under governed scopes.
- **Core models:**
  - `Token` (deterministic per scope, type, and key version), `Scope` (tenant/region/policy), and `Mapping` (token ↔ original with audit).
  - Key rotation metadata with backward-compatible resolution policies.
- **APIs:**
  - `POST /tokenize` (payload or field list, scope hints) and `POST /detokenize` gated by PDP/authority checks.
  - `POST /tokenization/rotate` to introduce new key versions with safe re-tokenization strategies.
- **Behaviors:**
  - Deterministic within scope; differing scopes yield different tokens.
  - De-tokenization requires governed authority checks and full audit trail.
- **Testing:**
  - Determinism tests (same input + scope → same token; different scope → different token).
  - Security tests for denied detokenization without authority.
  - Rotation tests ensuring joins are preserved or intentionally broken per policy.
- **Rollout:** Token formats are versioned and stable; other services call APIs without schema changes.

## 71. Training Academy Backend & Scenario Scoring (`academy/`)
- **Purpose:** Manage synthetic training scenarios, trainee sessions, and scoring/feedback for analysts and governance staff.
- **Core models:**
  - `Scenario` registry (title, objectives, required datasets/sim runs, scoring rubric).
  - `Session` (assigned user/role, start/end, actions performed, artifacts created).
  - `Scorecard` (accuracy, process adherence, efficiency metrics, feedback).
- **APIs:**
  - `POST /academy/scenarios/:id/assign` and `GET /academy/scenarios/:id` for state/requirements.
  - `POST /academy/sessions` to start/end sessions; `GET /academy/sessions/:id/score` for breakdowns.
- **Behaviors:**
  - Strict isolation to synthetic/demo tenants; no production data access.
  - Deterministic scoring based on rubric + captured actions.
- **Testing:**
  - Scenario determinism fixtures ensuring repeatable scoring opportunities.
  - Scoring correctness tests on synthetic action sequences.
  - Isolation tests confirming academy namespaces cannot reach production tenants.
- **Rollout:** Consumes demo-data/sim-engine as-is; no upstream schema changes required.

## 72. Customer Rules Engine (`tenant-rules/`)
- **Purpose:** Sandboxed, tenant-specific rule packs in a constrained DSL/config to apply custom business logic without forking the platform.
- **Core models:**
  - `RulePack` (tenant-scoped, versioned, validated DSL/config) and `RuleEvaluation` (inputs, actions emitted, audit).
  - Supported actions: tagging, triage hints, notifications, custom-field overlays; PDP decisions remain authoritative.
- **APIs:**
  - `POST /tenant-rules/:tenant/validate` and `POST /tenant-rules/:tenant/publish` to manage rule packs.
  - `POST /tenant-rules/:tenant/evaluate` (batch/stream hooks) returning actions/overlays; integration adapters for event-engine/triage/notify.
- **Behaviors:**
  - Declarative-only DSL (no arbitrary code); sandboxed evaluation with governed data views.
  - Strict tenant isolation; one tenant’s rules cannot affect another’s data.
- **Testing:**
  - DSL/config validation errors surfaced clearly for malformed packs.
  - Deterministic evaluation tests on synthetic events/cases.
  - Isolation tests proving tenant boundaries are enforced.
- **Rollout:** Additive overlays only; base schemas remain unchanged and default behavior persists when no rules configured.
