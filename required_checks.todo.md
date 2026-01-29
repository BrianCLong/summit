# Required checks discovery (TODO)
1) GitHub UI: Repo → Settings → Branches → Branch protection rule → list required checks.
2) GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Record names here; then rename temporary CI jobs to match.

Temporary gate names (to be replaced):
- summit-unit-tests
- summit-evidence
- summit-deps-delta
