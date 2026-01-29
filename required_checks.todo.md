# Required Checks Discovery — TODO

## Goal
List the exact required check names enforced by branch protection for the default branch.

## UI Steps
1. Repo → Settings → Branches → Branch protection rules.
2. Open the rule for the default branch.
3. Under “Require status checks to pass”, copy the check names exactly.

## API Steps (preferred, reproducible)
- Use GitHub API:
  - GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
  - GET /repos/{owner}/{repo}/branches/{branch}/protection
- Record exact check names into:
  - `subsumption/ssdf-v1-2/required_checks.verified.json`

## Temporary convention (until verified)
- `subsumption-verify`
- `ssdf-mapping-verify`

## Rename plan
If verified names differ, add a small PR that:
- updates workflow job name(s)
- updates manifest gate list
- updates any branch-protection machine-verifier (if present)
