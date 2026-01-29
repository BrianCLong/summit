# Runbook — Automation Turn #6 Bundle

## Failure Modes
1.  **Verifier Failure:** CI job `subsumption-bundle-verify` fails.
    - *Cause:* Manifest missing, schema violation, or nondeterminism.
    - *Action:* Check logs, run local verify.
2.  **Drift Detected:** Monitoring script exits non-zero.
    - *Cause:* Missing docs or files.
    - *Action:* Restore missing files from git history.

## Alert Spec
- **Severity:** Medium (Build blocking).
- **Channel:** CI Notifications.

## SLO
- Verifier execution time < 10s.
- Bundle integrity 100% (all files present).
