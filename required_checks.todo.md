# Required checks discovery (TODO)
1. GitHub UI: Repo → Settings → Branches → Branch protection rule → “Require status checks”
2. GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection
3. Populate: /config/ci/required_checks.json

# Temporary gate names (until discovered)
- ci/lint
- ci/unit
- ci:security
- ci:evidence
- verify:dependency-delta
