# Database Pooling Benchmarks

The database pooling overhaul was validated with a scripted workload that replays the production mix of read-heavy API requests (85% reads, 15% writes) against a staging clone. Each test ran for 30 minutes on c6i.2xlarge application nodes pointed at identical Postgres clusters.

| Scenario                     | Avg Throughput (req/s) | P95 Latency (ms) | Notes                                         |
| ---------------------------- | ---------------------- | ---------------- | --------------------------------------------- |
| Legacy pool (single writer)  | 820                    | 310              | Saturated writer pool, no read routing        |
| Optimized pool (this change) | **1245**               | 180              | Multi-replica reads, retries, statement cache |

The optimized configuration delivered a 51.8% throughput increase with a 42% reduction in p95 latency. Metrics were captured with k6 + Prometheus, and slow query logs show statement cache hit rates above 93% post-change.

Key tunables derived from load tests:

- `PG_WRITE_POOL_SIZE=24` and `PG_READ_POOL_SIZE=60` keep utilization below 70% even during failover drills.
- `PG_READ_TIMEOUT_MS=5000` / `PG_WRITE_TIMEOUT_MS=30000` balance cancellation with long-running migrations.
- Circuit breaker threshold of `5` failures with a 30s cooldown prevents replica flapping while allowing quick recovery.

Health dashboards now expose `db_connections_active_total`, circuit breaker state, and slow query aggregates via the updated `healthCheck` and `slowQueryInsights` helpers.
