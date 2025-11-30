# Canary Rollout & Rollback – api-svc-template

## Preconditions
- CI green for commit SHA.
- SLOs for service currently within error budget.

## Rollout Steps
1. Deploy canary:
   ```bash
   helm upgrade api-svc-template charts/api-svc-template \
     -f values.yaml -f values-canary.yaml --set image.tag=$SHA
   ```

2. Monitor for 10–15 minutes:

   * Dashboards: latency p95, error rate, saturation.
   * Check `http_request_duration_seconds` and `errors_total` against baseline.

## Auto-Rollback Criteria

* Error rate > 2x baseline for 5 consecutive minutes, OR
* p95 latency > 2x baseline for 5 consecutive minutes, OR
* Any 5xx spike > 5% of traffic.

## Manual Rollback Procedure

1. Roll back to last known-good:

   ```bash
   helm rollback api-svc-template <previous_revision>
   ```
2. Confirm:

   * Health endpoints 200.
   * Dashboards return to baseline.
3. Incident Notes:

   * Capture Grafana snapshot links.
   * Capture CI build + logs.
   * File post-incident report in `RUNBOOKS/incidents/YYYYMMDD-<slug>.md`.
