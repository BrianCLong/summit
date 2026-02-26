# Runbook: Unity Package Scan

## CI Failure Remediation

1. Inspect `artifacts/package-report.json` for version and policy failures.
2. Correct invalid SemVer or disallowed scope.
3. Re-run scanner and verify deterministic output hash.

## Registry Outage Handling

- Keep policy gate deny-by-default.
- Retry after registry restoration; do not downgrade HTTPS rules.

## Rollback

1. Revert the Unity packaging PR.
2. Remove generated artifacts from release bundle.
3. Re-run CI quality gate.
