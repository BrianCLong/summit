# Runbook: Unity Package Scan Operations

## CI Failure Remediation
1. Validate `package.json` has strict semver values.
2. Check dependency graph for cycles in `dependency-dag.json`.
3. Verify registry policy inputs and HTTPS enforcement.

## Registry Outage Handling
- Defer package update and reuse last known-good package report.
- Re-run drift check once connectivity recovers.

## Version Conflict Resolution
- Align dependency ranges to strict `MAJOR.MINOR.PATCH` versions.
- Bump package version when dependency versions change.

## Rollback Plan
1. Revert offending commit.
2. Invalidate generated package artifacts.
3. Re-run CI package scan to restore baseline state.
