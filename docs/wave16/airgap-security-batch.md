# Wave 16 Security Batch Execution Plan

This document captures the implementation-ready plan for the eight requested security-and-integrity features. Each scope is independent and guarded by a feature flag to ensure safe rollout. Interfaces, data contracts, observability, and validation steps are defined to keep work mergeable and test-backed.

## 1. Airgap Export/Import

- **Endpoints:** `POST /airgap/export`, `POST /airgap/import`, `GET /imports/:id` (read-only snapshots).
- **Artifacts:** bundle.tar.gz + `manifest.json` + `hashes.txt` + optional `encryption.json` (stubbed if crypto not wired).
- **Manifest:** includes bundle ID, tenant ID binding, component list with SHA-256, schema version, and integrity Merkle root.
- **Verification:** import recomputes hashes, validates manifest schema, checks tenant binding, and rejects mutations with audit events.
- **Storage:** imported bundles stored in immutable object store path `imports/<tenant>/<bundleId>/` with deduped blobs.
- **Feature flag:** `AIRGAP=true` required to enable endpoints.
- **Tests:** fixture happy-path import/export, tamper rejection (hash mismatch), schema validation failure, and snapshot availability via GET.

## 2. Multi-Party Approvals (MPA)

- **Endpoints:** `POST /approvals/request`, `POST /approvals/:id/approve`, `POST /approvals/:id/reject`, `GET /approvals` (filters by status/action).
- **Payload:** action hash, action type, required approver roles, expiry, and N-of-M threshold.
- **Workflow:** approval records are append-only with immutable audit trail; thresholds gate execution of protected actions (initial integration: export release).
- **Feature flag:** `MPA=true`; enforced gate wraps export action to prevent bypass.
- **Events:** audit log entries + critical alert on final approval/rejection and expiry auto-close.
- **Tests:** integration covering request → partial approval (still pending) → threshold met (action executes) and explicit rejection path.

## 3. Hash-Chained Audit Ledger

- **Store:** `audit_ledger` table (or collection) with `{eventId, prevHash, eventHash, payloadHash, timestamp}`; hashes computed with SHA-256 and deterministic JSON canonicalization excluding PII.
- **Endpoint:** `GET /ops/audit-ledger/verify?since=<eventId>` returns chain integrity and first offending event if detected.
- **Hook:** emitter wraps existing audit publish path when `AUDIT_CHAIN=true` to append chained entries; no semantic change to audit payloads.
- **Tests:** fixture ledger verified clean; tampered entry detection surfacing index and cause.

## 4. Graph Query Plan Cache

- **Key:** `{tenant, normalizedCypher, schemaVersion}`; normalization strips whitespace and canonicalizes parameter order.
- **Policy:** only cache read-safe operations; TTL + LRU (configurable) with metrics on hit/miss and latency impact.
- **Feature flag:** `QUERY_PLAN_CACHE=true`; miss path compiles plan and stores; fallback safely on errors.
- **Tests:** normalization unit tests and integration that confirms a cache miss then subsequent hit with identical results.

## 5. Data Retention Enforcement Engine

- **Job:** `retention` scheduled worker; supports dry-run (default prod) emitting report of candidate deletions.
- **Scope:** evidence files, imported bundles, job artifacts, and logs; policies keyed by tag with `legal_hold` and `hold_override` support.
- **Actions:** delete or compact items past TTL when not on hold; write audit events with provenance (who/when/why) and store execution report.
- **Feature flag:** `RETENTION=true` to activate enforcement.
- **Tests:** seeded dataset by age/tag producing expected dry-run report and execution mode removals.

## 6. Cross-Tenant Leak Canaries

- **Canaries:** per-tenant synthetic entities with unique markers injected via generator job; stored alongside tenant metadata.
- **Scan:** periodic job issues representative queries and asserts canaries never appear outside their tenant.
- **Alerting:** on detection, emit ops event with correlationId and structured log; feature is silent otherwise.
- **Feature flag:** `LEAK_CANARIES=true`.
- **Tests:** integration with mocked guard break that returns foreign canary and triggers alert, plus steady-state pass.

## 7. Policy Break-Glass Access

- **Endpoint:** `POST /authz/break-glass` creates short-lived token scoped to provided resources/actions with mandatory justification and optional approver.
- **Constraints:** admin-only, hard expiry cap, all use audited as critical events; automatic revocation on expiry.
- **Feature flag:** `BREAK_GLASS=true`.
- **Tests:** scope enforcement (denied outside resources), expiry enforcement, audit emission on use, and rejection when flag off.

## 8. Golden Dataset Replay Bench

- **Harness:** `scripts/bench-replay` loads golden fixtures (small default + optional large nightly) and runs ingest, search, graph neighborhood, and timeline benchmarks.
- **Output:** machine-readable JSON metrics (p50/p95 latency, memory, cache hit rates) and threshold comparison with environment-specific limits.
- **CI:** lenient thresholds for PR/CI, stricter nightly profile; CI failure on regression beyond threshold.
- **Tests:** harness unit tests and a regression fixture that intentionally exceeds thresholds to validate failing path.

## Cross-Cutting Standards

- **Observability:** metrics for each flag-guarded module; include audit + critical events on security-sensitive paths.
- **Tenancy:** every persisted artifact must bind to tenant and validation must reject cross-tenant imports/reads.
- **Schema validation:** use JSON schema or Zod equivalents aligned with existing manifest definitions; tests must cover schema drift.
- **Security:** no secrets in logs, no plaintext PII in hash material; crypto operations centrally wrapped for future HSM wiring.

## Rollout

- All scopes are feature-flagged for safe merge; defaults keep new paths inactive until enabled. Migration order: ledger store → plan cache → airgap import/export → approvals → retention → canaries → break-glass → benchmark harness.
