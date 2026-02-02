# FactGov Operational Runbook

## Service Level Objectives (SLOs)

| Metric | Target | Measurement Window |
| :--- | :--- | :--- |
| **Availability** | 99.9% | Monthly |
| **RFP Match Latency** | P95 < 800ms | Rolling 1h |
| **Artifact Generation** | < 2s | Per request |

## Alerting

*   **ABAC Deny Spikes**: > 10 denials / min (potential breach attempt).
*   **Audit Write Failures**: Any failure to write to `factgov_audits` is critical.
*   **Drift Detection**: `scripts/monitoring/factgov-drift.ts` failure implies schema/policy mismatch.

## Troubleshooting

### "RFP Matching is slow"
1.  Check Postgres performance (indexes on `factgov_vendors` tags).
2.  Check `factgovMatchRfp` resolution time in traces.

### "Artifact hash mismatch"
1.  Verify if `runtime_meta` was accidentally included in the hash.
2.  Check if `JSON.stringify` order is non-deterministic (use `stable-stringify`).

## Disaster Recovery
*   **RPO**: 1 hour (Postgres backups).
*   **RTO**: 4 hours.
*   Recover from `server/db/managed-migrations/` re-run and Postgres restore.
