# Runbook: reddit-ma-adtech-2026-02-06 Drift Monitoring

## SLO

- Drift job succeeds daily.
- Alerts fire within one hour of failure or material drift.

## Alerts

- CI failure on scheduled drift check.
- `drift.json` reports `material=true`.

## Runbook Steps

1. Verify source pages are reachable and unchanged.
2. Inspect `artifacts/intel/reddit-ma-adtech-2026-02-06/drift.json`.
3. If drift is material, validate claim changes against source URLs.
4. Regenerate baseline artifacts using:
   - `INTEL_ENABLE_INGEST=1 summit intel ingest --source all --item reddit-ma-adtech-2026-02-06 --update-baseline`
5. Commit updated baseline artifacts if drift is confirmed.

## Exit Criteria

- Drift is resolved or confirmed with updated evidence.
- CI drift job returns to green.
