# Required checks discovery (temporary)

1. In GitHub UI: Settings → Branches → Branch protection rules → note required status checks.
2. In GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3. Add discovered names to `ci/required_checks.json` (to be created) and update CI verifier config.

Temporary gate naming convention until discovered:

- summit-ci/evidence-validate
- summit-ci/supplychain-delta
