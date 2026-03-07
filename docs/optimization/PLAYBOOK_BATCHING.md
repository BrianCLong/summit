# Optimization Playbook: Batching Operations

**Target Metrics:** `perf_throughput`, `cost_per_req`
**Risk Profile:** Low (Latency Increase)

## 1. When to Apply

- High volume of small inserts/updates (e.g., ingestion logs).
- Database connection pool exhaustion.
- Kafka consumer lag is increasing.

## 2. Implementation Steps

1.  **Identify Producers**: Locate services sending single-row writes.
2.  **Buffer Implementation**:
    - Use `pg-boss` or custom memory buffer.
    - Flush on `MAX_SIZE` (e.g., 1000 items) or `MAX_TIME` (e.g., 500ms).
3.  **Bulk Insert**: Switch from `INSERT` to `COPY` or `INSERT ... VALUES (...), (...)`.

## 3. Guardrails (MUST PASS)

- [ ] **Latency Cap**: Max buffering delay must not exceed `api_performance.latency.max_ms`.
- [ ] **Durability**: Acknowledge receipt only _after_ batch commit (or accept risk of loss).
- [ ] **Error Handling**: Partial batch failures must be retried or DLQ'd without dropping the whole batch.

## 4. Rollback

- Revert to singleton processing mode via config.
