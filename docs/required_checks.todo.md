# Required checks discovery (TODO)

1) In GitHub repo → Settings → Branches → Branch protection rules:
   - Record required status checks exact names.

2) (Optional) GitHub API:
   - GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

Temporary local gate names until discovered:
- ci/summit-integrity-foundation
- ci/summit-integrity-evidence

Rename plan:
- Add alias checks for 1 release cycle, then remove old names.
