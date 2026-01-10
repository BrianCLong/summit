# Ingestion Backlog Runbook

**Trigger:** `kafka_consumer_lag > 10000`

## Triage Steps
1.  **Check Consumer Health:**
    *   Are pods running? `kubectl get pods -l app=ingestion-worker`
    *   Are they crash-looping? Check logs: `kubectl logs -l app=ingestion-worker`
2.  **Check Downstream (Neo4j/Postgres):**
    *   Is DB CPU > 90%?
    *   Are write locks blocking?
3.  **Scale Up:**
    *   If DB is healthy, scale consumers: `kubectl scale deploy ingestion-worker --replicas=10`
4.  **Shed Load (Emergency Only):**
    *   If critical, drop low-priority events (e.g., debug logs) by applying a filter at the topic level.

## Resolution
*   Backlog drains to < 1000.
*   Latency returns to normal (< 100ms).
