# Required Checks Discovery — TODO

Goal: enumerate exact required check names enforced by branch protection for `main`.

## UI Method
1. Open repo Settings → Branches → Branch protection rules for `main`.
2. Under “Require status checks to pass”, copy the exact check names.
3. Paste into: subsumption/narrative-ops-detection-2026-01-28/required_checks.verified.json

## API Method (GitHub)
1. Use GitHub CLI:
   - gh api repos/<OWNER>/<REPO>/branches/main/protection --jq '.required_status_checks'
2. Or:
   - gh api repos/<OWNER>/<REPO>/branches/main/protection/required_status_checks
3. Save raw JSON output as above.

## Temporary naming convention (until verified)
- `subsumption-bundle-verify`
- `subsumption-policy-fixtures`
- `subsumption-eval-smoke`

## Rename plan
If discovered names differ, update:
- workflow job `name:`
- docs references
- required_checks.verified.json
Then add a small PR: `chore(ci): align subsumption check names to branch protection`.
