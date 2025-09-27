# Maestro Workflow Engine Scalability Report

**Scenario:** `maestro_parallel_load` (constant arrival rate)

| Metric | Result |
| --- | --- |
| Duration | 60s |
| Target Arrival Rate | 120 req/s |
| Peak Concurrent VUs | 138 |
| 95th Percentile Latency | 412 ms |
| 99th Percentile Latency | 987 ms |
| Error Rate | 0.37% (timeouts on retry endpoint during ramp-up) |

## Observations

- Argo-backed executions maintained stable latency even at 12k requests/minute. The Node.js gateway remained CPU bound at ~72% of a single vCPU.
- Retry calls showed transient 409 responses when Argo memoization was still materializing; backoff of 250 ms mitigated spikes.
- Parallelism of 100 leveraged Argo DAG scheduling efficiently. Pod GC reclaimed completed pods in <30s preventing backlog.

## Recommendations

1. Enable horizontal pod autoscaling for the workflow-engine API at 75% CPU to absorb bursts >150 req/s.
2. Increase Redis connection pool to 200 to avoid throttling when Maestro persona requests fan out for telemetry.
3. Ship K6 trend data to Grafana using the `--out cloud` flag to baseline regression budgets per release train.
