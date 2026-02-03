# Runbook — Automation Turn #3 Bundle

## Failure Modes

1. **Verifier Failure:** CI job `subsumption-bundle-verify` fails.
   - **Cause:** Manifest missing, schema violation, or nondeterminism.
   - **Action:** Check logs and run `node scripts/ci/verify_subsumption_bundle.mjs subsumption/automation-turn-3/manifest.yaml`.
2. **Evidence Drift:** Evidence index missing or files relocated.
   - **Cause:** Evidence path edits without index updates.
   - **Action:** Restore paths and update `evidence/index.json` deterministically.

## Alert Spec

- **Severity:** Medium (build blocking).
- **Channel:** CI notifications.

## SLO

- Verifier execution time < 10s.
- Bundle integrity 100% (all declared files present).
