# Required checks discovery (TODO)

## Deterministic steps

1. UI: GitHub repo → Settings → Branches → Branch protection rules → list required checks.
2. API: `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`.
3. Record exact names in `ci/required_checks_map.json`.

## Temporary gate naming convention

- `ci/evidence-verify`
- `ci/deps-delta-verify`

## Rename plan

Once actual required checks are known, map old → new in `ci/required_checks_map.json` and update CI.
