# ESM Jest Migration Remediation Plan

**Created**: 2026-01-10
**Status**: Ready for Execution
**Owner**: TBD

## Overview

This document tracks the remediation of ~240+ test files that need ESM-compatible Jest patterns. The work is organized into two waves based on failure signature.

## Wave A: `@jest/globals` Import Migration

**Scope**: ~240 files missing `import { jest } from '@jest/globals'`

**Failure Signature**:

```
ReferenceError: jest is not defined
```

**Fix Pattern**:

```typescript
// Add at top of file
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
```

**Automation Potential**: HIGH

- Can be detected with grep: `grep -L "from '@jest/globals'" file.test.ts`
- Can be auto-fixed with codemod or sed

**Priority Files** (high-traffic/core functionality):

- [ ] `tests/graphql.test.ts`
- [ ] `tests/middleware/*.test.ts`
- [ ] `tests/auth/*.test.ts`
- [ ] `tests/db/*.test.ts`
- [ ] `src/middleware/__tests__/*.test.ts`

### Wave A File List (Sample)

```
tests/adversarial/abuse_and_bypass.test.ts
tests/api/maestro_routes.test.ts
tests/authz/admin_routes.test.ts
tests/autonomous/sandbox.test.ts
tests/cases/ReleaseCriteria.test.ts
tests/conductor/capacity-futures.test.ts
tests/conductor/receipt-usage-ledger.test.ts
tests/connectors/base.test.ts
tests/connectors/csv.test.ts
tests/contracts/serialization.test.ts
tests/data-platform/platform.test.ts
tests/db/indexing-helper.test.ts
tests/db/jobs-repo-tenant.test.ts
...
```

## Wave B: `jest.mock()` to `unstable_mockModule()` Migration

**Scope**: ~186 files using `jest.mock()` that need ESM-compatible mocking

**Failure Signatures**:

```
SyntaxError: The requested module 'X' does not provide an export named 'Y'
ReferenceError: You are trying to import a file after the Jest environment has been torn down
```

**Fix Pattern**:

```typescript
// Before
jest.mock('../module.js', () => ({...}));
import { thing } from '../module.js';

// After
jest.unstable_mockModule('../module.js', () => ({...}));
const { thing } = await import('../module.js');
```

**Automation Potential**: MEDIUM

- Detection is automatable
- Fix requires understanding module structure (default vs named exports)

**Priority Files** (blocking other tests):

- [ ] `src/middleware/__tests__/redisRateLimiter.test.ts`
- [ ] `src/middleware/__tests__/maestro-authz.test.ts`
- [ ] `src/middleware/__tests__/opa-abac.test.ts`
- [ ] `tests/middleware/rateLimit.test.ts`

### Common Module Clusters

These modules are mocked across many test files. Fixing the mock pattern once creates a template:

| Module                         | Files Using | Mock Type              |
| ------------------------------ | ----------- | ---------------------- |
| `../config/database.js`        | ~50         | Named exports          |
| `../middleware/auth.js`        | ~30         | Named exports          |
| `../services/PricingEngine.js` | ~10         | Default export         |
| `ioredis`                      | ~20         | Default export (class) |
| `jsonwebtoken`                 | ~15         | Named exports          |

## Acceptance Criteria

### Wave A Complete

- [ ] Zero remaining `ReferenceError: jest is not defined` in server tests
- [ ] All test files import from `@jest/globals`

### Wave B Complete

- [ ] Zero remaining `SyntaxError: does not provide an export` errors
- [ ] All ESM module mocks use `jest.unstable_mockModule()`
- [ ] All dependent imports use dynamic `await import()`

### Overall Complete

- [ ] `pnpm -C server test:ci` passes with zero failures
- [ ] `pnpm -C server test:unit` passes with zero failures
- [ ] No open handles detected with `--detectOpenHandles`

## Execution Strategy

### Phase 1: Core Infrastructure (Week 1)

Focus on tests that other tests depend on or that test core functionality:

- Auth/authz tests
- Database tests
- Middleware tests

### Phase 2: Batch Migration (Week 2-3)

Apply codemod for Wave A across remaining files:

```bash
# Example codemod command (to be developed)
npx jscodeshift -t codemods/add-jest-import.ts tests/**/*.test.ts
```

### Phase 3: Manual Fixes (Week 3-4)

Address Wave B files that require understanding of export shapes:

- Review each module's actual exports
- Update mock factories to match
- Convert to dynamic imports

## Tracking

### Progress Metrics

```bash
# Count remaining Wave A issues
grep -rL "from '@jest/globals'" tests/**/*.ts src/**/__tests__/*.ts 2>/dev/null | wc -l

# Count remaining Wave B issues
grep -rl "jest\.mock(" tests/**/*.ts src/**/__tests__/*.ts 2>/dev/null | wc -l
```

### CI Dashboard

- Required: `test:unit` (stable subset)
- Monitoring: `test:ci` (full suite, non-blocking)

## Reference Implementation

See `server/tests/tenants/usage/rollups.test.ts` for the canonical ESM test pattern.

See `server/tests/ESM_TESTING_GUIDE.md` for complete documentation.
