# Demo Worker SLOs

- **Latency**: 95th percentile job duration < 500ms.
- **Error Rate**: Failed jobs < 1% of processed jobs.
- **Saturation**: Queue depth < 200 for 15 consecutive minutes.

Alerts share the same multi-window burn-rate configuration and route to `#observability-ops`.
