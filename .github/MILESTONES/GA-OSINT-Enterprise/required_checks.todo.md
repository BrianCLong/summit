# Required Checks Discovery

## Current Known Checks (Temporary Placeholders)
- [ ] `gate/evidence-schemas` (CI Verify Workflow)
- [ ] `gate/osint-policy` (CI Security Workflow)
- [ ] `gate/ga-osint-enterprise` (GA Readiness Workflow)

## Discovery Plan
1.  Run `gh pr checks` on a PR targeting main.
2.  Update this file with exact check names reported by GitHub.
3.  Rename workflows/jobs if necessary to match desired convention.

## Acceptance Criteria
- All checks must pass on `main` branch before GA declaration.
