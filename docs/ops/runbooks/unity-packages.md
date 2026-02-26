# Unity Package Scanning Runbook

## CI Failure Remediation
1. Inspect `package-report.json` validation errors.
2. Confirm dependency versions are strict `MAJOR.MINOR.PATCH`.
3. Confirm scoped registries use HTTPS and approved scopes.

## Registry Outage Handling
- Retry using cached package manifests.
- If outage persists, defer merge pending registry restoration.

## Rollback
- Revert the latest Unity package scan change.
- Regenerate deterministic artifacts.
- Re-run CI policy and test gates.
