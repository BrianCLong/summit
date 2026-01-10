# Automations Implemented

> **Status**: ACTIVE
> **Updated**: 2026-03-01

The following automations have been implemented to support Quarter-1 Execution Objectives.

## 1. Trust Scorecard Updater
*   **Script**: `scripts/ops/update_trust_scorecard.ts`
*   **Command**: `npx tsx scripts/ops/update_trust_scorecard.ts`
*   **Description**: Updates `docs/security/SECURITY_SCORECARD.json` by inspecting the repository state (secrets, hygiene, test coverage).
*   **Metrics**:
    *   **Secrets Management**: Checks for committed `.env` files or known patterns.
    *   **Repo Hygiene**: Penalizes untracked/modified files.
    *   **Coverage**: Reads `coverage/coverage-summary.json` if present.
*   **Failure Mode**: Script logs errors but does not exit 1 (best effort update).

## 2. Repo Hygiene Enforcer
*   **Script**: `scripts/ops/check_repo_hygiene.ts`
*   **Command**: `npx tsx scripts/ops/check_repo_hygiene.ts`
*   **Description**: Strictly enforces repository cleanliness.
*   **Rules**:
    *   **No Untracked Files**: Fails if `git status --porcelain` shows `??`.
    *   **No Lockfile Drift**: Fails if `pnpm-lock.yaml` is modified.
    *   **Critical Files**: Ensures `GA_DEFINITION.md` exists.
*   **Failure Mode**: Exits with code 1. Blocks PR/Merge/Release if used in CI.
