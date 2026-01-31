# Required checks discovery (temporary)

## Goal
Identify the exact GitHub required check names for default branch protection, then rename placeholder gates.

## UI steps
1. Repo → Settings → Branches → Branch protection rules.
2. Find rule for default branch.
3. Copy the list under “Require status checks to pass…”

## API steps (optional)
Use GitHub REST API:
- GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

## Temporary gate naming
- ci/evidence-verify
- ci/deps-delta-verify

## Rename plan
Once names are known, create PR to:
1) update workflow names
2) update docs
3) add compatibility aliases for 1 release cycle
