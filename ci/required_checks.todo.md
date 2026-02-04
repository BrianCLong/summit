# Required checks discovery (TODO)

## UI
1) Repo Settings → Branches → Branch protection rules
2) Note “Require status checks to pass before merging”
3) Copy exact check names into this file

## API (GitHub)
- List check runs for a commit, then infer stable check names used in protection rules.

## Temporary gates
- `audit-gates` (rename once canonical names known)
