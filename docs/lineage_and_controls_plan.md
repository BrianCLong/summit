# Incremental Implementation Plan: Lineage, Sandbox Analytics, Plugins, Redaction, Case Linking, Justification Gates, Entity Versioning, Policy Pack

## Principles

- Ship features independently behind feature flags; default-off until verified.
- Prefer additive modules in scoped directories to minimize merge conflict risk.
- Maintain deterministic fixtures and golden outputs for graph/lineage surfaces.
- Enforce auditability and provenance for all data-moving actions.

## Milestones

### Milestone 1: Foundations & Contracts

1. **Lineage API v1 contracts**
   - Define graph node/edge types and deterministic ordering in `server/src/lineage/schema.ts`.
   - Seed golden lineage fixtures for regression.
2. **Analytics sandbox DSL**
   - Draft JSON schema for aggregates-only DSL (`groupBy`, `filters`, `timeBuckets`, `topK`, `metric`).
   - Introduce policy version hash in responses and audit log schema.
3. **Plugin runtime manifest + sandbox policy**
   - Formalize manifest validation and sandbox capability matrix.
4. **Entity versioning scope**
   - Select Claim writes as initial hook; design append-only version record shape.

### Milestone 2: Minimal Viable Paths (feature-flagged)

1. **Lineage read-only endpoint**
   - Implement `GET /lineage` behind `LINEAGE_V1` flag with depth limit + pagination.
   - Return `{nodes, edges, summary}` using seeded fixtures; ensure deterministic ordering.
   - Tests: golden graph snapshot + missing lineage gap assertions.
2. **Analytics sandbox endpoint**
   - `POST /analytics/query` behind `ANALYTICS_SANDBOX`; restrict to aggregates; reject identifiers/raw exports with reason codes.
   - Enforce tenant scoping, row thresholds, admin-only guard; audit each query with policy hash.
   - Tests: allow/deny matrix + histogram integration.
3. **Plugin runtime skeleton**
   - Add worker-based sandbox (no FS/network) behind `PLUGIN_RUNTIME` with resource limits.
   - Ship demo read-only plugin (name normalization) with manifest validation tests and escape-prevention tests.
4. **Justification gate middleware**
   - Add `requireJustification(action)` middleware behind `JUSTIFY_GATES`; apply to two high-risk endpoints; record justification hash in audit events.

### Milestone 3: Workflow Integrations

1. **Bulk redaction pipeline**
   - Queue-backed scan job creation, proposal retrieval, and resolve apply/reject endpoints under `BULK_REDACT`.
   - Redacted derivatives only; provenance recorded.
   - Tests: job lifecycle, proposal apply/reject, audit assertions.
2. **Case linking & import**
   - `POST /cases/:id/links` and `POST /cases/:id/import-from/:otherId` under `CASE_LINKS` with loop prevention and deterministic import IDs.
   - Strict authz + audit trails; provenance backrefs on imported artifacts.
3. **Entity versioning hook**
   - Wire Claim updates to append-only version table/collection; expose `GET /entities/:id/versions` and `/versions/:versionId` under `ENTITY_VERSIONING`.
   - Tests: create→update→versions length increments; diff stability.

### Milestone 4: Ops & Compliance Artifacts

1. **Policy pack export**
   - `POST /ops/policy-pack/export` behind `POLICY_PACK`; admin-only.
   - Bundle policy version/hash, permissions matrix, config-lint summary, manifest with verifier hashes and correlationId; store in artifact vault.
   - Tests: export integration + manifest hash verification.
2. **Observability and audit hardening**

- Structured logs for sandbox/plugin/lineage flows with correlation IDs; metrics for feature-flag usage.

## Architecture Blueprint (All Eight Tracks)

- **Feature flags**: `LINEAGE_V1`, `ANALYTICS_SANDBOX`, `PLUGIN_RUNTIME`, `BULK_REDACT`, `CASE_LINKS`, `JUSTIFY_GATES`, `ENTITY_VERSIONING`, `POLICY_PACK` (all default-off). Gate every route + service entry point and expose Prometheus counters for flag hits/misses.
- **Service boundaries**: each feature lives under its own module directory with local domain services, DTOs, and validators. Cross-cutting dependencies (authz, audit, persistence clients) are injected via existing platform providers.
- **Data stores**: use Postgres for jobs/audit/versioning, Neo4j for lineage graphs, Redis/Kafka for queues/streaming, object store for policy-pack artifacts. Keep schemas append-only with migrations co-located in module.
- **Determinism & ordering**: enforce sorted identifiers (lexicographic) in graph exports, stable pagination cursors, and hashed manifests for artifacts.
- **Security defaults**: deny-by-default for sandbox/plugin operations, structured justification checks for gated actions, provenance links on every mutation, read-only modes enforced in lineage/analytics.

### Lineage API v1

- **Endpoints**: `GET /lineage?entityId=&fieldPath=&depth=&cursor=` returns `{nodes, edges, summary}`; `GET /lineage/fixtures/:id` for golden debugging (dev-only).
- **Data model**: nodes (entityVersion, transform, evidence, document) and edges (`derivedFrom`, `cites`, `normalizedFrom`) typed via `schema.ts`. Store lineage snapshots in Neo4j; materialized view cache in Redis for hot paths.
- **Processing**: BFS with depth limit + pagination; deterministic ordering by `(type, id, version)`; missing links recorded as gaps with placeholder nodes.
- **Tests**: golden snapshot test, gap-handling test, pagination determinism, feature-flag deny test.
- **Observability**: metrics for depth capped, gaps encountered, and cache hit rate; logs correlate by `correlationId`.

### Secure Analytics Sandbox

- **Endpoint**: `POST /analytics/query` accepts DSL `{groupBy, filters, timeBuckets, topK, metric}` and returns aggregates + policy hash + auditId.
- **Guards**: admin-only, tenant scoping on filters, row-count thresholds, schema validation (JSON Schema), identifier scrubber to reject raw fields, and reason codes for denials.
- **Execution**: compile DSL into parameterized SQL/graph aggregate with allowlisted clauses; use read-replica connection and limit concurrency.
- **Tests**: allow/deny matrix, histogram happy-path, tenant-leak prevention, threshold enforcement, audit emission.
- **Observability**: metrics for denied reasons, latency per query type, row-count truncations.

### Sandboxed Plugin Runtime

- **Endpoint**: `POST /plugins/run` takes manifest + input payload; only approved plugins registered in `plugins/` are allowed.
- **Runtime**: worker thread/VM with no FS/network, memory/time caps, readonly global. Capability matrix enforced per manifest; input/output schema validation.
- **Demo plugin**: name-normalizer that trims and title-cases; manifests live in `plugins/demo/manifest.json` with checksum validation.
- **Tests**: manifest validation, approved-plugin allow, unapproved deny, escape attempts blocked, resource-limit enforcement, deterministic output for demo plugin.
- **Observability**: structured plugin execution logs (redacted inputs), metrics for sandbox failures and resource throttling.

### Bulk Redaction Workflow

- **Endpoints**: `POST /redactions/scan` (enqueue scan job), `GET /redactions/jobs/:id`, `GET /redactions/proposals?jobId=`, `POST /redactions/proposals/:id/resolve`.
- **Pipeline**: scan worker produces proposals `{locator, spans, reason}`; proposals stored append-only. Resolve path writes redacted derivative records and provenance edges; no destructive overwrite.
- **Tests**: job lifecycle (created→scanning→completed), proposal retrieval ordering, apply vs reject behavior, audit trails, feature-flag guard.
- **Observability**: metrics for proposal volume, approval rate, redaction latency; logs include correlationId and actor.

### Case-to-Case Linking

- **Endpoints**: `POST /cases/:id/links` (link with `{otherCaseId, reason, tags, createdBy}`) and `POST /cases/:id/import-from/:otherId` (selected artifact IDs).
- **Semantics**: links are directional records with timestamps; imports create new IDs in destination with provenance backrefs; detect cycles using visited-set chain on imports.
- **Tests**: link creation, loop prevention, deterministic import ID generation, provenance checks, authz enforcement.
- **Observability**: metrics for link count, import volume, loop-prevention triggers.

### Justification Gates

- **Middleware**: `requireJustification(action)` validates payload `{authorityType, referenceId, narrative, expiresAt?}`; hashes payload and stores in audit.
- **Application**: wrap two high-risk endpoints (export release + policy change) under `JUSTIFY_GATES`. Requests without valid justification fail with 403 and reason code.
- **Tests**: success/failure cases, audit content includes justification hash, expiry honored when provided.
- **Observability**: metrics for gated denials and justification types.

### Deterministic Entity Versioning

- **Scope**: start with Claim updates. On mutation, append version record with metadata `{actor, time, reason, policyVersionHash, diff}`.
- **Endpoints**: `GET /entities/:id/versions` (paginated) and `GET /entities/:id/versions/:versionId` (single snapshot) behind `ENTITY_VERSIONING`.
- **Storage**: append-only table/collection; diffs generated via stable JSON patch; idempotent writes keyed by mutation correlationId.
- **Tests**: create→update increments versions, diff correctness, pagination determinism, feature-flag guard.
- **Observability**: metrics for version writes and diff size distribution.

### Policy Pack Export

- **Endpoint**: `POST /ops/policy-pack/export` (admin-only) builds artifact `{policyVersion, hashes, permissionsMatrix, configProfile, correlationId, timestamp}`.
- **Processing**: gather policy hash, generate permissions matrix, run config-lint summary, bundle manifest with SHA-256 checksums; store in artifact vault with immutable locator.
- **Tests**: export integration, manifest hash verification, admin-only enforcement, artifact store write success path.
- **Observability**: metrics for export invocations, success/failure counts, artifact size.

## Delivery Playbook

1. Implement contracts + migrations per module with flag guards; land deterministic fixtures for lineage/analytics/versioning.
2. Add integration tests to `server/tests` with seeded data; wire coverage thresholds to CI gate for touched modules.
3. Instrument metrics/logs/traces (OpenTelemetry) with correlation IDs; wire alerts for sandbox/plugin escape attempts and justification denials.
4. Provide runbooks in `server/runbooks/` for each feature flag (enable, validate, rollback); include manual verification steps.
5. Post-merge: run `pnpm test`, `pnpm lint`, `pnpm --filter intelgraph-server test:coverage`; execute smoke (`make bootstrap && make up && make smoke`) before enabling flags in higher envs.

## Risk Controls & Merge Safety

- Keep implementations confined to scoped directories: `server/src/lineage/*`, `server/src/analytics/*`, `server/src/plugins/*`, `server/src/redactions/*`, `server/src/cases/links*`, `server/src/versioning/*`, ops module for policy pack.
- Feature flags default to false; avoid mutation in read paths.
- Deterministic ordering in graph/lineage responses to stabilize golden tests.
- Deny-by-default posture for sandbox/plugin capabilities; explicit allowlists.

## Post-Merge Validation

- Run `pnpm test`, `pnpm lint`, and targeted integration suites for new modules.
- Smoke path: make bootstrap → make up → make smoke.
- Verify feature-flag toggles and audit records in a seeded environment.
