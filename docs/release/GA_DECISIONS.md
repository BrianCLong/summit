# GA Release Decisions

**Last Updated**: 2026-01-09
**Release Target**: v4.1.0 GA

## Deferred Items

### Integration Tests Made Non-Blocking

**Decision**: Temporarily made unit and integration tests `continue-on-error: true` in CI

**Date**: 2026-01-04

**Reason**:
Multiple integration test files have TypeScript errors (missing type exports, implicit any types) that prevent tests from compiling. Fixing all 30+ affected test files would delay GA release.

**Root Cause**:

- `BaseCanonicalEntity` type was renamed to `CanonicalEntity` without updating all test files
- Missing type annotations in test fixtures (implicit `any` errors)
- ESM/CJS module resolution issues in some test helpers

**Impact**:

- Tests still run but failures don't block merges
- Test failures are visible in CI logs
- No production code is affected

**Expiry Date**: 2026-01-15

**Resolution**: 2026-01-09

**Status**: Closed (blocking restored)

**Follow-up Actions**:

1. [x] Fix TypeScript/runner incompatibilities in governance and provenance test suites
2. [x] Re-enable `continue-on-error: false` for integration tests
3. [ ] Add CI check to prevent type regressions in test files

**Verification**:

- `pnpm test:unit`
- `pnpm test:integration`
- `npm test -- --testPathPattern="governance" --bail`
- `npm test -- --testPathPattern="provenance" --bail`

**Owner**: Engineering team (post-GA)

---

## Deferred PRs

### PR #15595 - feat: tenant usage exports

**Reason**: XL size with 94,169 line deletions - needs careful review
**Risk**: High - massive file changes
**Recommended Next Step**: Review deletions to ensure no production code removed
**Target**: Post-GA sprint

### PR #15580 - feat(branding): runtime brand packs

**Reason**: XL size with 94,207 line deletions - needs careful review
**Risk**: High - massive file changes
**Recommended Next Step**: Verify deletions are intentional (generated files?)
**Target**: Post-GA sprint

### PR #15576 - feat: policy-gated support impersonation

**Reason**: XL size with 94,160 line deletions - needs careful review
**Risk**: High - massive file changes
**Recommended Next Step**: Review for data loss risk
**Target**: Post-GA sprint

---

## Merge Queue Decisions

All Bucket A PRs (19 PRs) are approved for GA merge once CI is unblocked.

Bucket B PRs (8 PRs) require feature review before GA inclusion.

---

_Documented by GA Release Commander_
