# Required checks discovery (temporary)

## UI
1) Repo Settings → Branches → Branch protection rules
2) Note "Require status checks to pass" list (exact names)

## API (GitHub)
GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

## Temporary check names introduced by this PR stack
- ci/geometry-evidence-validate
- ci/geometry-unit
- ci/geometry-e2e (optional)

## Rename plan
Once canonical required checks are known, rename the above in:
- .github/workflows/*.yml
- docs/ci.md
- any badges
