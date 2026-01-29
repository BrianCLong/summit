# Runbook — Automation Turn #3 Bundle

## Failure Modes

1.  **Verifier Failure:** CI job `subsumption-bundle-verify` fails.
    - _Cause:_ Manifest missing, schema violation, or nondeterminism.
    - _Action:_ Check logs, run local verify.
2.  **Drift Detected:** Monitoring script exits non-zero.
    - _Cause:_ Missing docs or files.
    - _Action:_ Restore missing files from git history.

## Alert Spec

- **Severity:** Medium (Build blocking).
- **Channel:** CI Notifications.

## SLO

- Verifier execution time < 10s.
- Bundle integrity 100% (all files present).
