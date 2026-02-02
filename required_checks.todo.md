# Required Checks Discovery (TODO)

## Goal
Identify the exact required CI check names for main branch protections.

## GitHub UI
1. Repo → Settings → Branches → Branch protection rules.
2. Note all required status checks.

## GitHub API (if permitted)
- List branch protections and required status checks.

## Temporary gates used in this PR stack
- `ci:unit` - Runs unit tests for new packages.
- `ci:lint` - Runs linting.
- `ci:evidence` - Validates evidence artifacts (schemas, determinism). Implemented by `ci/gates/verify_evidence.py`.
- `ci:security-gates` - Runs deny-by-default and redaction tests.
- `verify:dependency-delta` - Ensures dependency changes are documented.
- `summit-schema-validate` - Validates JSON schemas.

## Rename plan
Once real check names known, update CI workflow/job names to match.
