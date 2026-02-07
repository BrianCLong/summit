# Required Checks Discovery (Tabular Predictive Layer)

This file captures the discovery steps for the exact required status check names used by branch protection rules.

## Discovery steps (authoritative)
1) GitHub UI: **Settings → Branches → Branch protection rules → Required status checks**
2) GitHub API: `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`
3) Record the exact check names as reported by the Status API (case/spacing sensitive).
4) Update workflow job names or aliases to match those required checks.
5) Replace any temporary gate names in this file once verified.

## Temporary gate names (pending verification)
- `verify/typecheck`
- `verify/policy`
- `verify/evidence`
- `verify/tests`

## Rename plan
- Update CI job names to match the required checks returned by the API.
- Re-run branch protection drift checks to confirm alignment.
