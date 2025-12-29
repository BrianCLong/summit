# Multi-Epic Delivery Plan for Policy, Quotas, Watermarks, Fuzzing, Schema Compatibility, DR Drill, Evidence Integrity, and Safe Deletions

This plan decomposes the eight requested epics into parallelizable workstreams with sub-agent ownership, milestones, and integration points.

## Guiding Principles

- **Zone alignment:** Keep work primarily within the Server Zone (`server/`) and supporting scripts/tests to minimize cross-zone conflicts.
- **Feature flags:** All new capabilities remain behind existing flags (`POLICY_HOT_RELOAD`, `TENANT_QUOTAS`, `WATERMARK_VERIFY`, `EVIDENCE_INTEGRITY`, `SAFE_DELETE`) to allow progressive rollout.
- **Determinism:** Favor deterministic counters, seeded randomness, and reproducible test fixtures to reduce flakes.
- **Auditability:** Emit audit/incident events for administrative actions and integrity checks; keep provenance ledgers immutable.

## Workstream A: Policy Bundle Loader/Validator

**Sub-agent:** _PolicyOps_ (backend specialist)

- **Deliverables:**
  - Policy bundle storage model with `currentPolicyVersionId` and versioned bundles.
  - Loader/validator for schema + signature/hash integrity under `server/src/policy`.
  - Admin endpoints: `POST /ops/policy/reload` (load/validate/set current) and `POST /ops/policy/rollback?toVersion=` (revert).
  - Behavior: pinned tokens/actions resolve against pinned version; unpinned follow current version.
  - Events: audit + critical events on reload/rollback; guard with `POLICY_HOT_RELOAD` + admin auth.
- **Tests:** Integration ensuring reload updates current, pinned requests stick to prior version, rollback restores previous.
- **Dependencies:** Coordinates with Workstream C for watermark policy hash comparisons.

## Workstream B: Tenant-Level Quota Enforcement

**Sub-agent:** _QuotaGuardian_ (service limits)

- **Deliverables:**
  - Config-driven quota service in `server/src/quota` honoring `TENANT_QUOTAS` flag.
  - Deterministic counters for storage bytes, evidence count, export count, job concurrency, API rate budget.
  - Middleware hooks at evidence upload finalize, export creation, and job enqueue returning standardized 429/403 with reason metadata.
  - Defaults: unlimited unless configured.
- **Tests:** Integration setting low quotas, exceeding, verifying block reason + retry guidance; counter determinism checks.
- **Dependencies:** Aligns with Workstream A (policy reload must not reset counters) and Workstream E (schema compatibility for quota config).

## Workstream C: Export Watermark Verification

**Sub-agent:** _WatermarkSentinel_ (integrity)

- **Deliverables:**
  - Read-only endpoint `POST /exports/:id/verify-watermark` under `server/src/exports`, gated by `WATERMARK_VERIFY`.
  - Parsing of watermark fields (exportId, manifestHash prefix, policyHash); compare against stored manifest and audit ledger entry.
  - Response: `{valid, manifestHash, observedWatermark, mismatches[]}` with reason codes.
- **Tests:** Fixtures/mocked extractor for valid and tampered artifacts with expected mismatch reasons.
- **Dependencies:** Consumes policy hash from Workstream A; may reuse evidence integrity utilities from Workstream G.

## Workstream D: Graph Query Fuzzing Harness

**Sub-agent:** _GraphGuardian_ (safety/QA)

- **Deliverables:**
  - Seeded RNG + corpus generator in `test/fuzz/graphGuardrails` targeting missing tenant filters, writes, cartesian explosions, deep traversals.
  - Harness to execute guardrails ensuring unsafe patterns blocked, safe reads allowed; coverage tracked by reason code.
  - Nightly full run and smaller PR subset configuration.
- **Tests:** Unit tests for corpus generators to prevent flakes; harness smoke for deterministic seeds.
- **Dependencies:** None direct; coordinate with CI (Workstream E).

## Workstream E: Schema Backward-Compatibility Checker

**Sub-agent:** _SchemaCustodian_ (tooling/CI)

- **Deliverables:**
  - `scripts/schema-compat` tool to diff current vs baseline schemas with breaking rules (removed required fields, type narrowing, enum removal, semantics tag changes).
  - CI-only gate producing human-readable report artifact; requires explicit version bump or mapping for breaking changes.
- **Tests:** Fixtures with seeded breaking change (fails) and additive change (passes) with snapshot reports.
- **Dependencies:** Provide baseline integration for Workstreams A/B schema updates.

## Workstream F: End-to-End Disaster Recovery Drill

**Sub-agent:** _DRMaestro_ (operations)

- **Deliverables:**
  - `scripts/dr-drill` automating backup → wipe → restore → invariants (tenancy isolation, export verification hook, audit ledger chain).
  - Machine-readable report + human summary; integrates with existing backup/restore commands or stubs.
  - Safety controls to forbid production runs unless explicitly configured.
- **Tests:** Unit tests for report formatting; mocked restore flow covering success and corruption detection.
- **Dependencies:** Hooks into watermark verification (Workstream C) and evidence integrity (Workstream G) for invariants.

## Workstream G: Evidence Hash Cross-Check Service

**Sub-agent:** _IntegrityWatcher_ (integrity services)

- **Deliverables:**
  - Chunked re-hashing service under `EVIDENCE_INTEGRITY`; admin endpoint `POST /ops/evidence/verify` plus scheduled job.
  - Output includes file hash, storage path, mismatch type, remediation; emits incident when enabled; rate-limited and chunked processing.
- **Tests:** Integration with tampered test file expecting mismatch; valid store passes.
- **Dependencies:** Shares storage abstractions with Workstream B (quota) and Workstream F (DR drill checks).

## Workstream H: Safe Deletions Framework

**Sub-agent:** _SafeDeletionist_ (lifecycle)

- **Deliverables:**
  - Soft-delete/restore for chosen resource (comments/annotations or exports) behind `SAFE_DELETE`; fields `deletedAt`, `deletedBy`, `deleteReason` with default queries excluding deleted records.
  - Endpoints `POST /:resource/:id/delete` and `POST /:resource/:id/restore`; audit logging and permission checks.
  - Retention/purge hooks for future engine.
- **Tests:** Integration delete → not listed → restore → listed; permission checks.
- **Dependencies:** Ensure schema changes pass Workstream E compatibility checks.

## Integration & Sequencing

- **Phase 1 (Parallelizable Foundations):** A (policy), B (quota), D (fuzz harness), E (schema compat) start concurrently. E must publish baseline before A/B schema changes land.
- **Phase 2 (Integrity & Readiness):** C (watermark) consumes A; G (evidence integrity) builds on storage abstractions; D feeds nightly CI.
- **Phase 3 (Operational Resilience):** F (DR drill) leverages C & G outputs; H (safe delete) merges after E ensures compatibility and D validates queries.
- **Cutover:** Feature flags remain off by default; progressive enablement per tenant/environment with audit monitoring.

## Risk & Mitigation

- **Schema breaks:** Mitigated by Workstream E gate and version bump policy.
- **Performance impact from quotas and hashing:** Use chunking, deterministic counters, and backpressure controls; add metrics.
- **Operational safety:** Feature flags + admin auth + incident alerts for integrity mismatches.
- **Flakiness:** Seeded RNG and deterministic fixtures; CI subsets for PRs.

## Forward-Looking Enhancements

- Add policy bundle provenance signing with hardware-backed keys (YubiKey/HSM) and transparency log publishing.
- Introduce adaptive quota tuning using historical utilization with human approval gates.
- Extend fuzz harness with mutation-based learning from production query patterns (anonymized).
