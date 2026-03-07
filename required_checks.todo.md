# Required Checks Discovery TODO

## Purpose
This document records how to align GitHub branch protection required checks with actual workflow job names.

## Current temporary required-check map
- `CI Verify Gate ✅`
- `Evidence Contracts`
- `Security Scan`
- `Policy Compliance`
- `GA Evidence Completeness`

## Discovery steps
1. Open **GitHub → Settings → Branches → Branch protection rules** for `main`.
2. Read the **Required status checks** list and copy exact names.
3. Compare exact names to workflow job names in `.github/workflows/*.yml`.
4. If mismatch exists, submit rename-only PR that preserves behavior while matching protected-check names.
5. Re-run PR checks and confirm `Expected — Waiting for status to be reported` no longer appears.

## API fallback
Use API to retrieve exact required checks:

```bash
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks
```

## Rename plan (if mismatch is found)
- Keep stable gate job: `CI Verify Gate ✅`.
- Keep evidence gate job: `Evidence Contracts`.
- Rename any drifted jobs in `.github/workflows/ci-verify.yml` to exact protected names.
- Reconcile docs in this file in the same PR.
