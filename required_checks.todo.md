# Required Checks Discovery & Mapping

This document outlines the steps to map CI jobs to GitHub required status checks for the Summit repository.

## UI Steps
1. Navigate to **Settings** > **Branches** in the GitHub repository.
2. Under **Branch protection rules**, select the rule for `main` (or create one).
3. Enable **Require status checks to pass before merging**.
4. Search for and select the following job names:
   - `verify` (from `evidence.yml`)
   - `gate/evidence` (temporary name)
   - `gate/supplychain` (temporary name)
   - `gate/fimi` (temporary name)

## API Steps
To list current branch protection and required checks via the GitHub CLI:
```bash
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

To update required checks:
```bash
gh api -X PATCH repos/:owner/:repo/branches/main/protection/required_status_checks \
  -f "contexts[]=verify" \
  -f "contexts[]=gate/evidence"
```

## Temporary Gate Naming
Until actual required check names are confirmed in the repo settings, the following convention is used:
- `gate/evidence`
- `gate/supplychain`
- `gate/fimi`
- `ci/shared-memory-unit`
- `ci/shared-memory-policy`
- `ci/shared-memory-determinism`
- `ci/connector-scope-approval`

## Rename Plan
Once the CI jobs are finalized, this document will be updated to reflect the canonical job names as they appear in the GitHub Actions UI.
