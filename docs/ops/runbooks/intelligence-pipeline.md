# Intelligence Pipeline Runbook

## Alerts
- `intelligence_ingest_failure`
- `capability_projection_failure`
- `taxonomy_proposal_backlog`
- `discovery_drift_detected`

## SLO / SLA
- Daily bounded refresh success >= 99%
- Proposal queue reviewed within one business day
- No automatic taxonomy promotion without approval

## Runbooks
1. **Ingestion failure**: Check marketplace adapter logs.
2. **Taxonomy proposal review**: Review `reports/intelligence/acd/proposals/` and approve via PR.
3. **Rollback**: Disable `acd_enabled` in feature flags.
