# Runbook: Reproducible Build Verification Failure

## Symptom
The `repro-build-verify` CI check has failed.

## Diagnosis
1. Check CI logs for hash mismatch.
2. Diff artifacts using `diffoscope`.

## Resolution
1. Fix timestamp usage in code.
2. Ensure file ordering is deterministic.
