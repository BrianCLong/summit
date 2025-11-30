# Streaming Ingest Orchestrator (Prompt #65)

- **Feature flag:** `SIO_ENABLED` (default: false)
- **APIs:** POST `/runs`, GET `/runs/:id`, POST `/retry/:dlqId`, GET `/health/connectors`
- **Events:** `ingest.run.started|completed|failed|replayed` (with provenance + dedupe keys)
- **Exact-once:** source offsets + sink dedupe keys; DLQ with replay guard
- **Backoff:** exponential w/ jitter (base 500ms, max 2m, 7 attempts); concurrency caps: per-connector=4, global=32
- **Observability:** queue depth, retry counts, p95 enqueue→persist ≤400ms
- **Tests:** golden idempotency fixtures; chaos (broker drop, retry storms); contract + E2E
