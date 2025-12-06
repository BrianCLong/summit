# Test Debt Ledger

## Missing Test Suites
The following services in `server/src/services/` are missing corresponding unit tests in `server/tests/services/`:

- `AIQueueService.js`
- `AccessControl.js`
- `AdminPanelService.ts`
- `AdvancedAnalyticsService.js`
- `AlertTriageV2Service.ts`
- `AnalystDashboardService.ts`
- `ComplianceService.ts`
- `DefensivePsyOpsService.ts`
- `GraphRAGService.ts`
- `GDPRComplianceService.ts`
- `RTBFAuditService.ts`

The `server/src/maestro/` directory only has tests for `core.ts` and `cost_meter.ts` in `server/tests/maestro/`. Submodules like `pipelines`, `provenance` seem uncovered or tests are misplaced.

## Brittle Mocks
- `server/tests/services/AuthService.test.js`:
    - Mocks `pg` client via `getPostgresPool.mockReturnValue(mockPool)`.
    - Relies on manual mocking of `mockClient.query`.
    - `query` mock uses sequential `mockResolvedValueOnce` which is brittle if internal implementation changes order of queries (e.g., transaction flow).
    - Recommendation: Use a higher-level database mock or a test database container if possible, or robustify mocks to check query strings more flexibly.

## Obsolete Tests / Files
- `server/src/services/OSINTService.js.MERGED` and `OsintService.js__blob_2afe535` are backup files and should be removed.
- `server/src/services/CopilotIntegrationService.ts.rehydrated` suggests older versions.

## E2E Coverage Gaps
- `e2e/maestro.spec.ts` exists but coverage for new features like `GraphRAG` or `PsyOps` dashboards is likely missing.
- `apps/web` component testing strategy needs verification.

## Untested Invariants
- **Compliance**: No integration test ensures that deleting a user *actually* removes data from both Postgres and Neo4j (GDPR RTBF).
- **Audit**: No test verifies that the `ProvenanceLedger` is append-only/tamper-evident in a concurrent environment.
- **Tenancy**: No test explicitly verifies that a query from Tenant A cannot see data from Tenant B (Cross-Tenant Leakage).

## Plan for Recovery
1. Create `ComplianceService.test.ts` to test compliance logic.
2. Create `AlertTriageV2Service.test.ts` to test triage logic.
3. Create `Chaos.test.ts` to simulate DB failure during critical path.
4. Create `GDPRIntegration.test.ts` to verify data deletion across stores.
