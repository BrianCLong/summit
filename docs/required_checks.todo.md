# Required checks discovery (TODO)
1. In GitHub: Settings → Branches → Branch protection rules → note required checks.
2. Or via API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3. Record check names here and map them in CI config.

## Temporary gate names (until discovered)
- summit-evidence-verify
- summit-dependency-delta
- summit-tests
