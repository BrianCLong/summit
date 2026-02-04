# Runbook — Subsumption Bundle Contract

## Failure Modes

1. **Verifier Failure:** `subsumption-bundle-verify` fails.
   - **Cause:** Missing manifest, fixtures, or evidence index entry.
   - **Action:** Run `node scripts/ci/verify_subsumption_bundle.mjs subsumption/<item>/manifest.yaml` and restore missing files.
2. **Evidence Drift:** Evidence files moved without index update.
   - **Cause:** Path changes outside the evidence index.
   - **Action:** Update `evidence/index.json` and re-run verifier.

## Alert Spec

- **Severity:** Medium (build blocking).
- **Channel:** CI notifications.

## SLO

- Verifier execution time < 10s.
- 100% bundle integrity for required files.
