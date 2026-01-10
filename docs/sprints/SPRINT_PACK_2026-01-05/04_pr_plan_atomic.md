# Atomic PR Plan

All PRs must include the AGENT-METADATA block from `.github/PULL_REQUEST_TEMPLATE.md`, reference the prompt hash registered in `prompts/registry.yaml`, and pass `scripts/ci/verify-prompt-integrity.ts` plus `scripts/ci/validate-pr-metadata.ts`.

## PR 1: fix(server/tests): stabilize auth contract + scope requirements

- **Scope:** Update test fixtures and mocks to include `scopes` in `User` and align auth tests to the current contract.
- **Files likely touched:**
  - `tests/middleware/auth.test.ts`
  - `src/services/__tests__/AuthService.test.ts`
  - `src/services/AuthService.ts` (if contract exposure is missing)
- **Acceptance criteria:**
  - Auth tests compile and pass; `scopes` is required and verified.
- **Tests/verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/middleware/auth.test.ts src/services/__tests__/AuthService.test.ts`
- **Risk level:** Low.
- **Rollback plan:** Revert test fixture changes; keep contract intact.
- **Merge gate:** `pr-quality-gate.yml`, `ga-ready.yml`, `scripts/check-boundaries.cjs`.

## PR 2: fix(server/repos): align pg mocks + eliminate implicit any

- **Scope:** Align mocked `QueryablePool` to expected shape, and explicitly type test helpers.
- **Files likely touched:**
  - `src/repos/__tests__/ProductIncrementRepo.test.ts`
  - `src/repos/__tests__/EntityRepo.test.ts`
  - `src/repos/__tests__/RelationshipRepo.test.ts`
- **Acceptance criteria:**
  - Repo tests compile without TS7006/`this.pg.query` failures.
- **Tests/verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/repos/__tests__/ProductIncrementRepo.test.ts src/repos/__tests__/EntityRepo.test.ts src/repos/__tests__/RelationshipRepo.test.ts`
- **Risk level:** Low/Medium (test-only changes).
- **Rollback plan:** Revert test updates; no runtime impact.
- **Merge gate:** `pr-quality-gate.yml`, `ga-ready.yml`.

## PR 3: fix(observability): guard tracer initialization

- **Scope:** Add safe tracer initialization with fallback no-op tracer in strategic framework service.
- **Files likely touched:**
  - `src/services/strategic-framework/StrategicPlanningService.ts`
  - `src/services/strategic-framework/__tests__/StrategicFramework.test.ts`
- **Acceptance criteria:**
  - Tracer initialization never throws; tests pass.
- **Tests/verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/services/strategic-framework/__tests__/StrategicFramework.test.ts`
- **Risk level:** Low.
- **Rollback plan:** Revert to prior tracer init if required.
- **Merge gate:** `pr-quality-gate.yml`.

## PR 4: fix(governance): make acceptance harness compile

- **Scope:** Export `app` and provide supported access to db drivers or refactor tests to helper APIs.
- **Files likely touched:**
  - `src/app.ts` (or equivalent entrypoint)
  - `tests/governance-acceptance.test.ts`
  - `src/db/**` helper modules
- **Acceptance criteria:**
  - Governance acceptance test compiles and executes.
- **Tests/verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/governance-acceptance.test.ts`
- **Risk level:** Medium (test harness touches core app exports).
- **Rollback plan:** Revert test harness changes, keep app interface stable.
- **Merge gate:** `pr-quality-gate.yml`, `governance-check.yml`.

## PR 5: fix(audit): immutable audit log with tamper-evident hashing

- **Scope:** Implement append-only persistence and hash chaining; integrate policy-as-code for failure handling.
- **Files likely touched:**
  - `server/src/audit/**`
  - `server/src/provenance/**`
  - `server/src/policies/**`
  - `server/src/services/**` (if audit interfaces are shared)
- **Acceptance criteria:**
  - Audit writes are persisted, chained, and verified.
  - Failure handling is policy-driven and recorded.
- **Tests/verification:**
  - `AUDIT_TEST_PATHS="server/src/audit/__tests__/AuditPersistence.test.ts server/src/audit/__tests__/AuditHashChain.test.ts" pnpm --filter intelgraph-server test -- --runTestsByPath $AUDIT_TEST_PATHS`
  - `make smoke` (post-change, in CI).
- **Risk level:** High.
- **Rollback plan:** Feature flag the new audit sink; keep a Governed Exception path for safe fallback.
- **Merge gate:** `ga-ready.yml`, `release-integrity.yml`, `supply-chain-integrity.yml`.

## PR 6: chore(security): remove sample AWS key from runtime code

- **Scope:** Replace sample AKIA string under `server/src/routes/data-residency.ts` with neutral placeholder/config.
- **Files likely touched:**
  - `server/src/routes/data-residency.ts`
- **Acceptance criteria:**
  - No runtime `AKIA` example remains in `server/src/`.
- **Tests/verification:**
  - `rg -n "AKIA[0-9A-Z]{16}" -S server/src`
- **Risk level:** Low.
- **Rollback plan:** Revert placeholder if required.
- **Merge gate:** `secret-scan-warn.yml` (signal only) + `pr-quality-gate.yml`.

## PR 7: fix(tests): clean remaining type mismatches

- **Scope:** Fix anomaly detector and proof-carrying publishing test type/API mismatches; address vitest imports if needed.
- **Files likely touched:**
  - `src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts`
  - `src/publishing/__tests__/proof-carrying-publishing.test.ts`
  - `src/provenance-integrity-gateway/__tests__/ProvenanceIntegrityGateway.test.ts`
  - `src/cognitive-security/__tests__/cognitive-security.test.ts`
- **Acceptance criteria:**
  - Tests compile and run in Jest environment.
- **Tests/verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts src/publishing/__tests__/proof-carrying-publishing.test.ts src/provenance-integrity-gateway/__tests__/ProvenanceIntegrityGateway.test.ts src/cognitive-security/__tests__/cognitive-security.test.ts`
- **Risk level:** Low.
- **Rollback plan:** Revert test changes.
- **Merge gate:** `pr-quality-gate.yml`.

---

## PR #1–#3: start here

1. **PR 1: fix(server/tests): stabilize auth contract + scope requirements**
2. **PR 2: fix(server/repos): align pg mocks + eliminate implicit any**
3. **PR 3: fix(observability): guard tracer initialization**

These three PRs are high-impact, low-risk, and restore CI signal quickly.
