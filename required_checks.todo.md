## Required checks discovery (RDP)

1. In GitHub repo: Settings → Branches → Branch protection rules
2. Record exact check names required for merge
3. Replace placeholders in `.github/workflows/ci.yml`

Temporary checks expected:

- ci/summit-security-foundation
- ci/summit-security-gates
- ci/summit-security-deps

Rename plan:
- Update workflow + badges once real required checks are known.
- Support legacy check names for one release cycle.
