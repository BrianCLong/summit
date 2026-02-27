# Required Checks Todo List

This file tracks the status of CI check discovery and alignment with branch protection rules for INFOWAR system.

## Status
Branch protection rules for `main` require the following checks to pass before merging.

## Required Check Names
- `verify:schemas` (Matches `.github/workflows/ci-verify.yml`)
- `verify:tests` (Matches `.github/workflows/ci-verify.yml`)
- `verify:dependency-delta` (Matches `.github/workflows/ci-verify.yml`)
- `verify:never-log` (Matches `.github/workflows/ci-verify.yml`)

## Discovery Steps
1. Navigate to Repo → Settings → Branches.
2. Under "Branch protection rules", edit rule for `main`.
3. Locate "Require status checks to pass before merging".
4. Confirm exact names of new INFOWAR gates.

## Migration/Rename Plan
If GitHub UI reports different names than configured in workflows, update `.github/workflows/ci-verify.yml` to use the canonical names.
