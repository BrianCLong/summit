# Required Checks Discovery (TODO)

## UI Steps

1. GitHub UI → Settings → Branches → Branch protection rules.
2. Record required status checks.

## API Steps

- `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`

## Current Checks (Temporary Convention)

- `gate/evidence-validate`
- `gate/osint-policy`
- `gate/depdelta`

## Plan

1. Record official check names in `ci/required_checks.json` once discovered.
2. Add a mapping file to preserve existing names for two releases.
