# Required checks discovery (TODO)

## Goal
Discover the exact required status check names enforced by branch protection for `main`,
then align workflow `name:` fields and job names accordingly.

## Steps (UI)
1. Repo → Settings → Branches → Branch protection rules.
2. Find rule for `main`.
3. Copy the “Require status checks to pass before merging” list verbatim.

## Steps (API)
Use GitHub REST API:
- `GET /repos/{owner}/{repo}/branches/main/protection`

## Output
Create/Update:
- `.github/policies/required-checks.json` (exact names)
- If any workflow names differ, add a small PR to rename workflow `name:` fields.
