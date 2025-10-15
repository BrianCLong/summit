# Feed Processor Python Workers

This package contains the high-throughput Python workers that back the Summit feed-processing pipeline. The workers consume feed messages from Redis, batch them for efficiency, fan out processing across parallel worker coroutines and thread pools, and emit traces to Jaeger via OpenTelemetry.

## Key Features

- **Batch-aware queue** built on Redis lists to minimize round-trips.
- **Parallel workers** that scale out both across asynchronous consumers and thread pools for CPU-heavy transforms.
- **OpenTelemetry instrumentation** with a Jaeger exporter for end-to-end traceability.
- **Configurable runtime** via environment variables and `.env` files.
- **Benchmark harness** under `feed_processor/perf` for repeatable throughput testing.

## Local Usage

```bash
# Install dependencies
pip install -e .[dev]

# Start Redis and Jaeger (Docker Compose has ready-to-use services)
redis-server --daemonize yes  # or docker compose up redis jaeger

# Run the workers
feed-processor

# Execute the synthetic throughput benchmark
feed-processor-benchmark --records 20000 --batch-size 500
```

See `docs/architecture/feed-processor-throughput.md` for tuning guidance and benchmark numbers.
