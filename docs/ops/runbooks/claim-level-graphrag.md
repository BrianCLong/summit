# Runbook — claim-level-graphrag

## Failure modes
- **Verifier failure:** "Missing required path" indicates missing manifest or schemas.
- **Evidence generation failure:** Check write permissions in `evidence/subsumption/`.
- **Fixture mismatch:** If deny-by-default tests fail, check if `deny-fixtures/*.json` were modified improperly.

## Alerts
- **Drift:** `claim_support_rate` dropping > 20% in 24h.
- **Verifier Runtime:** > 5 minutes.

## Recovery
- Re-run the CI job.
- Verify `manifest.yaml` points to valid files.
