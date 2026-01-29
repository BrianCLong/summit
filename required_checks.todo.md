# Required Checks Todo

## GitHub UI Steps
1.  Go to repo -> Settings -> Branches -> Branch protection rules.
2.  Edit the rule for `main` (or default branch).
3.  Scroll to "Require status checks to pass before merging".
4.  Add the following checks (temporary names until confirmed):
    *   `gate.auditlog.evidence`
    *   `auditlog.schema`
    *   `auditlog.persistence`
    *   `auditlog.reporting`

## GitHub API Steps
```bash
# List required status checks
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

## Plan
*   Once the CI workflow for verification is implemented (`gate.auditlog.evidence`), it will appear in the PR checks list.
*   We will then enforce it as required.
