# Required checks discovery (TODO)

1) GitHub UI: Repo Settings → Branches → Branch protection rules → Required status checks.
2) GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Map required checks to CI job names:
   - summit-evidence
   - summit-eval
   - summit-policy

Rename plan: once actual names are known, update workflows and this doc in a tiny PR.
