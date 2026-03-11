# ADR 008: Ingestion Pipeline Architecture

## Status
Accepted

## Context
Summit requires a high-throughput, unified ingestion pipeline capable of accepting streams of analytical and design artifacts (the "Governed Design Artifact Ingestion Pipeline"), validating them, enriching them, and ultimately routing them into a structured database (or knowledge graph). Previous architectures used separate pipelines (`ingest`, `ingest_svc`, `ingest-sandbox`, `feed-processor`), leading to operational fragmentation and inconsistent throughput.

## Decision
We will consolidate our ingestion processes into a single, high-throughput pipeline implemented via a Python worker architecture backed by Redis batching.

1.  **Queue Backend:** A Redis-backed queue (`feed:ingest`) will serve as the buffer. Producers will write JSON payloads using `RPUSH`.
2.  **Worker Architecture:** An asynchronous Python worker pool (`feed-processor`) will handle processing. Workers will use `BLPOP` to block on new items, and then aggressively pull up to `FEED_BATCH_SIZE` items using `LPOP` to amortize network round-trips.
3.  **Concurrency Model:** `FEED_WORKER_CONCURRENCY` will dictate the number of coroutines listening on the queue.
4.  **Parallel Execution:** Heavy transformations (e.g., hashing, validation, data enrichment, scoring) will fan out into a dedicated thread pool dictated by `FEED_PARALLELISM`.
5.  **Observability:** The pipeline will rely on OpenTelemetry to generate `feed.batch` spans, recording batch sizes, elapsed times, and throughputs. Sliding-window trackers will provide real-time metrics.

## Consequences
- **Positive:** Reduces operational complexity by standardizing onto one unified pipeline for data intake.
- **Positive:** The batching strategy (fetching hundreds of items at once via `LPOP`) amortizes latency and drastically improves throughput.
- **Positive:** Built-in tracing ensures that queue congestion and transformation latencies are immediately visible on Grafana dashboards.
- **Negative:** Batch-oriented processing can increase single-item latency if `FEED_BATCH_SIZE` is large and traffic is light (though a cool-down/flush timeout interval of `FEED_FLUSH_INTERVAL` mitigates this).
- **Negative:** Thread pools in Python are constrained by the Global Interpreter Lock (GIL) for CPU-bound work, requiring careful profiling of the transformation logic.
