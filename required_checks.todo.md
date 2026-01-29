# Required Checks Discovery (GitHub Branch Protection)

## Goal
Enumerate exact required status check names enforced on the protected branch (e.g., main).

## UI Steps
1. Repo → Settings → Branches → Branch protection rules
2. Open the rule for the protected branch
3. Under “Require status checks to pass”, copy the exact check names (case-sensitive)

## API Steps (GitHub CLI)
1. gh api repos/<OWNER>/<REPO>/branches/<BRANCH>/protection --jq '.required_status_checks.contexts'
2. Save output to subsumption/_meta/required_checks.json

## Temporary naming convention
Use job name prefix: `subsumption/verify-bundle`
Until verified, we treat this as non-required and keep it informational.
