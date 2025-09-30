# Offline Feed Ingestion

This document describes the offline ingestion capability added to the feed-processor
service. When database connectivity is interrupted, ingestion payloads are staged in
Redis and replayed automatically after connectivity is restored.

## Architecture

- **Redis queue** – Payloads are appended to `offline:feed-processor:ingest` with a
  companion dead-letter queue `offline:feed-processor:ingest:dlq` after the retry
  budget is exhausted.
- **Durable storage** – `services/feed-processor/config/offline-queue.conf` enables
  AOF persistence and sensible memory/slowlog defaults so queued payloads survive
  restarts and can be monitored.
- **Background sync** – A `OfflineQueueManager` instance flushes the Redis queue at
  a configurable cadence (`OFFLINE_FLUSH_INTERVAL_MS`, default 15s) once Postgres and
  Neo4j connectivity checks succeed.
- **Retry strategy** – Neo4j writes now use exponential backoff (3 attempts). Offline
  payloads are retried up to `OFFLINE_SYNC_MAX_ATTEMPTS` (default 5) before landing in
  the dead-letter queue for manual inspection.

## Data Flow

1. Ingestion jobs execute as normal until a Postgres/Neo4j connectivity error is detected.
2. The payload is serialised (entities, relationships, job metadata) and written to the
   Redis offline queue with OpenTelemetry events and pino logging.
3. When connectivity is restored, the queue manager pops batches (default 25 items),
   persists the entities and relationships, and records a `synced_offline` job run in
   Postgres.
4. Failures during replay increment the `attempts` counter; exceeding the limit moves the
   payload into the dead-letter queue for triage.

## Observability

- OpenTelemetry spans wrap queue enqueue/flush, persistence retries, and queue health
  checks. Errors are recorded with `SpanStatusCode.ERROR` for clear tracing.
- Health logs now include the offline queue depth and DLQ count so dashboards can alert
  on backlog growth.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `OFFLINE_QUEUE_KEY` | `offline:feed-processor:ingest` | Override the Redis key used for staging payloads. |
| `OFFLINE_FLUSH_INTERVAL_MS` | `15000` | Interval between background flush attempts. |
| `OFFLINE_FLUSH_BATCH_SIZE` | `25` | Maximum number of payloads drained per flush run. |
| `OFFLINE_SYNC_MAX_ATTEMPTS` | `5` | Dead-letter threshold for offline payload retries. |

## Testing

Run the new integration tests from the Python package:

```bash
cd python
pytest tests/test_offline_ingestion.py
```

These tests validate the Redis queue helper class used by operational tooling to inspect
and drain offline payloads, ensuring default fields and retry semantics behave as expected.
