# Prompt: Branch Protection GitHub App Authentication

## Objective

Enable branch protection drift workflows to read GitHub branch protection settings by authenticating with a GitHub App installation token, while preserving existing drift logic and reconciliation safeguards.

## In Scope

- .github/workflows/branch-protection-drift.yml
- .github/workflows/branch-protection-reconcile.yml (plan mode auth section)
- docs/ci/BRANCH_PROTECTION_DRIFT.md
- docs/roadmap/STATUS.json

## Out of Scope

- Drift detection logic changes
- Exception handling modifications
- Policy definition updates

## Required Changes

- Generate GitHub App token using actions/create-github-app-token@v1.
- Use the GitHub App token for read-only drift checks.
- Provide a fallback to GITHUB_TOKEN when the app token cannot be generated.
- Document required repository secrets (App ID + private key) and workflow behavior.
- Update roadmap status metadata to reflect the change.

## Validation

- Run scripts/check-boundaries.cjs.
- Record verification steps and rollback plan in PR metadata.
