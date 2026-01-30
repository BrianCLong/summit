# Required checks discovery (temporary)

1. In GitHub UI: Settings -> Branches -> Branch protection rule -> note required checks.
2. OR via API: GET /repos/{owner}/{repo}/branches/{branch}/protection
3. Copy names into ci/required_checks.json

Temporary convention until discovered:

- "unit"
- "lint"
- "typecheck"
- "security-scan"
