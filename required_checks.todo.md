# Required Checks Discovery (TODO)

## UI
1. Repo Settings -> Branches -> Branch protection rules.
2. Note required status checks for default branch.

## API (GitHub)
Use: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

## Temporary CI gate names (will rename)
- ci/unit
- ci/evidence
- ci/governance
- ci/eval
