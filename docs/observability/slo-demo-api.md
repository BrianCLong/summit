# Demo API SLOs

- **Latency**: 99th percentile < 1s over 28-day window.
- **Error Rate**: 5xx responses < 2% of total traffic.
- **Saturation**: CPU utilization < 85% and worker queue depth < 100 jobs.

Alert rules implemented via `alertmanager/slo/multiwindow-burn-rates.yaml` with burn-rate pairs (5m/1h, 1h/6h).
