# Required Checks Discovery (Dynamic Intent)

## UI

1. Repo Settings -> Branches -> Branch protection rules.
2. Note required status checks for default branch.
3. Record exact check names in `ci/required_checks.json`.

## API (GitHub)

Use: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

## Temporary CI gate names (will rename)

- ci/unit
- ci/evidence
- ci/governance
- ci/eval
