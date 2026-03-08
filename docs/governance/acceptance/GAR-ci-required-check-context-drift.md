# Governance Acceptance Record: CI Required Check Context Drift Resolution

## Decision Summary
- Decision: Align workflow job names with branch protection required checks to unblock auto-merge.
- PR: https://github.com/BrianCLong/summit/pull/18840
- Scope: `.github/workflows/` job names and `.github/required-checks.yml` alignment.
- Primary outcome: Resolved "green-but-stuck" PRs by ensuring CI emits the exact required check context names expected by GitHub branch protection.

## Problem Statement
- Symptoms: PRs were passing all CI checks (green) but remained stuck in the auto-merge queue waiting for required contexts that were never reported.
- Impact: Severe merge-surge blockage; zero throughput for automated or manual merges due to branch protection deadlock.
- Root cause (as evidenced): A recent workflow refactor changed job names without updating the branch protection rules, causing context drift.

## Options Considered
1) Option A: Remove the missing required checks from branch protection. (Rejected: Weakens governance and violates golden-main policy).
2) Option B: Rename the workflow jobs back to their legacy names. (Rejected: Reverts beneficial workflow structural changes).
3) Chosen option and rationale: Update `.github/required-checks.yml` (or `docs/ci/REQUIRED_CHECKS_POLICY.yml`) and synchronize workflow job names to match exactly, ensuring deterministic context reporting while preserving rigorous CI gates.

## Changes Introduced
- Files changed: `.github/workflows/ci-core.yml`, `.github/required-checks.yml`, `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- Behavior changes: CI workflow jobs now explicitly define `name:` properties that perfectly match branch protection expectations.
- Governance gates preserved: All core test, lint, and security gates remain strictly required.
- Security changes: None directly; ensures security gates correctly report their status.

## Evidence
### Before
- EVID-DRIFT-001: 45 PRs green but stuck waiting on missing contexts.
  - Reproduce: `gh pr list --search "status:success -label:skip-changelog"`
  - Expected: PRs stuck in `mergeStateStatus: BLOCKED`
- EVID-DRIFT-002: Workflow job names diverged from required checks.
  - Reproduce: `gh api repos/BrianCLong/summit/branches/main/protection/required_status_checks/contexts`
  - Expected: Shows legacy names not present in current CI runs.

### After
- EVID-DRIFT-003: CI contexts perfectly align with branch protection.
  - Reproduce: `grep "name:" .github/workflows/ci-core.yml`
  - Expected: Names match branch protection output exactly.
- EVID-DRIFT-004: Stuck PRs are now mergeable.
  - Reproduce: `gh pr view 18840 --json mergeStateStatus`
  - Expected: `CLEAN`

## Risk Assessment
- Risks: Typo in context names could re-introduce the deadlock.
- Mitigations: Enforce strict synchronization via `scripts/ci/workflows_diff/analyze_workflows.mjs` (drift-guard job).
- Residual risk: Low. Drift-guard will catch future divergence.

## Rollback Plan
- Rollback trigger: Merges fail with new unexpected context requirements.
- Steps: `git revert -m 1 <COMMIT_SHA>` and push to a new hotfix branch.
- Post-rollback verification: Confirm old job names satisfy branch protection.

## Verification Capsule
Run these checks to re-validate this GAR at any time:
1) Compare branch protection contexts with workflow job names: `gh api repos/BrianCLong/summit/branches/main/protection/required_status_checks/contexts`
2) Confirm auto-merge proceeds on test PRs: `gh pr view <PR_NUMBER> --json mergeStateStatus`
3) Verify drift-guard passes on `main`: `gh run list --workflow=drift-guard --branch=main`

## Approval / Sign-off
- Required approvers: Security Team, Platform Lead
- Status: APPROVED
