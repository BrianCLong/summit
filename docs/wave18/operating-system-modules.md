# Wave 18 Operating System Modules (137–144)

This document defines the architecture, interfaces, and validation plan for the eight Wave 18 services that extend the sovereign AI operating system. Each module is independent, merge-safe, and designed to interoperate through existing ledgers, feature stores, event streams, and program-graph metadata without upstream schema changes.

## 137. claim-resolver/ — Knowledge Conflict Resolver & Claim Arbitration

**Mission:** Detect and bundle conflicting claims, maintain arbitration history, and expose APIs for conflict-aware downstream tooling.

**Core conflict types**
- Logical: mutually exclusive predicates (e.g., `owns` vs `does_not_own`).
- Temporal: time-engine detects ordering violations or validity overlaps.
- Source-level: divergent statements from different provenance sources for same subject/object.
- Model-level: model/version disagreement on the same example or transformation.

**Bundle schema**
- `conflict_id`, `entity/relationship keys`, `conflict_type`.
- `claims[]`: statement, polarity, confidence, timestamp validity, provenance (prov-ledger ref, model/version, doc2graph source node, invest-pattern id), supporting evidence handles, transformation lineage.
- `status`: open | under_review | resolved | superseded.
- `resolution`: decision, rationale, chosen sources/models, reviewer, timestamp, immutable append-only log.
- `actions`: recommended follow-ups (HITL escalation, re-run model, mark unresolved, prefer source X).

**Data flow and persistence**
- Ingest readers subscribe to prov-ledger change feed and doc2graph/graph-xai/model outputs; inserts into an append-only `claim_events` table keyed by claim hash and provenance.
- Conflict builders run on a schedule or trigger, emitting `conflict_bundles` and `conflict_events` (status transitions) with immutable history retained for audits.
- Resolution attachments are stored as signed append-only records; closing a conflict never deletes prior states.

**APIs**
- `GET /conflicts?case_id|entity_id|subject`: list bundles with filters for type, status, freshness.
- `GET /conflicts/{id}`: retrieve bundle with full claim membership, evidence pointers, and current status.
- `POST /conflicts/resolution`: attach resolution with reviewer identity, rationale, and chosen claim set; closes or annotates bundle.
- `POST /conflicts/refresh`: re-evaluate bundles after new ledger entries or time-engine updates.
- `GET /conflicts/{id}/export`: audit-grade export of conflict history and resolutions.

**Detectors**
- Ledger scan for opposing predicates on same key; polarity matrix encodes incompatibility.
- Time-engine hooks catch invalid validity ranges or causality breaks.
- Model comparison detects divergent outputs across versions for identical input hash.
- Source-diff identifies contradictory doc2graph/invest-pattern/graph-xai outputs for same anchor.

**Testing**
- Synthetic conflict fixtures: opposing claims grouped into one bundle with preserved provenance.
- Temporal inconsistency cases flagged via time-engine mock.
- Resolution lifecycle: immutable append-only log; status transitions validated.
- Export tests: exported bundles round-trip with all provenance and decision metadata intact.

**Integration**
- Read-only ingest from prov-ledger, doc2graph, invest-patterns, graph-xai, report-auto; writes only bundles/resolutions locally.
- Exposes bundles to case workspace, explainability UIs, and copilot for arbitration assistance.

## 138. stream-views/ — Streaming Query Engine & Continuous Derived Views

**Mission:** Provide registered continuous views (sliding windows, sessionization, live aggregates) on existing event streams.

**View config/DSL**
- `view_id`, `source_topic`, `key_extractor`, `window` (sliding/hopping/tumbling + duration), `aggregates` (count/rate/sum/percentile), optional `session` params (gap, timeout), `cdc_backfill` toggle, `output_topic`, `materialization` store (rocksdb/state store).

**Operational guarantees**
- Exactly-once semantics for materialized state via checkpointed sinks; idempotent outputs to topics with deterministic keys.
- Schema registry validation during registration; rejects incompatible changes unless version bump with migration hints.
- Config-driven retention and compaction for state stores to prevent unbounded growth.

**APIs**
- `POST /views`: register/update view definitions with versioning and dry-run validation against schema registry.
- `GET /views/{id}`: fetch definition, lag, freshness, health, backpressure metrics.
- `GET /views/{id}/state?key=...`: query materialized value for an entity/key.
- `POST /views/{id}/refresh`: trigger replay/backfill alignment with CDC.
- `GET /views`: list views with owner, SLA, and window definitions to support cataloging.

**Engine behaviors**
- Builds on Kafka + Flink/Spark streaming operators; no producer changes.
- Backpressure-aware checkpoints; alignment with CDC snapshots for eventual consistency.
- Emits metrics on processing lag, dropped events, and state size.

**Testing**
- Synthetic streams asserting aggregates per window and session boundaries.
- Load/backpressure tests verifying lag reporting and stability under throttling.
- CDC consistency tests ensuring backfill + stream parity for registered views.
- Schema evolution tests ensuring view refresh rejects incompatible producer changes without explicit migration flags.

**Integration**
- Reference views: `alerts_per_entity_15m`, `sessionized_triage_activity`, `event_rate_per_capability` for CEP/anomaly/dashboards.
- Outputs exposed via read APIs or output topics for downstream consumers.

## 139. pattern-discovery/ — Unknown-Unknowns Pattern Explorer

**Mission:** Surface unsupervised pattern objects (clusters, motifs, outliers) from graph projections and feature slices without direct alerting.

**Discovery targets**
- Graph community detection on projections (entity, case, product usage graphs).
- Outlier/novelty detection on feature-store slices; drift-aware windows.
- Motif emergence in event sequences or behavioral signatures.

**Pattern object schema**
- `pattern_id`, `type` (cluster | motif | outlier), `scope` (entity type/feature slice/time range), `stats` (cohesion, silhouette, support), exemplar instances, feature importance, provenance of projection/model params.
- `promotions`: hooks to invest-pattern seeds, rule candidates, labeling tasks.
- `stability`: change score across adjacent windows to avoid churn.

**Execution model**
- Batch or mini-batch discovery jobs scheduled per target slice with configurable sampling and windowing; runs on existing ML infrastructure (Flink batch, Spark, or feature-store compute).
- Persistence in `pattern_store` with lineage (input snapshot ids, algorithm parameters) to make promotions reproducible.
- Guardrails to cap per-entity exposure; anonymization where policies require only aggregate exemplars.

**APIs**
- `POST /discover`: request discovery run over target projection/feature slice and window.
- `GET /patterns?scope=...`: list patterns with freshness, stability, and exemplar links.
- `POST /patterns/{id}/promote`: convert to new detection rule seed or labeling task.
- `GET /patterns/{id}`: retrieve pattern details, exemplars, and export handles for downstream modeling.

**Testing**
- Synthetic clusters/outliers recovered with expected metrics.
- Stability regression: small perturbations do not produce churn over threshold.
- Export tests: promoted patterns become valid seeds for invest-patterns/labeling.
- Privacy tests: exemplar exposure limited per policy; anonymized exports verified.

**Integration**
- Read-only over projections/feature-store/anomaly outputs; stores pattern artifacts locally.
- Feeds triage designers and labeling workflows rather than direct analyst alerts.

## 140. systemic-risk/ — Macro Risk Aggregator

**Mission:** Compute cross-tenant and capability-level risk indicators for internal governance.

**Inputs**
- `tenant-benchmark` scores, `sla-guard` breaches, `fairness-lab` and `safety-console` incidents, `product-analytics` maturity/usage, `vuln-center` findings, reputation scores.

**Risk model**
- Config-driven weights per signal family; smoothing to avoid whiplash.
- Indicators: combined tenant risk, capability risk ranking, model harm footprint, incident correlation analysis.
- Privacy guardrails: aggregated/hashed identifiers; no sensitive cross-tenant payloads.

**Computation and storage**
- Batch pipeline computes daily snapshots with exponential smoothing; intra-day deltas applied via streaming aggregations when available.
- Results persisted in `systemic_risk_snapshots` with versioned config ids to reproduce scores.
- Alert overlays emitted to program-graph when thresholds crossed with references to contributing signals.

**APIs**
- `GET /risk/tenants?top=N`: ranked list with contributing factors.
- `GET /risk/capabilities/{capability}`: risk breakdown and correlated incident types.
- `GET /risk/models/{model}`: harm footprint and trend.
- `GET /risk/snapshots/{date}`: export for leadership/risk committees.
- `POST /risk/recompute`: on-demand recompute using latest signals and config version (admin only).

**Testing**
- Synthetic tenants/incidents to validate rankings and smoothing.
- Sensitivity tests ensuring minor swings do not reorder rankings beyond tolerance.
- Privacy tests verifying aggregated outputs only.
- Config regression: changing weights yields predictable deterministic adjustments to outputs.

**Integration**
- Feeds program-graph gating and ethics-review inputs; read-only ingestion from metric sources.

## 141. lens-engine/ — Context Lens & View Transformation Engine

**Mission:** Provide reusable lenses that reshape existing data for specific audiences without creating bespoke endpoints.

**Lens config schema**
- `lens_id`, `audience` (exec | regulator | analyst | privacy | engineer), `purpose`, `input_types` (cases, reports, graph views), `transform_rules` (include/elide/aggregate/rename/group), `visual_hints` (emphasis fields), `version`, `redaction_policy` references.

**Execution pipeline**
- Resolver fetches base object and applies redaction-view for requester before lens rules; lenses can only hide/reshape fields.
- Transform engine supports deterministic ordering for aggregates/groupings to guarantee snapshot equality in tests.
- Lens catalog caches compiled transformation plans per version for low-latency rendering.

**APIs**
- `POST /lenses`: register/update lenses with version retention.
- `GET /lenses`: list available lenses with scope and permissions required.
- `POST /render`: supply object + lens_id -> deterministic view DTO respecting redaction-view.
- `GET /lenses/{id}/versions/{v}`: fetch specific version for reproducibility.
- `GET /lenses/{id}/diff?v1=...&v2=...`: returns rule differences to help consumers plan upgrades.

**Testing**
- Snapshot tests: identical inputs produce stable outputs per lens version.
- Safety tests: outputs never exceed base redacted data scope.
- Versioning tests: older versions callable after new ones roll out.
- Diff tests: `diff` endpoint highlights only allowed rule deltas with no unexpected field leakage.

**Integration**
- Consumes graph projections, cases, reports, product-analytics; delegates redaction to privacy-engine.
- Outputs feed exec dashboards, regulator packs, report-auto/timeline-narrator view models.

## 142. migration-assist/ — Migration & Upgrade Planner

**Mission:** Plan and supervise breaking-change migrations with explicit mitigation steps and readiness signals.

**Plan schema**
- `plan_id`, `proposal_ref` (schema-council), `blast_radius_summary`, `steps[]` (action, env/tenant cohort, gating checks, rollback point), `dual_write` periods, `feature_flags`, `cdc_backfill` tasks, `validation_checks`, timeline milestones.

**Execution model**
- Planner ingests schema-council proposals and blast-radius artifacts, generating plans with explicit pre-checks, canary cohorts, and rollback markers.
- Status engine enforces step ordering; transitions require validation attestation inputs (e.g., CDC parity, API contract checks).
- Emits readiness signals to program-graph plus notifications to deploy-orch; never mutates upstream schemas directly.

**APIs**
- `POST /plans/generate`: draft plan from change proposal and blast-radius analysis.
- `GET /plans/{id}`: status, current step, cohorts, blockers.
- `POST /plans/{id}/advance`: mark step complete after validations; emits ready/not-ready to program-graph.
- `POST /plans/{id}/rollback`: activate rollback point when failure detected.
- `GET /plans`: list active/completed plans with lifecycle history for governance reviews.

**Testing**
- Fixture migrations for schema changes/backfill patterns.
- Failure-path tests ensuring rollback/hold triggers on mid-migration errors.
- Integration checks with env-sandbox, deploy-orch, and CDC mocks.
- Idempotency tests: repeated `advance` or `rollback` calls do not double-apply steps.

**Integration**
- Read-only from proposals; stores plans/versioning locally; orchestrates via deploy-orch/api-gateway hooks without direct code changes.

## 143. workload-guard/ — Human Workload Balancer & Burnout Guard

**Mission:** Monitor analyst/team load and emit balancing signals to protect HITL quality.

**Signals**
- Active queue size, task complexity scores, time-on-task, after-hours intensity, incident stress load, training load.
- Smoothed over time to avoid thrash; thresholds defined with ops/HR/legal.

**Modeling approach**
- Load score = weighted sum of normalized signals with decay over time; supports configurable per-team thresholds.
- Cooldown logic prevents rapid flip-flop of rebalance signals; alerts require sustained overload for N consecutive intervals.
- Privacy layer masks sensitive task details when aggregating per team.

**APIs**
- `GET /workload/analysts/{id}`: current load profile and contributing factors.
- `GET /workload/teams/{id}`: aggregate load and imbalance indicators.
- `POST /workload/rebalance-signals`: emit suggested reassignments to triage/HITL systems.
- `GET /workload/alerts`: internal-only alerts when thresholds breached.
- `POST /workload/ingest`: optional push endpoint for batch workload snapshots when stream access is limited.

**Testing**
- Synthetic overload scenarios triggering rebalance signals without oscillation.
- Privacy checks ensuring only permitted detail per policy (mostly aggregate).
- Stability tests for smoothing under short-term spikes.
- Cooldown tests confirming signals remain suppressed until cooldown expires after a rebalance.

**Integration**
- Ingests triage queues, HITL tasks, case workloads, product-analytics session telemetry, academy training loads, incident-cmd involvement; no direct writes to assignments.

## 144. ops-knowledge/ — Operational Knowledge Base & Runbook Intelligence

**Mission:** Store and serve structured runbooks and KB articles for incident response and troubleshooting.

**Runbook schema**
- `runbook_id`, `version`, `trigger_conditions` (symptoms, metrics, logs), `steps` (ordered with decision branches), `expected_outcomes`, `linked_capabilities` (program-graph), `incident_refs`, `rca_refs`, `vuln_center_refs`, usage/success metrics.

**Execution and governance**
- Versioned storage with immutable historical records so incidents retain the exact runbook used at the time.
- Suggestion engine scores runbooks based on trigger condition similarity plus observed success rates for similar incidents.
- Feedback ingesters record completion status, blocked steps, and suggested edits for editorial workflows.

**APIs**
- `POST /runbooks`: create/update versioned runbooks; older versions retained.
- `GET /runbooks/{id}`: retrieve specific version and usage stats.
- `POST /suggest`: given symptom set/incident context, return ranked runbooks.
- `POST /feedback`: record success/failure stats from incident-cmd/gameday.
- `GET /runbooks`: list runbooks filtered by capability, product surface, or incident class for docs-hub export.

**Testing**
- Matching tests: synthetic symptom sets mapped to correct runbooks.
- Versioning tests: new versions co-exist; old incidents keep referencing old runbooks.
- Feedback loop tests: runbook success/failure stats recorded from incident-cmd/gameday.
- Suggestion ranking regression tests ensuring higher success-rate runbooks climb ordering for similar triggers.

**Integration**
- Connects to incident-cmd, rca-engine, meta-monitor, vuln-center, gameday; feeds docs-hub/dev-copilot; stores only KB metadata and structured runbooks.
