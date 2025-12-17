# Wave 6 Satellite Services: Notifications, Search, Serving, Assets, Data Quality, Gateway, CDC, and Field Profile

This document defines the connective tissue for Wave 6 (prompts 41–48). Each lane is scoped to run in parallel, consume upstream contracts without mutation, and expose additive APIs.

## 41. Notification & Subscription Hub (`notify/`)

**Purpose**: Convert internal events (CEP alerts, case updates, HITL tasks, governance/safety actions) into targeted notifications with clean unsubscribe semantics and channel modularity.

**Event Intake**
- Sources: CEP alert stream, case lifecycle hooks, HITL queue events, governance denials, safety-console kill signals.
- Transport: consume from existing topics; adapters normalize into `NotifyEvent {type, tenant, actor, objectRef, severity, dedupeKey, createdAt, payload}`.

**Subscriptions & Policies**
- Subscription types: per-user, per-team, per-tenant, per-object (`case:{id}`, `entity:{id}`, `alertType:{code}`), and tag-based.
- Delivery modes: immediate, digest (time window + max count), or muted.
- Throttling: dedupe on `(tenant, channel, recipient, dedupeKey, window)` with backoff; drop duplicates to DLQ for audit.

**Channels (pluggable)**
- In-app: write to `notify_notifications` (feed items) + badge counters API.
- Email: dev stub logger; prod connector interface `EmailChannelAdapter` (SES/SendGrid compatible).
- Webhook: signed POST with retries + exponential backoff; per-subscriber endpoint + secret.

**APIs**
- Manage subscriptions: CRUD for scopes + channel preferences.
- Query history: filter by user/team/tenant/object, time range, unread only.
- Acknowledge: mark read/acked; emits audit event for governance.

**Tests**
- Subscription routing matrices: events X/Y/Z map to recipients.
- Throttling/dedup: repeated events within window do not spam.
- Delivery reliability: webhook retry + DLQ on exhaust; email/in-app success paths.

**Docs for integrators**
- Register events by publishing `NotifyEvent` to the bus; no business logic in notify service.
- Consumers add new channels by implementing `ChannelAdapter` without touching routing core.

## 42. Global Search & Discovery Index (`search/`)

**Purpose**: Unified search index for entities, cases/reports, evidence metadata, catalog entries, scenarios, and docs metadata with mixed full-text + structured filters.

**Index Schema**
- Core fields: `id`, `type`, `tenant`, `title`, `description`, `tags`, `sensitivity`, `updatedAt`, `owner`, `source`.
- Content: extracted text snippets for cases/evidence/docs; optional vector embeddings stored but not used for ranking here.
- Facets: `type`, `tags`, `sensitivity`, `timeRange`.

**Ingestion**
- Change streams/CDC from graph, cases, assets, catalog, docs metadata; scheduled sync for services lacking CDC.
- Explicit indexing API: `POST /search/index` with payload + `version` to allow schema evolution.
- Deletions/updates: apply tombstones from CDC; idempotent upserts.

**Query API**
- `POST /search/query`: query string + filters (tenant, type[], tags[], time range, sensitivity) + pagination.
- Options: `groupByType`, `facets=true` to return counts per facet bucket.
- Ranking: BM25-style text relevance + recency bias; tenant-scoped PDP filter before rank.

**Tests**
- Relevance on synthetic corpora: curated queries expect stable ordering.
- Consistency: update/delete events propagate to index; tombstones honored.
- Multi-tenant isolation: queries scoped to tenant/access rights.

**Docs for integrators**
- Provide a search-view endpoint or CDC topic exposing fields above; do not change internal models.
- Versioned API contracts; new fields are additive.

## 43. Model Serving Gateway & Online Inference (`ml/serving-gateway`)

**Purpose**: Standard online inference entry for non-LLM models with versioning, routing controls, and metrics.

**Model Identification**
- `modelName` + `version` (or alias `stable`, `canary`). Metadata pulled from registry with schema contract hash.

**Inference API**
- `POST /models/{modelName}/infer`: body `{version|alias, payload, traceId}`.
- Payload validation against model-specific JSON Schema stored with artifact.
- Response: `{version, latencyMs, output, shadowOutputs?, metrics}`.

**Routing Modes**
- Default: route 100% to `stable`.
- Canary: percentage-based traffic split; deterministic hashing on request key for stickiness.
- Shadow: duplicate request to `candidate`; response ignored for client but logged for comparison.

**Metrics & Reliability**
- Emit per-model latency, error rate, request counts; diff metrics for canary/shadow.
- Retries for transient loader failures; DLQ for malformed requests after validation.

**Tests**
- Contract tests with sample models: validate payload schema + response envelope.
- Routing tests: canary/shadow distributions deterministic given seed key.
- Load tests: p95 latency budget under concurrent load using stub model.

**Docs for integrators**
- Add model by publishing artifact + JSON Schema to registry; register aliases.
- Rollout guide: set shadow first, inspect metrics, then canary %, then promote.

## 44. Attachment & Binary Asset Store (`assets/`)

**Purpose**: Central asset store with content-addressed storage, metadata, dedupe, and safety scanning.

**Storage & Metadata**
- ID: `sha256` hash as content-addressed identifier; metadata record keyed by `assetId` + `version`.
- Metadata fields: `owner`, `tenant`, `contentType`, `size`, `origin`, `tags`, `retentionPolicyId`, `scanStatus`, `linkedRefs[]`.

**APIs**
- Upload: streamed `POST /assets` returns `assetId`, `version`, `scanStatus` (`pending|clean|quarantined`).
- Download: `GET /assets/{assetId}` with range support; enforces tenant ownership and policy tags.
- Linkage: `POST /assets/{assetId}/links` to associate with cases/entities/evidence via opaque IDs.

**Safety & Lifecycle**
- Scanning hooks: AV/file-type validation before marking `clean`; quarantine disallowed types.
- Dedupe: configurable reuse when hash matches; metadata records maintain separate link lists.
- Retention: scheduler reads `retentionPolicyId` and deletes/archives accordingly.

**Tests**
- Integrity: upload/download byte equality and hash verification.
- Dedupe: repeated upload of same bytes reuses storage when enabled.
- Safety: blocked types move to quarantine and are not downloadable.

**Docs for integrators**
- Store only IDs in upstream services; never embed blobs.
- Use policy tags to enforce governance; supply origin context for audit.

## 45. Data Quality Monitor & Drift Watchdog (`data-quality/`)

**Purpose**: Track quality metrics, freshness, and drift across datasets/streams without blocking writes.

**Expectations & Metrics**
- Expectations registered per dataset/feature: schema/nullable, allowed ranges/enums, uniqueness, max lag, distribution baseline.
- Metrics computed on sampled windows: missingness, cardinality, outlier rates, constraint violations, freshness lag, simple drift stats (KS/PSI where applicable).

**Execution**
- Scheduled runners pull dataset inventory from catalog; execute checks via connectors (parquet/warehouse/stream sampling).
- Results stored as `QualityRun {datasetId, version, window, metrics, status, violations[]}`.
- Alerts routed via `notify/` with severity mapped from violation counts/lag thresholds.

**APIs**
- Register/update expectations (`POST /quality/expectations`); versions additive.
- Query current status and history (`GET /quality/{datasetId}/runs` with filters).

**Tests**
- Constraint fixtures: synthetic datasets that should pass/fail specific rules.
- Drift fixtures: controlled distribution shifts trigger expected alerts.
- Performance: sampling limits respected; no full scans on large tables.

**Docs for integrators**
- Declare datasets in catalog; attach expectations; provide access path for sampling.
- Alerts flow to notify/; remediation remains external.

## 46. API Gateway & Client SDKs (`api-gateway/`, `sdk/*`)

**Purpose**: Versioned external surface with consistent envelopes and auto-generated SDKs.

**Gateway Design**
- Prefix versions (`/v1/`, `/v2/`); deprecations announced via headers + docs, never breaking existing versions.
- Responsibilities: auth normalization, rate limiting, tenant scoping, error envelope `{code, message, correlationId, details?}`.
- Routes front core services (graph, copilot, prov-ledger, governance, cases, search, notify, etc.) without altering backend contracts.

**SDKs**
- Generated from OpenAPI/GraphQL into `sdk/typescript`, `sdk/python`, `sdk/go` with thin helpers for auth, pagination, retries.
- Publish examples per language; CI compiles/runs sample apps against test gateway.

**Tests**
- Contract tests ensure gateway proxies correctly and envelopes errors consistently.
- SDK smoke tests: simple calls compile/run; pagination + streaming helpers validated.
- Backward-compat: existing `/v1` clients continue to work when `/v2` added.

**Docs for integrators**
- How to call services via gateway; version negotiation; error model reference.
- SDK usage snippets and auth setup examples.

## 47. Change Data Capture & Backfill Engine (`cdc-backfill/`)

**Purpose**: Maintain append-only change logs and provide safe, resumable reindex/backfill jobs for secondary systems (search, analytics, feature store).

**CDC Schema**
- Event shape: `{source, entityType, entityId, op, before?, after?, ts, seq, tenant}`.
- Sources: graph, cases, assets, etc., via existing logs/CDC views; read-only ingestion.

**Backfill Framework**
- Jobs declare `source` (CDC or snapshot), `target` (search index, projection table), transformers, checkpoints, and idempotent writers.
- Progress tracking with `cursor` (seq/ts) and resumable state; DLQ for poison events.
- Supports rebuilds for new fields/denormalizations without touching primary stores.

**Tests**
- CDC correctness: CRUD sequences yield expected event stream order.
- Backfill on synthetic data matches expected target state; updates/deletes honored.
- Failure/restart: simulated interruptions resume without double-processing.

**Docs for integrators**
- How to expose CDC views; how to author a backfill job with version tag; how to monitor progress.

## 48. Lightweight Field Client Backend Profile (`field-client/`)

**Purpose**: Facade for mobile/edge users with compact, task-focused APIs and strict payload limits.

**Workflows Covered**
- View assigned cases/tasks (cases + HITL + notify integration).
- View compact graph/case context (summaries, key entities, recent activity only).
- Submit notes/annotations/simple forms and small attachments (via assets service).

**API Shape**
- Bounded responses with pagination and size caps; pre-trimmed DTOs (no full graph payloads).
- Auth/session: simplified token profile still enforced by governance/PDP.
- Offline-aware hooks: optional sync checkpoints when edge cache (Prompt 20) present.

**Safety & Performance**
- Strict limits on payload size and query complexity; deny large fan-out queries.
- Caching of read-mostly references; gzip enabled; prefer delta updates for activity feeds.

**Tests**
- Contract tests for each endpoint with realistic small payloads.
- Latency/bandwidth simulations to ensure acceptable p95 under constrained links.
- Security: verify only scoped data returned for assigned tasks/tenant.

**Docs for integrators**
- DTO definitions for field clients; guidelines on polling vs. push (via notify); attachment size limits and retry guidance.
