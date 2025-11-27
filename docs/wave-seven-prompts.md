# Wave Seven Architecture Notes (Prompts 49–56)

This document outlines backend designs for prompts 49–56, focusing on clean service boundaries, additive schemas, and parallel delivery with earlier waves.

## 49. `collab/` — Collaboration Layer (Comments, Threads, @Mentions)

**Goals:** Provide comment threads attachable to any object without polluting domain models; support replies, edits with history, soft-deletes, attachments, mentions, and notification events.

**Data model:**
- `comment_thread`: `id`, `object_type`, `object_id`, `created_at`, `last_activity_at`, `metadata` (for per-object settings), `created_by`.
- `comment`: `id`, `thread_id`, `parent_id` (for replies), `body`, `body_markdown`, `attachments` (asset IDs), `created_by`, `created_at`, `edited_at`, `deleted_at`, `version`.
- `comment_edit_history`: `id`, `comment_id`, `version`, `body`, `edited_at`, `edited_by`.
- `mention`: `id`, `comment_id`, `mention_type` (user/team), `mention_id`, `resolved_at`, `resolved_to` (canonical identity ID), `notified_at`.

**APIs:**
- `POST /collab/threads`: create thread for `(object_type, object_id)`, idempotent on tuple to avoid duplicates.
- `GET /collab/threads?object_type=&object_id=`: list thread with comments (paginated, optionally include deleted/edits for audit).
- `POST /collab/comments`: create comment in thread with optional `parent_id`, `attachments`, `mentions`; resolve mentions via identity service before emitting events.
- `PATCH /collab/comments/:id`: edit body; append `comment_edit_history` row, bump version; reject if actor lacks edit permission.
- `DELETE /collab/comments/:id`: soft-delete with tombstone reason; retain history.
- `GET /collab/comments/search`: filters on actor, object tuple, date range, mention target, deletion status for compliance.

**Permissions & integration:**
- Authorization via `access-admin`/identity lookups on the target object and thread ownership; deny cross-object spoofing by validating tuple.
- `@mention` resolution defers to identity/teams APIs; produce `collab.mention.created` events consumed by `notify/` (no direct send). Replies raise `collab.reply.created` events.
- Attachments stored in `assets/` by ID; `collab` stores only references.
- Rate-limiting hooks on comment creation and edits; enforce max body length at API + storage.

**Testing:**
- Thread lifecycle: create, reply, edit history accumulation, soft-delete visibility rules.
- Permissions: edit/delete by owner/admin; access denied when object access missing.
- Mentions: resolution to canonical IDs; events emitted with payload linking `comment_id`, `mention_id`, `object_type/id`.
- Limits: reject oversized bodies, enforce per-actor rate thresholds, paginate large threads deterministically.

**Example flows:**
- Case comment: `POST /collab/threads {object_type:"case", object_id:caseId}` then `POST /collab/comments` referencing returned `thread_id`.
- ER decision thread: `object_type:"entity"` (ER node) with mentions to supervisors; emitted event allows notify service to fan-out.
- View/report thread: `object_type:"view"` or `"report"`; identical handling keeps domain models clean.

## 50. `time-engine/` — Temporal Normalization & Reasoning

**Goals:** Normalize heterogeneous timestamps, represent uncertainty, and provide temporal relationship queries and timeline-ready sequences.

**Canonical time model:**
- `normalized_time`: `id`, `source_ref` (object/type/id + field), `raw_value`, `normalized_instant` (UTC), `interval_start`, `interval_end`, `confidence`, `timezone`, `precision` (instant/day/month/quarter/year), `ingested_at`.
- Relationships stored as `temporal_relation`: `subject_time_id`, `object_time_id`, `relation` (before/after/during/overlaps/meets/gap), `delta_lower/upper` for windowed predicates.
- Uncertain times represented as intervals with precision and confidence (e.g., “early 2023” → Jan 1–Mar 31 2023, precision=quarter, confidence score).

**Normalization pipeline:**
- Parse raw timestamps with format registry (ISO, RFC 2822, epoch, log-specific patterns) and time zone detection; fallback via heuristics.
- Standardize to UTC instants plus interval bounds for approximate times; store source + transformation metadata for audit.
- Detect DST/leap-second edge cases via timezone database; retain parsing warnings to surface low-confidence results.

**APIs:**
- `POST /time-engine/normalize`: accepts list of raw timestamp fields; returns canonical records and persisted IDs.
- `GET /time-engine/timeline`: inputs `(object_type, object_id)` or list of event IDs; returns ordered events with intervals, confidence, and relations.
- `GET /time-engine/query`: supports predicates like `between(T1,T2, filter_by=object/entity)`, `preceding(event_id, delta_ms)`, `overlaps(interval)`.
- Helper SDK for clients to annotate their ingest with `normalized_time_id` references without schema rewrites.

**Testing:**
- Normalization fixtures for messy inputs, timezone shifts, DST boundaries, leap seconds.
- Temporal algebra: verify ordering for overlaps/gaps, including cross-timezone comparisons.
- Performance: building timelines over large event sets with pagination; caching of normalized results for repeat queries.

**Consumer guidance:**
- Services keep native timestamps; they call `normalize` and store returned IDs as optional references.
- Timeline consumers (tri-pane/case/lineage) call `timeline` with object IDs; no UI coupling.

## 51. `projection/` — Versioned Graph Projections

**Goals:** Materialize versioned projections tailored for analytics/UI/ML without altering the core graph.

**Projection spec:**
- Declarative spec fields: `name`, `version`, `source_graph`, `node_types` (with property allowlist/renames/derived fields), `edge_types` (filters, weights), `filters` (global predicates), `derive` (computed attributes), `refresh_strategy` (full, incremental via CDC), `indexes`.
- Specs are immutable once activated; new version required for changes.

**Architecture:**
- Projection registry stores specs, status, freshness, and build history.
- Builder reads source graph snapshot, applies filters/derivations, writes to projection store (could be per-use backend).
- CDC/backfill integration: subscribe to `cdc-backfill/` to queue incremental updates; periodic validation jobs detect drift.
- Query router: given consumer intent (analytics/ui/ml), return projection endpoint + version.

**APIs:**
- `POST /projection/specs`: register spec; validation ensures immutability on activation.
- `POST /projection/specs/:id/activate`: kicks off initial build job; stores build artifacts + provenance.
- `GET /projection/specs`: list specs with status/freshness metrics; `GET /projection/specs/:id/history` for builds.
- `GET /projection/query`: resolves projection by name/version/use-case and routes read queries.

**Testing:**
- Correctness: apply spec to fixture graph and compare expected nodes/edges/properties.
- CDC: simulate mutations and ensure incremental updates mirror full rebuild results without duplication.
- Performance: benchmark rebuild and query latency per projection type.

**Initial projections:** analytics (lightweight properties, fan-out edges), UI (tri-pane/lineage friendly), ML (feature-enriched neighborhoods with derived embeddings/weights).

## 52. `redaction-view/` — Safe Shareable Views

**Goals:** Generate externally shareable, policy-compliant redacted outputs for cases, reports, and evidence bundles using only public APIs.

**Templates & rules:**
- Template catalog keyed by audience (regulator/customer/partner/public) referencing policy rules from privacy-engine/PDP.
- Rules declare field-level masking, pseudonymization, removal of attachments, date/location obfuscation granularity, and allowed artifact formats.

**Processing flow:**
1. Fetch source data via public APIs (cases, evidence, prov-ledger) plus governance PDP decisions.
2. Apply template rules to build redacted view; keep audit log of retained vs removed fields.
3. Generate artifacts: structured JSON bundle, optional ZIP packaging; hooks to case/report exporters for PDF/HTML.

**APIs:**
- `POST /redaction-view/requests`: request redacted view for `(object_type, object_id, template_id)`; returns job ID.
- `GET /redaction-view/requests/:id`: status + links to artifacts + audit log.
- `GET /redaction-view/templates`: list templates and rule summaries.

**Testing:**
- Positive: sensitive fields removed/obfuscated per template; attachments filtered.
- Negative: requests blocked when PDP denies audience/template combination; clear error codes.
- Snapshot tests: fixed inputs/policies produce stable bundles.

**Auditability:** Store per-field decision log and template version; expose diff of redacted vs retained for compliance review.

## 53. `ml/eval-nonllm/` — Non-LLM Model Evaluation & Benchmarking

**Goals:** Provide benchmark datasets, metric runners, and scorecards for ER/anomaly/risk/pattern models via serving gateway/registry.

**Datasets & configs:**
- Benchmark registry with dataset metadata (task, version, schema, splits), labels (synthetic + curated), and evaluation configs (metrics, thresholds, gates).
- Data access via storage URIs; runners stream batches to candidate models via serving gateway APIs.

**Runners & metrics:**
- ER: pair/cluster matching metrics (precision/recall/F1), optional clustering purity.
- Anomaly: ROC/PR, alert volume vs ground truth, latency tracking.
- Risk: calibration curves, Brier score, top-K precision/recall; configurable thresholds.
- Pattern/other classifiers: standard accuracy/F1 plus domain-specific confusion slices.

**Scorecards:**
- Versioned per model/version/dataset; store metric JSON, configs used, random seeds, timestamps; queryable for promotion gates.
- CI hooks enforce gates (e.g., must beat baseline metrics) before registry promotion.

**APIs/CLI:**
- `POST /ml/eval-nonllm/runs`: specify model ref, dataset, metrics config; returns run ID.
- `GET /ml/eval-nonllm/runs/:id`: status + scorecard.
- `GET /ml/eval-nonllm/scorecards`: filter by model/version/dataset/task.

**Testing:**
- Determinism: repeated runs on same seed/model/data produce identical metrics.
- Metric correctness: toy fixtures with known answers for ER/anomaly/risk.
- CI integration tests: failing gates block promotion with actionable messages.

## 54. `cli/` — Unified CLI & Scriptable Control Surface

**Goals:** Single CLI that wraps platform APIs with profiles/tenants, human-readable tables by default and JSON via flags, and plugin-style command registration.

**Architecture:**
- Core binary/package with command registry; services contribute subcommands via plugin modules.
- Profile manager reads env/tenant configs; shared auth/client initialization per command.
- Output renderer switches between table/JSON; consistent error handling and exit codes.

**Initial command areas:** health/status, ingest run trigger, backfill jobs, simulation runs, compliance report generation, feature-flag/migration toggles, sandbox admin hooks.

**APIs & UX:**
- `cli login --profile dev|staging|prod --tenant TENANT` to store auth tokens securely.
- Namespaced commands: `cli health services`, `cli ingest run --source ...`, `cli backfill start`, `cli flags set`, `cli sandbox list` (delegates to env-sandbox API).
- Flags: `--output table|json`, `--watch` for long-running jobs.

**Testing:**
- Unit tests with mocked gateways per command; ensure required flags enforced.
- UX tests for helpful errors and non-zero exit on failures.
- Backward-compat smoke tests for core commands as plugins evolve.

## 55. `config-center/` — Typed, Versioned Configuration Service

**Goals:** Centralized, typed, versioned configs with namespaces/scopes, change history, and live-reload notifications distinct from feature flags.

**Data model:**
- `config_document`: `id`, `namespace` (global/env/tenant/service), `schema_ref`, `version`, `status` (draft/active/deprecated), `created_by`, `created_at`, `supersedes`.
- `config_revision`: stored JSON/protobuf blob, checksum, change summary, authorship, approvals, effective_at.
- `subscription`: client/service subscription with ETag/version tracking and notification endpoints.

**APIs/SDK:**
- `POST /config-center/configs`: create draft with schema reference and scope; validate against schema.
- `POST /config-center/configs/:id/publish`: version bump, optional canary rollout metadata, activation rules.
- `GET /config-center/configs`: filter by namespace/scope/service; `If-None-Match` support for caching.
- Subscribe/poll endpoints for change notifications; SDK provides cached fetch with retry/backoff and emits change events for live reload.

**Testing:**
- Schema validation on create/update; rejection of invalid docs.
- Rollout/rollback semantics: ensure stale clients handle ETag changes gracefully.
- Performance under high-frequency fetch patterns; cache hit ratios.

**Integration notes:**
- Distinct from feature flags; configs reference secret manager keys but never store secrets.
- Gradual migration: services can opt-in per-config; deprecations handled via versioning not breaking changes.

## 56. `env-sandbox/` — Ephemeral Environments & PR Sandboxes

**Goals:** Automate per-branch/PR sandbox stacks using reference architecture with lifecycle management, cost guards, and CI integration.

**Orchestration flow:**
1. CI receives PR/branch event → invoke sandbox orchestrator with branch metadata.
2. Provision mini-stack (templated Helm/Terraform/compose) with dev-friendly configs and seeded demo data.
3. Run smoke tests (arch-bot/qa/perf-lab hooks) and publish endpoint URLs as CI artifacts.
4. Manage lifecycle: default TTL with auto-expiry; `keep-warm` labels or API to extend; teardown jobs are idempotent.

**APIs/CLI hooks:**
- `POST /env-sandbox/environments`: create sandbox for branch/PR with optional size overrides.
- `GET /env-sandbox/environments`: list/inspect status, TTL, endpoints, test results.
- `POST /env-sandbox/environments/:id/teardown`: explicit destroy; safe to re-run.
- CLI bridge via `cli sandbox ...` commands for operators.

**Testing & guardrails:**
- Infra tests for reliable create/teardown and idempotent cleanup.
- Cost guards: enforce max concurrent sandboxes and default lifetimes; alerting on quota breaches.
- Smoke-test wiring: failures surfaced clearly in CI artifacts/logs.

**Separation from staging/prod:**
- Sandbox configs isolated from long-lived environments; templated manifests only.
- Uses existing Helm/Terraform/compose patterns; no bespoke per-team clusters.
