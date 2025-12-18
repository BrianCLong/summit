# Wave 14 Missions — Safety, Data, and Narrative Tooling

This wave defines eight independent, merge-safe service blueprints that harden safety posture, elevate data quality, and
improve analyst ergonomics. Each module ships with clear APIs, staged rollouts, and deterministic test expectations to keep
integration safe across stacks. Cross-cutting standards for every module:

- **Isolation & tagging:** All synthetic/safety traffic is isolated to governed tenants with headers like `X-SANDBOX-RUN`,
  `X-PERSONA-SIM`, and run IDs logged in analytics and prov-ledger.
- **Determinism:** Seeds, config versions, and scenario IDs are persisted so runs are replayable and regression-friendly.
- **Observability:** Emit OpenTelemetry traces, module-specific metrics, and structured logs with correlation IDs; default
  dashboards and alerts ship with each service.
- **Hardening:** No write paths into prod data planes; data-only configurability (personas, prompt suites, scoring weights)
  keeps engines stable while allowing rapid iteration.

## Reference Integration Map

- **North-south:** `api-gateway` handles ingress with safety headers; services call existing AI/NLP stacks via client SDKs.
- **East-west:** Read-only calls to case service, ER, time-engine, ontology, privacy-engine, governance, and product-analytics.
- **Artifacts:** Outputs land in staging buckets, regression packs (`llm-eval`), overlays (`case-linker`, `evidence-rank`), or
  reporting feeds (`safety-console`, `fairness-lab`, `meta-monitor`).

## 105. `persona-sim/` — Adversary Persona & Attack Simulation Engine
- **Purpose:** Generate deterministic, labeled adversarial and borderline interaction sequences (malicious, insider, non-
  compliant) against non-prod environments via public entry points only.
- **Schemas:**
  - **Persona:** `id`, intent class, tactics, risk flags, required entitlements, coverage tags, default intensity, allowed
    surfaces.
  - **Scenario:** ordered steps (copilot prompt, UI path, plugin install, governance toggle, export attempt) with guards,
    delays, and expected policy outcomes.
- **Execution:** Driver dispatches flows through api-gateway/field-client/integration-hub/extensions with mandatory sandbox
  tenant tags and synthetic credential sets. Traffic headers include `X-PERSONA-SIM` + run ID for routing/analytics segregation.
- **Outputs:** Labeled traces (persona, scenario, intensity, seed), timing, response codes, policy outcomes, and policy-engine
  verdicts; summaries land in `safety-console`, `llm-eval`, `meta-monitor`, and `fairness-lab` feeds.
- **APIs:**
  - `POST /persona-sim/runs` (persona + scenario + intensity + seed) → run ID + schedule.
  - `GET /persona-sim/runs/{id}/logs` → ordered labeled traces + verdicts + replay token.
  - `GET /persona-sim/personas` → registry with coverage matrix and abuse-surface tags.
- **Testing:** Determinism snapshots (seed/persona → identical script); coverage tests ensure copilot/search/export/plugin paths
  are hit; safety tests validate isolation headers/tenants, deny-listing of prod endpoints, and synthetic credential usage.
- **Operations:** Daily canary campaigns, automatic regression filing on policy escapes, and data-only persona/script releases
  to keep core engine stable.

## 106. `doc2graph/` — Unstructured Doc → Graph Mapper & Schema-Hint Engine
- **Purpose:** Convert PDFs/emails/text into staged graph deltas with provenance and schema hints—never writing directly to the
  canonical graph.
- **Pipeline:** Ingest via `assets/` URIs or uploads, run OCR as needed, call existing NLP services for entity/relation
  extraction, then build candidate node/edge sets with confidence and evidence spans.
- **Artifacts:**
  - **Delta packages:** Proposed nodes/edges with IDs, labels, properties, confidence, and source spans (document ID, page,
    byte/char offsets) plus evidence IDs for prov-ledger.
  - **Schema hints:** Suggestions such as “Field X resembles Person.Name” for ingest wizard/ER tuning.
- **APIs:**
  - `POST /doc2graph/jobs` (doc references or batch) → job ID.
  - `GET /doc2graph/jobs/{id}` → status + delta preview + provenance map.
  - `POST /doc2graph/jobs/{id}/apply` → staged approval/edits (HITL optional).
- **Testing:** Synthetic docs with known entities/relations for precision/recall gates; provenance completeness (every
  node/edge links to ≥1 evidence span); performance guardrails on large docs; schema-hint accuracy on controlled fixtures.
- **Operations:** Deltas land in staging buckets and expire unless approved; extraction configs versioned; PII screens via
  privacy-engine before leaving ingestion boundary.

## 107. `case-linker/` — Cross-Case Linker & Meta-Case Aggregation
- **Purpose:** Detect related/duplicate cases and manage meta-cases that roll multiple incidents into campaigns.
- **Signals:** Shared ER entities, overlapping timelines, location proximity, ontology tags, event motifs, and analyst
  interactions; configurable thresholds for “possible”, “likely”, and “duplicate”.
- **Meta-cases:** Lightweight containers referencing case IDs, relationship types, provenance notes, and lineage of merges/splits.
- **APIs:**
  - `GET /case-linker/cases/{id}/suggestions` → ranked link candidates with rationales and confidence bands.
  - `POST /case-linker/meta` → create meta-case; `POST /case-linker/meta/{id}/merge|split` → manage membership and
    preserve lineage.
  - `GET /case-linker/meta/{id}` → member list + history + evidence of linkage.
- **Testing:** Fixture cases with seeded overlaps to assert link detection; integrity tests ensure merge/split preserves
  provenance; load tests over large case graphs; false-positive guardrails using negative pairs.
- **Operations:** Read-only dependencies on case service/ER/time-engine/ontology; store link metadata locally to avoid schema
  changes; scheduled rescoring jobs on major ER/time updates.

## 108. `evidence-rank/` — Evidence Ranking & “Most Important First” Engine
- **Purpose:** Prioritize evidence for cases and specific hypotheses with transparent rationales.
- **Signals:** Provenance ledger (claim strength, contradictions), graph analytics (centrality/motifs), copilot citations,
  analyst interaction telemetry, recency, and policy risk flags.
- **Scoring:** Weighted, data-driven config producing ranked lists with rationale strings (e.g., “high centrality + supports
  main claim + recently added”). Supports context-specific weighting per view/audience.
- **APIs:**
  - `POST /evidence-rank/rank` (case/hypothesis/view) → ordered evidence IDs + rationales + scores.
  - `GET /evidence-rank/configs` → active weighting profiles and version history.
- **Testing:** Synthetic cases where “obvious” key evidence must top the list; down-rank contradicted/policy-risk items;
  performance tests on 500+ evidence items under latency budget; monotonicity tests ensure weights adjust rankings predictably.
- **Operations:** Outputs are overlays; no mutation of case/evidence records. Configs versioned for safe tuning; scheduled
  fairness checks for bias in ranking across entities/roles.

## 109. `dev-sandbox-data/` — Developer Data Sandbox & Safe Prod-Like Test Data
- **Purpose:** Provide masked/synthetic datasets with referential integrity and production-like distributions for dev/CI
  without exposing real PII.
- **Data Paths:** Governed exports → tokenization/scrambling → optional synthesis → validation. Snapshots per service (ingest,
  graph, cases, audit, analytics) tagged as sandbox-only.
- **APIs/Tooling:**
  - `sandbox create --template <name>` to materialize datasets.
  - `sandbox refresh` to regenerate snapshots.
  - `sandbox validate` to run privacy-engine/tokenization checks ensuring zero real identifiers and foreign-key consistency.
- **Testing:** Privacy analyzers to block raw PII; FK/graph consistency checks post-transform; CI smoke test to spin new env
  with sandbox data; statistical resemblance checks vs reference distributions.
- **Operations:** Never copy prod directly; all paths masked/synthesized. Hooks into env-sandbox/experiments to auto-load
  datasets; audit logs capture lineage of synthetic exports; TTL-based cleanup for stale sandboxes.

## 110. `user-feedback/` — Survey / NPS / Qualitative Feedback Aggregator
- **Purpose:** Capture explicit human feedback (NPS/CSAT/surveys/free-text) and align with tenant/role/feature usage for
  roadmap and risk signals.
- **Data Model:** Feedback artifacts with score/type, text, optional anonymity, tenant/role/feature linkage, timestamps, and
  processing metadata (sentiment/theme labels and classifier versions); consent flags stored per submission.
- **APIs:**
  - `POST /feedback` for submissions from in-product prompts or external forms.
  - `GET /feedback/aggregate` (by feature/tenant/role/time) with sentiment/theme rollups.
  - `POST /feedback/export` to emit summaries to docs/roadmap systems.
- **Processing:** Optional AI pipeline to cluster themes and classify sentiment; outputs kept within governed analytics paths;
  automatic PII scrubbing before storage; per-tenant data residency controls.
- **Testing:** Data integrity linking even when user-level anonymous; theme extraction on labeled synthetic corpora; privacy
  tests to prevent leakage into non-governed channels; replay-safe anonymization tests.

## 111. `copilot-redteam/` — Copilot Red-Team Orchestrator & Adversarial Suite
- **Purpose:** Systematically attack copilot/XAI endpoints with adversarial prompts, detect policy bypasses/leakage, and turn
  failures into regression tests.
- **Assets:** Versioned adversarial prompt suites (policy bypass, obfuscation, multilingual, prompt injection chains) stored as
  data definitions; each prompt tagged with attack class, language, and expected safe behavior.
- **Execution:** Campaign runner targets copilot query APIs and report-auto/XAI outputs via api-gateway with safety headers.
  Evaluators score responses for policy violations and leakage using governance/PII detectors; failures create incidents and
  regression test cases automatically.
- **Outputs:** Structured incident reports (prompt, model/prompt version, violation type, evidence) auto-synced to `llm-eval`
  regression packs and `safety-console` dashboards.
- **APIs:**
  - `POST /copilot-redteam/campaigns` (suite + model/prompt version) → run ID.
  - `GET /copilot-redteam/campaigns/{id}` → results + incidents + regression references.
- **Testing:** Harness tests that known-bad prompts are blocked; isolation tests verifying tagging/segregation from real
  analytics; integration tests confirming new incidents append to regression suites; cooldown enforcement to prevent hot
  loops against downstream models.

## 112. `timeline-narrator/` — Natural-Language Timeline Narrator
- **Purpose:** Turn structured event sequences into audience-tailored chronological narratives anchored to evidence and
  privacy constraints.
- **Inputs:** Events with timestamps, actors, locations, evidence IDs from time-engine/case/storyboard/sim-engine.
- **Generation:** Prompt assembly enforces no invented facts, includes citation mapping per sentence → evidence IDs, supports
  styles (technical detail, exec summary, regulator-ready) and length controls; redaction-aware view ensures sensitive
  elements remain suppressed.
- **APIs:**
  - `POST /timeline-narrator/generate` (case/meta, style, length) → narrated text + citation map + safety notes.
  - `GET /timeline-narrator/templates` → style presets and safety controls.
- **Testing:** Grounding tests to ensure all claims reference known events/evidence; style tests for tone/length variance;
  safety tests confirming redacted elements never surface; consistency tests that timestamps remain ordered.
- **Operations:** Treat upstream systems as read-only; store narratives as separate artifacts with provenance and redaction
  state; scheduled regenerations when source timelines change materially.

## How to Use Wave 14 Missions
- **Parallelization:** Each module is API-first, data-driven, and isolated from prod writes. Persona libraries, adversarial
  suites, and scoring configs evolve via data changes, keeping core engines stable.
- **Safety & Isolation:** All test traffic carries sandbox headers/tenants; no direct schema mutations in dependent systems.
  Privacy and governance checks are first-class in each pipeline.
- **Determinism & Coverage:** Seeds and config versions are persisted to replay scenarios and keep regression diffs small.
  Coverage tests focus on critical surfaces: copilot, search, export, plugin sandbox, ingest/graph deltas, and evidence
  ranking quality.
- **Operational Readiness:** Each service ships with runbooks (roll-forward/back), alert thresholds (latency, error rate,
  safety violations), and sample dashboards; secrets pulled from env only.
- **Adoption Path:** Start with synthetic fixtures and HITL approvals; graduate to CI/nightly jobs; then integrate with
  feature-specific dashboards (safety-console, llm-eval, ingest wizard, case workspace, report automation).
