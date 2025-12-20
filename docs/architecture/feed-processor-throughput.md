# Feed Processor Throughput Playbook

This guide documents the high-throughput ingestion pipeline that powers the Summit feed-processor microservice. It covers the Python worker architecture, Redis batching strategy, instrumentation defaults, and benchmark-driven tuning levers.

## Architecture Overview

1. **Redis-backed queue (`feed:ingest`)** – Producers append JSON payloads via `RPUSH`. Workers consume with `BLPOP` plus `LPOP` batching to amortize round-trips.
2. **Async worker pool** – `FEED_WORKER_CONCURRENCY` controls the number of coroutine consumers, each requesting batches sized by `FEED_BATCH_SIZE`.
3. **Threaded fan-out** – Within each batch, CPU-heavy transforms (hashing, enrichment, scoring) execute in a thread pool sized by `FEED_PARALLELISM`.
4. **Throughput tracker** – Sliding window statistics expose per-batch throughput and moving averages for dashboards and alerting hooks.
5. **Jaeger tracing** – OpenTelemetry instruments Redis calls and emits spans per batch (`feed.batch`) with size, elapsed time, and throughput attributes.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | `redis://redis:6379` | Redis connection for queue operations. |
| `FEED_QUEUE_NAME` | `feed:ingest` | Queue key shared between producers and workers. |
| `FEED_BATCH_SIZE` | `500` | Max messages fetched per consumer round trip. |
| `FEED_WORKER_CONCURRENCY` | `4` | Number of concurrent async consumers. |
| `FEED_PARALLELISM` | `8` | Thread pool size for per-record transforms. |
| `FEED_FLUSH_INTERVAL` | `5.0` | Cool-down seconds between batches to smooth load. |
| `FEED_TRACING_ENABLED` | `true` | Enables OpenTelemetry + Jaeger exporter. |
| `JAEGER_HOST` / `JAEGER_PORT` | `jaeger` / `6831` | UDP endpoint for the Jaeger agent. |

Docker Compose (`deploy/compose/docker-compose.full.yml`) now ships Redis + Jaeger containers pre-wired for the workers, so `docker compose up feed-processor jaeger redis` is sufficient for local tracing. When running the workers or benchmarks without Compose, export `JAEGER_HOST=127.0.0.1` (or point at your Jaeger agent) to avoid DNS errors while spans are emitted.

## Benchmark Highlights

Synthetic benchmark results (20k records, 500 batch size) are stored at `services/feed-processor/feed_processor/perf/benchmark_results.json`. They summarize:

- Average throughput window and overall totals.
- Peak per-batch throughput achieved across the test window.
- Worker concurrency, parallelism, and queue configuration used for the run.

Use `feed-processor-benchmark` to regenerate results with alternate profiles:

```bash
feed-processor-benchmark --records 50000 --batch-size 1000 --concurrency 6 --parallelism 12
```

## Observability Checklist

- Confirm Jaeger UI (`http://localhost:16686`) shows `feed.batch` spans with queue size and throughput attributes.
- Exporter runs via UDP port `6831`; ensure firewalls expose the port when testing remotely.
- Metrics snapshots from `ThroughputTracker` can be scraped by existing Prometheus jobs via custom exporters.

## Tuning Tips

- Increase `FEED_BATCH_SIZE` when Redis latency dominates; decrease when downstream services struggle with spikes.
- Raise `FEED_WORKER_CONCURRENCY` until CPU saturation or Redis contention occurs. Combine with `FEED_PARALLELISM` to spread CPU-bound transforms.
- Adjust `FEED_FLUSH_INTERVAL` to introduce back-pressure if Postgres/Neo4j sinks are overloaded.
- Use the benchmark harness to validate changes before rolling into production and capture new snapshots in `perf/benchmark_results.json`.

For deeper pipeline integration details, see the Python worker code under `services/feed-processor/feed_processor` and the updated Docker Compose profile.
