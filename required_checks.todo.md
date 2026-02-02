# Required Checks Discovery (TODO)

## GitHub UI
1. Repo → Settings → Branches → Branch protection rules
2. Note “Require status checks to pass…” list (exact names)

## GitHub API (pattern)
- GET /repos/{owner}/{repo}/branches/{branch}/protection
- GET /repos/{owner}/{repo}/rulesets

## Temporary check names (until confirmed)
- ci/trend-evidence
- ci/supply-chain-delta

## Rename plan
Once actual required checks are known, update workflow job names and add alias job for 1 release cycle.
