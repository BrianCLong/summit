# Required checks discovery (TODO)
## Goal
Determine the exact required check names for the default branch protection rules.
## GitHub UI
1) Settings → Branches → Branch protection rules → note required status checks.
## GitHub API
GET /repos/{owner}/{repo}/branches/{branch}/protection
Record required_status_checks.contexts.
## Temporary check names (until confirmed)
- summit/quality-gate-kotlin
