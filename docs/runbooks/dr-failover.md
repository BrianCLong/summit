# DR Failover Runbook

## Preconditions

- Backups fresh within RPO thresholds.
- Write-freeze flag enabled on primary.
- Dual approval recorded with trace_id.

## Steps

1. Trigger workflow `DR Failover/Cutback` with action `failover` and provide trace_id + approver.
2. Validate backups restored in DR namespace; run smoke checks for golden paths.
3. Update DNS/ingress to DR endpoints; monitor 5-minute error budget burn.
4. Confirm user-facing services operate in read-only mode; disable heavy analytics.
5. Record outcomes and timings in `artifacts/drills/<date>/`.
