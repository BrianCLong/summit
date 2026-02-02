# Required Checks Discovery (TODO)

1) In GitHub repo settings:
   - Settings → Branches → Branch protection rules
   - Note required status checks and required workflows.

2) Via API (preferred):
   - Use GitHub REST API to fetch branch protection and list required checks.

3) Map to Summit gates:
   - Replace placeholder gate names in CI with exact required check names.

## Temporary gate names (until mapped)
- summit-skillsec
- summit-evidence
- summit-harness-mock
