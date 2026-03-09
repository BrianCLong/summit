# CI Bootstrap Failure Analysis (Git exit code 128)

## 1. Root Cause Analysis

Across multiple active PRs and sessions, `git` commands executed within GitHub Actions are consistently failing with **exit code 128**.

Based on reviewing `.github/workflows` and related automation scripts (like the recently merged `branch-ownership.yml` / `branch_ownership_enforcer.ts`), the common denominator for `exit code 128` during PRs using `actions/checkout` or subsequent `git diff` / `git rev-parse` commands revolves around running git commands in a shallow clone or detached head state without appropriate configurations or depth.

1. **Missing History / Shallow Clones (`fetch-depth`)**:
   By default, `actions/checkout@v4` fetches only a single commit (depth 1).
   Any script running `git diff HEAD~1 HEAD` or attempting to traverse history, such as `branch_ownership_enforcer.ts` in the `branch-ownership.yml` workflow, will fail with code 128 if the commit `HEAD~1` is not fetched.

2. **Detached HEAD**:
   In `pull_request` events, GitHub actions check out a merge commit (a detached head `refs/pull/PR_NUMBER/merge`). A naive script attempting to run `git rev-parse --abbrev-ref HEAD` will return `HEAD` and might fail or crash logic down the line. It won't directly return `128` unless passing that to another command, but `git diff HEAD~1 HEAD` will fail with code 128 if the tree is detached or shallow.

3. **Workspace Issues**:
   If actions run `make bootstrap` outside the checkout directory, or if scripts implicitly assume git is configured to trust the directory (`git config --global --add safe.directory *`), git throws 128 "fatal: dubious ownership in repository" or similar workspace errors.

## 2. Fix Matrix by Workflow Family

| Workflow / Script | Failure Point | Required Fix |
|-------------------|-----------------------------|----------------------------------------------------|
| `scripts/governance/branch_ownership_enforcer.ts` | `git diff --name-only HEAD~1 HEAD` | In PRs, diff against `origin/$GITHUB_BASE_REF` instead of `HEAD~1`, since `HEAD~1` on a detached PR merge commit may refer to an arbitrary base commit or fail. |
| workflows using `actions/checkout` requiring diffs | `git` diff commands fail | Ensure `fetch-depth: 0` is set if history traversal is needed, OR strictly fetch the base ref explicitly. |
| Workflows modifying git config | `git config` failures | Add `git config --global --add safe.directory '*'` for scripts executing within Docker containers or alternate users. |

## 3. Recommended Minimal Fix

1. Update `scripts/governance/branch_ownership_enforcer.ts` to properly identify changed files for PRs using GitHub context/API or a safer Git comparison (`git diff --name-only origin/${process.env.GITHUB_BASE_REF} HEAD`).
2. Alternatively, switch file change detection in PR-related TS scripts to use `gh pr diff --name-only` or `@actions/github` instead of raw git commands to avoid checkout state edge cases.

## Fix Implemented (March 2026)

- Identified missing `fetch-depth` configurations in workflows calling `git log`, `git rev-parse HEAD`, `git fetch`, and `git diff`.
- Added `fetch-depth: 0` to `actions/checkout` in `.github/workflows/reproducibility.yml`, `.github/workflows/workflow-validity.yml`, `.github/workflows/supply-chain-delta.yml`, `.github/workflows/release-readiness.yml`, `.github/workflows/governance-lockfile-verify.yml`, `.github/workflows/governance-regression-guard.yml`, `.github/workflows/reusable/package.yml`, and `.github/workflows/_reusable-package.yml`.
