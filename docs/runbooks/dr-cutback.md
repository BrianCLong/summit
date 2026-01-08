# DR Cutback Runbook

## Preconditions

- Primary region healthy and consistent with DR data.
- Write freeze maintained until cutback completes.
- Approvals and trace_id captured.

## Steps

1. Trigger workflow `DR Failover/Cutback` with action `cutback` and trace_id + approver.
2. Resynchronize data delta from DR to primary; validate checksums and replication lag.
3. Flip DNS/ingress back to primary; lift read-only mode once golden paths pass.
4. Clear DR freeze flags and monitor for regressions for 30 minutes.
5. Archive logs, timings, and evidence to `artifacts/drills/<date>/`.
