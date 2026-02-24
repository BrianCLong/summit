# Required Checks Discovery

This directory tracks the discovery workflow for GitHub required check names so CI gates can match
branch protection rules exactly.

## Workflow

1. GitHub UI → Settings → Branches → Branch protection rules → record required check names.
2. GitHub API:
   - `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`
3. Update `required_checks.todo.md` with the exact names reported by the GitHub Status API.
4. Align workflow job names with the canonical required checks (or add aliases) before removing
   temporary placeholders like `SummitGate/*`.

## Evidence

Record the date, actor, and branch rule set used for verification in the PR description when the
check names are updated.
