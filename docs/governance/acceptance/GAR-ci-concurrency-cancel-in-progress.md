# Governance Acceptance Record: CI Concurrency and Load-Shedding

## Decision Summary
- Decision: Implement concurrency groups with `cancel-in-progress` to shed redundant CI load during merge surges.
- PR: https://github.com/BrianCLong/summit/pull/18841
- Scope: `.github/workflows/*.yml` concurrency configurations.
- Primary outcome: Reduced CI queue pressure and faster feedback loops by automatically cancelling obsolete workflow runs on PR updates.

## Problem Statement
- Symptoms: CI queues backing up by 45+ minutes during high-velocity merge windows.
- Impact: Developer productivity drop, delayed time-to-merge, and high GitHub Actions runner costs.
- Root cause (as evidenced): Pushing multiple commits to a PR in rapid succession triggered stacked, full-length CI runs without cancelling previous, now-obsolete runs.

## Options Considered
1) Option A: Increase runner provisioning limits. (Rejected: High cost, treats the symptom not the root cause).
2) Option B: Add path filtering to skip CI. (Rejected: High risk of missing critical feedback on overlapping changes).
3) Chosen option and rationale: Implement native GitHub Actions `concurrency` groups using `github.ref` to cancel in-progress runs for the same PR.

## Changes Introduced
- Files changed: All core workflows in `.github/workflows/`
- Behavior changes: Added `concurrency: group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}, cancel-in-progress: true`.
- Governance gates preserved: The latest commit must still pass all required gates; no checks are skipped for the final mergeable state.
- Security changes: None.

## Evidence
### Before
- EVID-LOAD-001: High CI queue wait times and parallel redundant runs.
  - Reproduce: `gh run list --status in_progress` during a surge.
  - Expected: Multiple runs for the same PR and same workflow.

### After
- EVID-LOAD-002: Workflow files contain correct concurrency blocks.
  - Reproduce: `grep -A 2 "concurrency:" .github/workflows/*.yml`
  - Expected: Shows `cancel-in-progress: true` tied to PR number.
- EVID-LOAD-003: Previous runs are successfully cancelled upon new push.
  - Reproduce: Push twice to a test PR and check `gh run list`.
  - Expected: First run transitions to `cancelled`, second run executes.

## Risk Assessment
- Risks: Cancelling a run might obscure intermittent test failures (flakiness).
- Mitigations: Scheduled full runs (e.g., nightly) do not use cancel-in-progress, ensuring full baseline test execution regardless of commit velocity.
- Residual risk: Low. The latest commit is always fully validated.

## Rollback Plan
- Rollback trigger: CI fails to report status back to PR due to cancellation race conditions.
- Steps: `sed -i 's/cancel-in-progress: true/cancel-in-progress: false/g' .github/workflows/*.yml` and merge.
- Post-rollback verification: Push twice and confirm both runs complete.

## Verification Capsule
Run these checks to re-validate this GAR at any time:
1) Check for presence of concurrency blocks: `grep -A 2 "concurrency:" .github/workflows/ci-core.yml`
2) Confirm cancellation works: Push to a PR, wait 30 seconds, push again, verify the first run is cancelled.
3) Confirm final merge requires a successful, uncancelled run.

## Approval / Sign-off
- Required approvers: Platform Lead
- Status: APPROVED
