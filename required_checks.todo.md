# Required Checks Discovery (TODO)
## UI
1) Repo Settings -> Branches -> Branch protection rules
2) Note "Require status checks to pass before merging" list

## API
# GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

## Temporary gates (until real names confirmed)
- gate/evidence_schema
- gate/deps_delta
- gate/determinism_replay

## Rename plan
Once actual check names are known, map gate/* -> required checks in CI and update docs.
