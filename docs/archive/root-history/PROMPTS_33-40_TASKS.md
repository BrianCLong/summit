# Prompts 33–40: Individual Task Breakouts

This document enumerates the eight independent feature tracks requested across prompts 33–40. Each section captures the objective, scope, key requirements, test expectations, and completion criteria to guide parallel execution without cross-coupling.

## 33) Break-Glass Access Flow (time-boxed elevation + mandatory justification)

- **Goal:** Implement emergency access with explicit approvals and automatic expiry.
- **Scope:** Backend auth/policy module only.
- **Key Requirements:**
  - `POST /access/break-glass/request` with justification and ticket ID; reject if missing.
  - `approve` endpoint issues short-lived elevated scope; non-renewable and hard expiry.
  - Elevated actions stamped with break-glass context; standard ABAC/OPA checks still enforced.
  - Persist requests/approvals/expiry; single-use semantics.
  - Emit audit events for request, approval, expiry, and usage.
- **Tests:** Approval grants scope; expiry revokes; missing justification rejected; audit emitted.
- **Done:** Cannot bypass ABAC/OPA; ops docs/runbook.

## 34) Audit Export + Tamper-Evident Chain (hash-chained events)

- **Goal:** Add append-only audit store with `prevHash`/`eventHash` and export verification.
- **Scope:** Audit module, export route, CLI verifier integration.
- **Key Requirements:**
  - Append-only writes; hash chaining on every event.
  - `GET /audit/export?from&to` provides bundle, manifest, schema, verification report; stable pagination.
  - Verifier detects tampering; ensure no PII in export.
- **Tests:** Chain verifies on clean log; fails on modification; export pagination stable.
- **Done:** Tamper-evident chain enforced; export bundle includes schema + manifest.

## 35) Webhook Framework (signed delivery + retries + idempotency)

- **Goal:** Webhook delivery for key events (case created, export ready, ingest completed).
- **Scope:** New `webhooks` module, DB table, worker; no UI.
- **Key Requirements:**
  - Tenant-configurable endpoints; HMAC signing; idempotency keys.
  - Delivery retries with backoff; poison-message handling; observability.
- **Tests:** Signature validity; retry policy; idempotency; poison handling.
- **Done:** Zero duplicate deliveries beyond contract; clear observability.

## 36) Map Clustering + Spatial Index

- **Goal:** Marker clustering and optional backend bbox helper.
- **Scope:** Prefer frontend; optional `GET /geo/points?bbox=` if needed.
- **Key Requirements:**
  - Clustering toggle; expand on zoom; pagination for rendered points; deterministic ordering for bbox.
  - Feature flag to protect non-map views.
- **Tests:** Component tests for clustering toggle; bbox query deterministic; no regressions in other views.

## 37) Virtualized Graph Rendering + Performance Bench

- **Goal:** Virtualized/progressive graph rendering for large datasets with responsive interactions.
- **Scope:** Frontend graph component and performance benchmark harness only.
- **Key Requirements:**
  - Progressive render/level-of-detail; cap DOM/canvas work; maintain keyboard accessibility.
  - Interaction tests for hover/select; benchmark asserts render-time upper bound.
- **Tests:** Interaction responsiveness; benchmark pass on fixture graph.
- **Done:** No visual regressions; accessibility preserved.

## 38) “Case Read Model” Cache (materialized views)

- **Goal:** Read-model cache for case overview (`GET /cases/:id/overview`).
- **Scope:** Backend module, storage table, updater job.
- **Key Requirements:**
  - Serve overview from cache with stale-while-revalidate; event/job-driven refresh; rebuild command.
  - Safe invalidation; metrics on hit rate.
- **Tests:** Cache correctness; SWR behavior; rebuild path; safe invalidation; hit-rate metrics.
- **Done:** Reduces cold-load queries without regressions.

## 39) Fuzz + Property-Based Testing for Query & Ingest Boundaries

- **Goal:** Add fuzz/property tests for GraphQL/REST boundaries and validators.
- **Scope:** Test-only with minimal helpers; no product logic changes.
- **Key Requirements:**
  - Deterministic seeds; CI-friendly time limits; shrinking on failure.
  - Invariants: no crashes, no path traversal, no policy bypass.
- **Tests:** Fuzz suites covering headers/params/bodies; validator property tests.
- **Done:** CI-bounded runtime; actionable repro logs.

## 40) Disaster Recovery: Backup/Restore Commands + Smoke Tests

- **Goal:** CLI `ig backup create` / `ig backup restore` with checksum verification.
- **Scope:** Tooling and admin module; no UI.
- **Key Requirements:**
  - Encryption support; partial restore by case; dry-run mode; safe defaults; no secrets printed.
  - Verify counts/hashes on restore; include critical object storage refs.
- **Tests:** Ephemeral DB integration; restore produces identical counts/hashes; partial restore path.
- **Done:** Documented runbook; smoke tests; rollback safe.
