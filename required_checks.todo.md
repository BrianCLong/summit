## Required checks discovery (TEMP)
1) In GitHub repo: Settings → Branches → Branch protection rules
2) Record exact check names required for merge
3) Replace placeholders in `.github/workflows/ci.yml`

Temporary checks expected:
- summit/verify-evidence
- summit/unit-tests

Rename plan:
- PRx: update workflow + badges once real required checks are known
