# Realtime Service Runbook

## Overview
Handles ingestion from Kafka/Redis Streams and fanout via GraphQL Subscriptions/SSE.

## Metrics
- `rt_delivery_lag_seconds`: Critical if > 1s.
- `rt_queue_depth`: Monitor for backpressure.

## Procedures

### High Lag
1. Check Redis memory usage.
2. Check consumer logs for errors.
3. Scale up `realtime-service` replicas (ensure consumer group handles it).

### Partition Loss
1. If Redis data is lost, replay from source (Kafka) if available.
2. Use Admin API (to be implemented) to trigger replay for specific tenant.

### Brownout
1. To shed load, update configuration to drop non-critical event types (e.g. `trace.*`).
