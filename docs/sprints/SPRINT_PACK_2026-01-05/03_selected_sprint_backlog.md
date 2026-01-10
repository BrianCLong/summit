# Selected Sprint Backlog (Ordered)

## P0 — Release Blockers (Must Fix)

### 1) Immutable audit log persistence + tamper-evidence (GA blocker)

- **Problem:** `docs/roadmap/STATUS.json` marks C2 as incomplete; audit logging is console-only and not append-only.
- **Why it matters:** GA compliance and forensic integrity require immutable, verifiable audit trails.
- **Acceptance criteria:**
  - Append-only persistence implemented for audit events.
  - Tamper-evident chaining (hash chain) recorded per event batch.
  - Policy-as-code enforcement for audit write failures (deny or queue with governed exception).
- **Verification:**
  - New unit/integration tests in `server/src/audit/**`.
  - `pnpm --filter intelgraph-server test -- --runTestsByPath <new tests>`.
  - Evidence captured in `05_test_and_verification_plan.md`.
- **Owner role:** backend + security.
- **Estimated effort:** Large.
- **Dependencies:** `server/src/provenance/`, `server/src/audit/`, policy enforcement.

### 2) Server test suite blockers (Jest + TS)

- **Problem:** `pnpm --filter intelgraph-server test` fails with multiple TS/runtime errors (see inventory items 1–12).
- **Why it matters:** CI gates block merges and release readiness.
- **Acceptance criteria:**
  - All referenced tests compile and run.
  - No `TS2305`/`TS7006`/`TS2345`/runtime import errors remain in the listed tests.
- **Verification:**
  - `pnpm --filter intelgraph-server test`.
- **Owner role:** backend.
- **Estimated effort:** Medium.
- **Dependencies:** Type exports, mock updates, logger contract.

## P1 — Security + Reliability (Should Fix)

### 3) Auth contract alignment for `scopes`

- **Problem:** Auth tests fail because `User` now requires `scopes` and mocks are stale.
- **Why it matters:** Authorization correctness and regression prevention.
- **Acceptance criteria:**
  - Update mocks and any runtime creation sites to include `scopes`.
  - Add regression test to ensure `scopes` presence enforcement.
- **Verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/middleware/auth.test.ts src/services/__tests__/AuthService.test.ts`.
- **Owner role:** backend.
- **Estimated effort:** Small.
- **Dependencies:** None.

### 4) Repo tests: pg mock shape + implicit any

- **Problem:** `ProductIncrementRepo` tests fail with `this.pg.query is not a function`, plus implicit `any` in repo tests.
- **Why it matters:** Data integrity and repository correctness are foundational to releases.
- **Acceptance criteria:**
  - Align pg mock shape with `QueryablePool` expectations.
  - Explicitly type `call` in repo tests to satisfy TS.
- **Verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/repos/__tests__/ProductIncrementRepo.test.ts src/repos/__tests__/EntityRepo.test.ts src/repos/__tests__/RelationshipRepo.test.ts`.
- **Owner role:** backend.
- **Estimated effort:** Small/Medium.
- **Dependencies:** None.

### 5) OTel tracer initialization guard

- **Problem:** `getTracer` fails during strategic framework test setup.
- **Why it matters:** Observability instrumentation must not break core services.
- **Acceptance criteria:**
  - Safe tracer initialization with fallback no-op tracer.
  - Unit coverage ensuring tracer failure does not crash service.
- **Verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/services/strategic-framework/__tests__/StrategicFramework.test.ts`.
- **Owner role:** backend + observability.
- **Estimated effort:** Small.
- **Dependencies:** None.

### 6) Governance acceptance test alignment

- **Problem:** `tests/governance-acceptance.test.ts` references missing exports and undefined drivers.
- **Why it matters:** Governance enforcement is a release-grade compliance guardrail.
- **Acceptance criteria:**
  - Export `app` and provide test harness access to `pool`/`neo4jDriver` (or refactor test to use supported helpers).
  - Tests compile and execute.
- **Verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath tests/governance-acceptance.test.ts`.
- **Owner role:** backend + security.
- **Estimated effort:** Medium.
- **Dependencies:** Core app exports, db helpers.

## P2 — Opportunistic Wins (Only if bandwidth allows)

### 7) Remove sample AWS key from runtime code

- **Problem:** `server/src/routes/data-residency.ts` embeds a sample `AKIA` key.
- **Why it matters:** Avoid false positives and guard against accidental secret scanning alerts.
- **Acceptance criteria:**
  - Replace with neutral placeholder or config-driven example string.
- **Verification:**
  - `rg -n "AKIA[0-9A-Z]{16}" -S` shows no runtime path hits under `server/src/`.
- **Owner role:** backend + security.
- **Estimated effort:** Small.
- **Dependencies:** None.

### 8) Fix test-only type mismatches (anomalies + proof-carrying)

- **Problem:** `AnomalyDetector.comprehensive.test.ts` timestamp type mismatch; `proof-carrying-publishing.test.ts` tmpdir usage mismatch.
- **Why it matters:** Improves CI signal and test hygiene.
- **Acceptance criteria:**
  - Tests compile with correct types and APIs.
- **Verification:**
  - `pnpm --filter intelgraph-server test -- --runTestsByPath src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts src/publishing/__tests__/proof-carrying-publishing.test.ts`.
- **Owner role:** backend.
- **Estimated effort:** Small.
- **Dependencies:** None.
