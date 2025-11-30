# Bug Bash Summary - 20250922 (Normalized)

| ID | Area | Severity | Reproducible | Description | Status |
|----|------|----------|--------------|-------------|--------|
| BB-001 | Infra | Critical | Yes | `start.sh` script referenced in documentation was missing. | Fixed |
| BB-002 | Infra | Critical | Yes | Docker daemon check fails in CI/Sandbox environments without fallback or mock mode. | Open |
| BB-003 | Docs | Major | Yes | `BUG_BASH_REPORT_20250922.md` references empty result files (`P0-critical.md`, etc.). | Open |
| BB-004 | Testing | Minor | Yes | `scripts/smoke-test.js` timeout (30s) might be too short for initial cold start in CI. | Open |
| BB-005 | Testing | Minor | No | `health-check-results.json` was empty in previous run. | Open |

## Notes

- **BB-001**: Created `start.sh` to match `Makefile` logic.
- **BB-002**: Confirmed failure in sandbox environment.
- **BB-003**: Audit of `bug-bash-results/20250922/` showed templates only.
