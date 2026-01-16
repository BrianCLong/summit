# Improvement Issues for #14700 Follow-up

Based on the verification of Issue #14700 (SOC control tests integration), the following improvement opportunities were identified. These should be created as separate issues for incremental enhancement.

---

## Issue Template 1: Add `if: always()` to ci-core.yml SOC artifact upload

**Title:** `chore: add if: always() to SOC artifact upload in ci-core.yml`

**Labels:** `good-first-issue`, `ci`, `governance`

**Priority:** Low

**Description:**
```markdown
## Problem

The SOC compliance report artifact upload in `.github/workflows/ci-core.yml` (line 322) is missing `if: always()`, which means artifacts won't be uploaded if the tests fail.

## Current State

**File:** `.github/workflows/ci-core.yml` lines 321-326

```yaml
- name: Upload SOC compliance reports
  uses: actions/upload-artifact@v4
  with:
    name: soc-compliance-report
    path: soc-compliance-reports
    retention-days: 90
```

## Expected State

```yaml
- name: Upload SOC compliance reports
  if: always()  # ✅ Upload even if tests fail
  uses: actions/upload-artifact@v4
  with:
    name: soc-compliance-report
    path: soc-compliance-reports
    retention-days: 90
```

## Why This Matters

Compliance reports are most valuable when tests fail - we need the artifact to debug what went wrong. The `if: always()` ensures artifacts are uploaded regardless of test outcome.

## Context

- `.github/workflows/ci.yml` already has `if: always()` (best practice reference)
- This is a defensive improvement; ci.yml provides redundancy

## Acceptance Criteria

- [ ] Add `if: always()` to line 322 in `.github/workflows/ci-core.yml`
- [ ] Verify both ci.yml and ci-core.yml use `if: always()`
- [ ] No functional changes to test execution

## Estimated Effort

1 line change, < 5 minutes
```

---

## Issue Template 2: Expand SOC control test coverage

**Title:** `enhancement: expand SOC control test coverage beyond 5 controls`

**Labels:** `enhancement`, `testing`, `governance`, `priority:ga`

**Priority:** Medium

**Description:**
```markdown
## Problem

SOC control test suite currently covers only 5 controls (CC1.1, CC2.1, CC3.1, CC4.1, CC5.1), while `compliance/control-map.yaml` defines 50+ controls.

## Current State

**File:** `server/tests/soc-controls/soc-controls.test.ts`

**Coverage:** 5 SOC controls
- CC1.1: Control environment
- CC2.1: Communication and information
- CC3.1: Risk assessment
- CC4.1: Monitoring activities
- CC5.1: Control activities

## Goal

Incrementally expand test coverage to include high-priority controls from the control map.

## Suggested Approach

**Phase 1:** Add CC6.x and CC7.x controls (logical and physical access controls)
**Phase 2:** Add security-specific controls (CC7.2, CC7.3)
**Phase 3:** Add data integrity and change management controls

## References

- **Control Map:** `compliance/control-map.yaml`
- **Existing Tests:** `server/tests/soc-controls/soc-controls.test.ts`
- **Test Runner:** `scripts/test-soc-controls.sh`

## Acceptance Criteria

- [ ] Identify priority controls from control-map.yaml
- [ ] Implement tests for at least 5 additional controls
- [ ] All tests pass in CI
- [ ] Update gate documentation with new coverage metrics

## Estimated Effort

Medium - depends on control complexity and evidence gathering
```

---

## Issue Template 3: Add SOC control tests to required status checks

**Title:** `policy: add SOC control tests to required status checks`

**Labels:** `policy`, `governance`, `branch-protection`

**Priority:** Medium

**Description:**
```markdown
## Problem

SOC control tests run in CI but are not configured as required status checks. This means PRs can be merged even if SOC control tests fail.

## Current State

**Status:** Tests run in CI but don't block merges

**Workflows:**
- `.github/workflows/ci.yml` - "SOC Controls" job
- `.github/workflows/ci-core.yml` - "Run SOC control tests" step

**Branch Protection:** Required status checks configured per Issue #15790, but "SOC Controls" is not included

## Proposal

Add "SOC Controls" to the required status checks list in branch protection settings.

## Related Work

- **Issue #15790:** Branch protection reconciliation
- **PR #16364 (replacement):** Implements branch protection reconciliation runbook

## Discussion Points

**Should SOC control tests be required?**

**Pros:**
- Enforces compliance gates at merge time
- Prevents regressions in SOC control implementations
- Aligns with GA readiness requirements

**Cons:**
- May slow down velocity if tests are flaky
- Requires stable test suite (current coverage: 5 controls)
- Needs clear failure messaging for developers

## Recommendation

**Wait until Phase 2 (Issue Template 2)** to make SOC controls required. Once test coverage expands and stabilizes, add to required checks.

## Acceptance Criteria

- [ ] Policy decision: Should SOC controls be required? (requires governance approval)
- [ ] If yes: Add "SOC Controls" to `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- [ ] If yes: Update branch protection settings per #15790 runbook
- [ ] If yes: Verify "SOC Controls" appears in required checks API response

## Estimated Effort

Small (1 line in policy + branch protection config) - but requires policy decision
```

---

## Summary

**Total Improvement Issues:** 3

| Issue | Priority | Effort | Blocker |
|-------|----------|--------|---------|
| 1. Add `if: always()` | Low | Trivial | None |
| 2. Expand test coverage | Medium | Medium | None |
| 3. Make required check | Medium | Small | Policy decision + Issue #2 completion |

**Recommended Order:**
1. Issue #1 (quick win)
2. Issue #2 (foundation for #3)
3. Issue #3 (after #2 stabilizes)

---

**Generated by:** Claude Code Agent
**Date:** 2026-01-16
**Related Issue:** #14700 (SOC control tests - marked complete)
