# Field-Level Security, Trust Scoring, OCR Pipeline, Graph Compaction, Incident Hooks, Saved Views, Query Explain, and Multi-Region Readiness — Delivery Blueprint

## High-Level Summary

This blueprint consolidates eight independent yet additive capabilities requested for the platform: field-level security (FLS) with schema tags, deterministic source trust scoring, an OCR pipeline for evidence, graph compaction maintenance, incident runbooks with pager hooks, fine-grained saved views, query explain functionality, and multi-region readiness primitives. Each feature is designed to be feature-flagged, test-backed, and merge-safe while keeping the system deployable-first and compliant with governance mandates.

## Cross-Cutting 7th+ Order Considerations

- **Policy-as-code primacy:** All enforcement (FLS, sharing, incidents) routes through existing authz/ABAC and policy modules to avoid bespoke logic and ensure auditability.
- **Determinism and reproducibility:** Trust score, query explain, and compaction plans are deterministic to enable golden tests and regression detection across regions and tenants.
- **Isolation and idempotency:** Each capability uses explicit feature flags (`FLS`, `TRUST_SCORE`, `OCR`, `GRAPH_COMPACT`, `INCIDENTS`, `SAVED_VIEWS`, `QUERY_EXPLAIN`, `MULTIREGION_SKELETON`) and idempotent job runners to prevent side effects when disabled or retried.
- **Observability-first:** Metrics, structured logs, and audit events are emitted for every control-plane action (serialization redactions, scoring, OCR jobs, compaction steps, incident creation, sharing actions, explain calls, region tagging) to satisfy compliance and incident response readiness.
- **Schema evolution without DB churn:** FLS relies on schema tags at serialization time; multi-region metadata is additive; saved views leverage existing case metadata; OCR text storage uses transform chain references to avoid schema-breaking migrations.
- **Future-proofing:** Adapters and interfaces (OCR, paging, replication, scoring hooks) are pluggable to support vendor swaps and future ML enhancements without changing calling code.
- **Performance guardrails:** Query explain provides cartesian/join risk warnings; compaction includes dry-run and bounded batchers; OCR enforces MIME allowlists and size caps; saved views apply RBAC filters at query-planning time.
- **Security and privacy:** FLS masks PII/PHI by default, incidents guard against alert fatigue with dedupe windows, sharing flows respect tenant scoping, and region context prevents cross-region leakage.

## Architecture & Implementation Plan

### 1) Field-Level Security (FLS) with Schema Tags

- **Schema tagging:** Extend entity/evidence schemas to accept `securityTags: string[]` per field (e.g., `sensitivity:high`, `phi`, `pii`).
- **Serializer:** Add `server/src/security/flsSerializer.ts` exporting `applyFls(entity, context, options)` that walks serialized payloads and removes/masks tagged fields based on authz attributes (roles, clearance levels, tenant, purpose). Debug mode emits `{field, tag, action, reason}` entries.
- **Policy evaluation:** Use existing ABAC/policy engine; evaluate per-field tags against caller claims and feature flag `FLS=true`.
- **Endpoints:** Wire into entity detail and evidence detail responders so responses pass through `applyFls` before returning.
- **Audit/metrics:** Log redaction counts, emit metric `fls.redacted_fields` with tags (entity type, reason).
- **Tests:**
  - Unit: tag/role matrices covering allow, mask, drop, debug reasons.
  - Integration: entity and evidence detail endpoints returning redacted fields for restricted roles and full data for admins.

### 2) Deterministic Source Trust Scoring

- **Package:** Create `packages/trust-score/` with pure functions to compute `{score, factors[]}` using deterministic inputs: provenance completeness, transform depth, corroboration count, freshness decay, manual validation flags.
- **Endpoint:** `GET /sources/:id/trust` (feature flag `TRUST_SCORE=true`) invokes scorer with stored source metadata; returns structured factors.
- **Explainability:** Factors include weights and rationale strings; scoring is stable across runs given same inputs.
- **Timeline hook:** Optional inclusion of trust scores in timeline builder when flag enabled.
- **Tests:** Golden fixtures for multiple source archetypes to assert stable scores and factor ordering.

### 3) Evidence OCR Pipeline

- **Adapter interface:** Define `OCRAdapter` with `extract(fileBuffer, mimeType, metadata)`; provide local stub adapter.
- **Jobs:** `POST /evidence/:id/ocr` enqueues OCR job (feature flag `OCR=true`, MIME allowlist). Worker processes job, stores extracted text in a transform chain entry linked to evidence, and updates full-text index when enabled.
- **Read API:** `GET /evidence/:id/text` returns extracted text, provenance (adapter, timestamp, checksum), and transform reference.
- **Tests:** Integration lifecycle using fixture images/PDFs; job enqueue → processing → retrieval; FTS hook verified when index flag enabled.

### 4) Graph Compaction + Vacuum

- **Job endpoint:** `POST /ops/graph/compact` (admin, `GRAPH_COMPACT=true`) triggers compaction workflow: identify soft-deleted edges, dedupe parallel edges, rebuild indexes/caches.
- **Dry-run:** `?dryRun=true` returns planned actions without mutating; includes before/after counts.
- **Idempotency:** Steps are read-verify-write with checksuming to avoid double-application.
- **Metrics/audit:** Emit audit events and metrics on removed duplicates and reclaimed edges.
- **Tests:** Seeded graph integration asserting duplicate reduction and dry-run stability.

### 5) Incident Runbooks + Pager Hooks

- **Module:** `ops/incidents` with incident types (tenant leak canary, DLQ overflow, authz deny spike, export failures).
- **Rules:** Alert rules evaluate SLO/integrity breaches and create incidents with status + action timeline.
- **Paging adapter:** Interface with stub implementation; runbook jobs enqueued on trigger; guarded by `INCIDENTS=true` flag.
- **Tests:** Unit rule evaluation and integration that simulates a breach to create an incident and enqueue runbook execution.

### 6) Fine-Grained Saved Views

- **Model:** Saved view payload includes search query, selected entity, timeline range, map bounds, tri-pane layout, and sharing metadata.
- **Endpoints:** `POST /saved-views`, `GET /saved-views?caseId=`, `POST /saved-views/:id/share` with RBAC and tenant scoping; feature flag `SAVED_VIEWS=true`.
- **Sharing semantics:** Depending on policy, create a copy for target users/groups or issue share-token; enforce access via existing authz checks.
- **Tests:** CRUD integrations and sharing enforcement with cross-tenant denial cases.

### 7) Query Explain for Graph + Search

- **Endpoint:** `POST /ops/query/explain` (admin, `QUERY_EXPLAIN=true`) returning `{normalizedQuery, estimatedCost, warnings, planSummary}`.
- **Graph explain:** Prefer driver explain APIs; fallback to heuristic estimator with cartesian risk detection and missing tenant filter warnings.
- **Search explain:** Return parsed query, tokenization, ranking weights, and guardrail warnings.
- **Tests:** Unit parsing/estimation and integration responses for fixture queries.

### 8) Multi-Region Readiness Skeleton

- **Region context:** `RegionContext` derived from `X-Region` header with default region; propagated through request lifecycle.
- **Metadata tagging:** Add `region` and `replicationStatus` to critical artifacts (exports, imports, snapshots) when `MULTIREGION_SKELETON=true`.
- **Replication interface:** Define future-proof replication adapter interface without side effects; no infra changes.
- **Tests:** Unit tests for context propagation and integration create/read showing region metadata round-trips.

## Implementation Notes

- **Feature flags:** Centralize in config with defaults `false`; ensure no behavior changes when disabled.
- **Error handling:** Return 400 for disallowed MIME in OCR; 403 for missing admin on compact/explain; 404 for missing records.
- **Performance:** Batch compaction and OCR jobs; cache trust score inputs where permissible; avoid expanding query execution in explain mode.
- **Security:** Enforce tenant scoping in all endpoints; FLS masking uses deterministic placeholders (e.g., `"***"`).

## Testing Strategy

- **Unit suites:** FLS tag rules; trust-score factor math; OCR adapter contract; incident rule evaluation; query explain parsing; region context utilities.
- **Integration suites:** Endpoint tests per feature with flags toggled, seeded fixtures, and authorization coverage. Golden outputs for trust scoring and explain responses to guarantee stability.
- **Non-functional:** Performance microbenchmarks for compaction and OCR job throughput (flagged as optional); smoke tests to ensure flags default to off paths remain unchanged.

## Observability & Operations

- **Metrics:** `fls.redacted_fields`, `trust.score.compute`, `ocr.jobs.pending`, `graph.compaction.removed`, `incidents.created`, `savedviews.shared`, `query.explain.requests`, `multiregion.artifact.tagged`.
- **Tracing:** Span annotations around job enqueue/processing and explain evaluation; include region in trace attributes.
- **Logging:** Structured logs with correlation IDs; audit logs for data-changing operations and redactions.

## CI/CD Considerations

- **Pipelines:** Extend test matrix to include new unit/integration suites under feature flags; add lint/typecheck for new packages and server modules.
- **Golden artifacts:** Store trust-score and explain fixtures under version control; regression checks on CI ensure determinism.
- **Smoke:** Run `make smoke` unchanged; new tests gated by flags to avoid impacting existing flows when disabled.

## Risk & Rollback

- **Risk:** Misconfiguration of feature flags or RBAC gaps; mitigated by default-off flags and exhaustive tests.
- **Rollback:** Disable feature flags to revert behavior; compaction and OCR jobs are idempotent; no schema migrations are required.

## Future Enhancements

- **Adaptive scoring:** Plug-in ML confidence blending once governance approves; maintain deterministic baseline.
- **OCR quality:** Add language detection and confidence scoring; support streaming ingestion; sandboxed plugin adapters for GPU acceleration.
- **Graph hygiene:** Introduce incremental compaction triggered by changefeed events; add tombstone TTLs.
- **Incident automation:** Integrate runbook outputs with chatops; add suppression policies based on blast radius.
- **Saved views UX:** Versioned views with diff; export/import for interoperability.
- **Explain UX:** Visual explain plans and cost deltas; historical baselines for regression alerts.
- **Multi-region:** Add lag metrics, conflict resolution strategies, and replication simulation harness.
