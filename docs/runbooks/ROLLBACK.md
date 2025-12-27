# Sprint 24 Rollback Procedure

## Trigger Conditions
- Critical SLO breach (p95 > 1s) immediately after deployment.
- "mTLS required" errors blocking legitimate internal traffic.
- Data corruption detected in Ingest (provenance mismatch).

## Steps

1. **Revert Helm Release**:
   ```bash
   helm rollback intelgraph
   ```
   *Verify revision number before executing.*

2. **Verify Stability**:
   - Run `k6 run k6/slo-gate.js` to ensure stability.
   - Check `metrics` endpoint for `graphql_active_requests`.

3. **Database Revert (if applicable)**:
   - If schema migration failed or caused issues:
   ```bash
   npm run db:rollback
   ```
   *Note: Be careful with rolling back if new data has been written.*

4. **Communications**:
   - Notify #incident-response channel.
   - Update Status Page.
