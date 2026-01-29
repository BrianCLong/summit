# Required Checks Discovery

## UI Steps
1. Go to GitHub branch protection.
2. Check required checks list.

## API Steps
`GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`

## Current Checks (Temporary Convention)
- `gate/evidence-validate`
- `gate/osint-policy`
- `gate/depdelta`

## Plan
PR to map temp checks to official check names once discovered.
