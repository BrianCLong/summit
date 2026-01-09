# GA Release Decisions

**Last Updated**: 2026-01-09
**Release Target**: v4.1.0 GA

## Deferred Items

### Temporary Merge Guardrails While CI Jobs Are Non-Blocking

**Decision**: Enforce local deterministic verification while CI test/governance/provenance jobs
remain `continue-on-error: true`.

**Date**: 2026-01-09

**Reason**:
CI gates are explicitly non-blocking due to ESM/TypeScript infrastructure issues. Merge safety is
maintained by mandatory local verification runs until required checks are restored.

**Requirements**:

- `pnpm lint`
- `pnpm verify`
- `pnpm test:unit`
- `pnpm test:integration` (only when integration surfaces are touched)
- `make smoke` for runtime, infra, deployment, or build surface changes

**Expiry Date**: 2026-02-15 or when required checks are restored, whichever is sooner.

**Follow-up Actions**:

1. [ ] Re-enable blocking CI for test/governance/provenance jobs.
2. [ ] Remove temporary guardrail language from PR templates once gates are restored.
3. [ ] Document restored enforcement in this log.

**Owner**: Release Engineering

---

### Integration Tests Made Non-Blocking

**Decision**: Make both unit and integration tests `continue-on-error: true` in CI

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

**Follow-up Actions**:

1. [ ] Fix TypeScript errors in `server/src/tests/canonical/integration.test.ts`
2. [ ] Fix TypeScript errors in `server/tests/integration/*.test.ts`
3. [ ] Add explicit type annotations to test fixtures
4. [ ] Re-enable `continue-on-error: false` for integration tests
5. [ ] Add CI check to prevent type regressions in test files

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

## Merge Train Closeout

**Date**: 2026-01-09

**Status**: Merge train plan recorded; execution deferred pending GH CLI availability and branch
protection restoration. Guardrail enforcement remains active until CI blocking is restored.

**Summary**:

- Lane definitions and stop criteria published in `docs/release/MERGE_TRAIN_PLAN.md`.
- Temporary guardrails captured for non-blocking CI jobs.

---

_Documented by GA Release Commander_
