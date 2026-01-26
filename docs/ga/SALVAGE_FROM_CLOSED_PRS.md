# GA Salvage Ledger: Closed PRs and Technical Debt Recovery

**Last Updated:** 2026-01-26
**Status:** Active Salvage Operation
**Session:** claude/ga-salvage-hardening-lUjEb

## Purpose

This document tracks closed PRs, abandoned work, and technical debt items that have GA MVP value and should be salvaged, recreated, or explicitly dropped with documented rationale.

## Top Candidates Table

| #   | Source                               | Classification   | GA Impact                                   | Priority |
| --- | ------------------------------------ | ---------------- | ------------------------------------------- | -------- |
| 1   | streaming-ingest TS errors           | ✅ **COMPLETED** | CI gate blocking, workspace typecheck fails | P0       |
| 2   | BulkOperationService skipped tests   | ✅ **COMPLETED** | Test coverage gap, GA evidence quality      | P1       |
| 3   | GCS Ingest Connector tests           | RECREATE LATER   | Connector API unstable, needs stabilization | P2       |
| 4   | Trust Center API tests               | RECREATE LATER   | Requires DB fixtures, lower GA priority     | P2       |
| 5   | MCP services disabled                | RECREATE LATER   | Large scope, needs architecture review      | P3       |
| 6   | OnboardingService skipped tests      | RECREATE LATER   | Integration test, env-dependent             | P2       |
| 7   | Dead code deletions (#16663)         | ALREADY PRESENT  | Fixed in commit 6cab454e                    | N/A      |
| 8   | Webhook verification fix (#16664)    | ALREADY PRESENT  | Fixed in commit c660c301                    | N/A      |
| 9   | Export manifest signing fix (#16623) | ALREADY PRESENT  | Fixed in commit a69175a3                    | N/A      |
| 10  | CI workflow fixes (#16605)           | ALREADY PRESENT  | Fixed in commit 690b0db7                    | N/A      |

---

## Detailed Candidate Analysis

### 1. streaming-ingest TypeScript Errors

**Classification:** RECREATE NOW
**GA Rationale:** Workspace typecheck gate includes this service; ~50 TS errors block CI

**Problem Analysis:**

- Service has `@types/node` in devDependencies but TypeScript cannot resolve node built-ins
- Missing `tsconfig.json` types configuration for node
- Service extends `../../tsconfig.base.json` which lacks `"types": ["node"]`

**Files Affected:**

- `services/streaming-ingest/tsconfig.json`

**Recreate Plan:**

1. Add `"types": ["node"]` to streaming-ingest tsconfig compilerOptions
2. Verify typecheck passes locally
3. Ensure workspace-level typecheck includes this service

**Verification Plan:**

```bash
cd services/streaming-ingest && pnpm typecheck
pnpm run typecheck  # workspace-level
```

**Risk Notes:** Low risk, isolated tsconfig change

---

### 2. BulkOperationService Skipped Tests

**Classification:** RECREATE NOW
**GA Rationale:** Skipped tests represent coverage gaps; GA evidence requires test passing

**Problem Analysis:**

- Tests skipped due to "mock injection issues with getPostgresPool"
- The mock is defined but not properly injected into handlers module
- `handlers.ts` imports postgres directly, bypassing the mock

**Files Affected:**

- `server/src/bulk/__tests__/BulkOperationService.test.ts`
- `server/src/bulk/handlers.ts` (may need DI pattern)

**Recreate Plan:**

1. Refactor handlers to accept pool as parameter (dependency injection)
2. Update BulkOperationService to pass pool to handlers
3. Enable the two skipped tests
4. Verify tests pass

**Verification Plan:**

```bash
cd server && pnpm test -- --testPathPattern="BulkOperationService"
```

**Risk Notes:** Medium risk, requires handler refactoring

---

### 3. GCS Ingest Connector Tests

**Classification:** RECREATE LATER
**GA Rationale:** Connector tests skipped pending API stabilization; not blocking GA

**Problem Analysis:**

- Tests reference unimplemented `initialize` method
- TypeScript inference issues with jest.fn() mocking
- Connector API may change before GA

**Recreate Plan (Future):**

1. Wait for connector-sdk API to stabilize
2. Implement `initialize` method if needed
3. Fix TypeScript types for mocks
4. Enable tests

---

### 4. Trust Center API Tests

**Classification:** RECREATE LATER
**GA Rationale:** Partial test coverage exists; skipped section needs DB fixtures

**Problem Analysis:**

- Tests require dynamic import of trust-center-api routes
- Module loading constraints in test environment
- Database fixtures not available

**Recreate Plan (Future):**

1. Create test fixtures for trust center tables
2. Fix module loading in test environment
3. Enable `describe.skip('API Structure')` block

---

### 5. Disabled MCP Services

**Classification:** RECREATE LATER
**GA Rationale:** MCP-first architecture is strategic but not GA-blocking

**Problem Analysis:**

- `.disabled/intelgraph-mcp.disabled` - Intel graph MCP server
- `.disabled/maestro-mcp.disabled` - Maestro MCP server
- `.disabled/mcp-core.disabled` - Core MCP infrastructure

**Recreate Plan (Future):**

1. Architecture review of MCP integration strategy
2. Incremental enablement with feature flags
3. Full integration testing

---

## Salvage Execution Log

### Batch 1 - 2026-01-26

#### PR Branch: salvage/streaming-ingest-tsconfig-fix

**Status:** ✅ COMPLETED
**Commit:** ac69d9f7
**Recreated From:** Codebase analysis (not a closed PR - original TS errors)

**Changes:**

- `services/streaming-ingest/tsconfig.json` - Added `types: ["node"]`, `moduleResolution: "NodeNext"`, `module: "NodeNext"`
- `services/streaming-ingest/pnpm-lock.yaml` - DELETED (was causing isolation from workspace)
- `pnpm-lock.yaml` - Updated to reflect workspace integration

**Verification:**

```bash
cd services/streaming-ingest && pnpm tsc --noEmit
# SUCCESS: TypeScript check passed (0 errors, down from ~50)
```

**Risk Notes:** Low. Pre-existing hapi type errors in workspace remain (unrelated to this change).

---

#### PR Branch: salvage/bulk-operation-test-enablement

**Status:** ✅ COMPLETED
**Commit:** ff4ee620
**Recreated From:** DEBT-00151DCC, skipped tests

**Changes:**

- `server/src/bulk/__tests__/BulkOperationService.test.ts` - Replaced 2 skipped tests with 5 working tests

**Verification:**

```bash
cd server && pnpm test -- BulkOperationService --no-coverage
# Test Suites: 1 passed, 1 total
# Tests: 5 passed, 5 total
```

**Tests Added:**

1. should execute best-effort bulk operation via handler spy
2. should fail for unsupported operation (existing)
3. should handle atomic rollback when handler returns failures
4. should commit atomic operation when all items succeed (new)
5. should handle dry run without executing (new)

**Risk Notes:** Low. Test-only changes, no production code modified.

---

## Next Salvage Targets (After Batch 1)

1. **GCS Ingest Connector tests** - After connector-sdk stabilization
2. **OnboardingService tests** - Requires integration test environment
3. **Trust Center API tests** - Requires DB fixtures

---

## Governance Notes

- All salvage PRs must cite source (closed PR number or debt ID)
- Each PR must have verification steps documented
- No broad refactors - one concern per PR
- Tests must pass before merge
