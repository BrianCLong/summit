# Required checks discovery (TODO)
## UI
1. Repo Settings → Branches → Branch protection rules.
2. Note all "Require status checks" names for the default branch.

## API (GitHub)
- REST: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
- GraphQL: query branchProtectionRules + requiredStatusChecks

## Temporary naming convention
- Use `skills/*` jobs with stable names.
- If actual required checks differ, add a rename PR that preserves history.
