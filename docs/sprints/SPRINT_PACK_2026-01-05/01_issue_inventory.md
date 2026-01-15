# Issue Inventory (Evidence-Based)

This inventory is derived from direct repo inspection and executed commands. Evidence is cited by command and file path.

## Evidence Commands Executed

- `pnpm --filter intelgraph-server test` (failed; multiple compile/runtime errors).
- `rg -n "AKIA[0-9A-Z]{16}" -S` (detected sample AWS keys in runtime and test fixtures).
- `pnpm audit --prod` (deferred pending audit completion; command did not return in time).
- `ls .github/workflows` (confirmed CI gating files exist, including `pr-quality-gate.yml`).

## Build / Test Failures (Release Blockers)

1. **OpenTelemetry tracer initialization failure**
   - Evidence: `src/services/strategic-framework/StrategicPlanningService.ts:43` throws `getTracer is not a function` during `src/services/strategic-framework/__tests__/StrategicFramework.test.ts`.

2. **Type export drift in threat hunting tests**
   - Evidence: `src/hunting/__tests__/ThreatHuntingOrchestrator.test.ts` expects `HypothesisGenerationOutput`, `QueryGenerationOutput`, `ResultAnalysisOutput` from `src/hunting/types` that are not exported.

3. **Governance acceptance test type failures**
   - Evidence: `tests/governance-acceptance.test.ts` references `app`, `pool`, `neo4jDriver` that are not exported or defined (TS2305/TS2552).

4. **Repository unit tests failing due to mock shape mismatch**
   - Evidence: `src/repos/__tests__/ProductIncrementRepo.test.ts` fails with `this.pg.query is not a function` in `src/repos/ProductIncrementRepo.ts` paths.

5. **Implicit any in repo tests**
   - Evidence: `src/repos/__tests__/RelationshipRepo.test.ts` and `src/repos/__tests__/EntityRepo.test.ts` have `TS7006` implicit any errors on `mockPgClient.query.mock.calls.find((call) => ...)`.

6. **Anomaly detector test type mismatch**
   - Evidence: `src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts` uses string timestamps; `TimeSeriesPoint.timestamp` expects number.

7. **Proof-carrying publishing test mismatch**
   - Evidence: `src/publishing/__tests__/proof-carrying-publishing.test.ts` error `Expected 0 arguments, but got 1` at `tmpdir()` usage.

8. **Auth middleware and AuthService tests missing required `scopes`**
   - Evidence: `tests/middleware/auth.test.ts` and `src/services/__tests__/AuthService.test.ts` fail because `User` now requires `scopes` (see `src/services/AuthService.ts:104`).

9. **Postgres test mocks failing with `never` typed jest mocks**
   - Evidence: `src/db/__tests__/postgres.test.ts` TS2345 on `pool.connect`/`mockRejectedValue` types.

10. **Vitest imports failing under Jest type environment**
    - Evidence: `src/provenance-integrity-gateway/__tests__/ProvenanceIntegrityGateway.test.ts` and `src/cognitive-security/__tests__/cognitive-security.test.ts` cannot import vitest globals.

11. **Audit system logger contract mismatch**
    - Evidence: `tests/integration/auth.integration.test.ts` fails with `logger.child is not a function` at `src/audit/AuditTimelineRollupService.ts:49`.

12. **Implicit any in conductor edge pipeline**
    - Evidence: `src/conductor/edge/claim-sync.ts:590` uses `operationsData.map((data) => ...)` with `data` implicitly any, failing in `src/conductor/edge/__tests__/offline-kit-acceptance.test.ts`.

## Security / Compliance Observations

1. **Sample AWS access keys in runtime code**
   - Evidence: `server/src/routes/data-residency.ts:191` contains `accessKey: 'AKIAIOSFODNN7EXAMPLE'`.
   - Note: These appear to be examples, but runtime code containing sample keys can be misused or misinterpreted by scanners. Treat as a high-signal cleanup.

2. **Sample AWS keys in tests/fixtures**
   - Evidence: `scripts/test-gitleaks-blocking.sh`, `packages/dlp-core/__tests__/DetectionEngine.test.ts`, `tools/secretsentry/tests/...` etc. These are legitimate test fixtures and should be labeled and fenced to avoid accidental leakage.

3. **OPA policy evaluation errors during tests**
   - Evidence: `pnpm --filter intelgraph-server test` logs `OPA policy evaluation failed` from `intelgraph-api` while tests still pass in `src/middleware/__tests__/opa-enforcer.test.ts`.
   - Impact: Policy evaluation failures must be explicitly handled, logged, and covered by governance acceptance tests.

## Release / CI Governance

- CI gating references are present: `.github/workflows/pr-quality-gate.yml`, `ga-ready.yml`, `ga-release.yml`.
- GA blocker declared in `docs/roadmap/STATUS.json`: `C2: Immutable Audit Log must be completed for GA compliance`.

## Dependency / Audit Status

- `pnpm audit --prod` did not complete in this environment; audit is **Deferred pending audit completion**. Re-run in CI or with network allowances and capture the results.
