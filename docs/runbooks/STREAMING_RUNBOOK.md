# Streaming Platform Runbook

## 1. Consumer Lag Explosion

**Symptoms:** `kafka_consumergroup_lag` > 10,000 and growing.
**Alert:** `HighConsumerLag`
**Root Causes:**

- Spike in traffic.
- Slow processing logic (e.g. downstream DB slow).
- Consumer crash loop.
  **Mitigation:**

1. Check `kafka_consumer_processing_latency`. If high, investigate downstream.
2. Scale up consumers: Increase `replicas` in K8s deployment (up to partition count).
3. Increase concurrency: Update `partitionsConsumedConcurrently` in consumer config if not CPU bound.
4. Temporary: If logic is buggy, stop consumers, fix, deploy.

## 2. Dead Letter Queue (DLQ) Growth

**Symptoms:** `kafka_server_brokertopicmetrics_messagesin_total` for `*.dlq` topics increasing.
**Alert:** `DLQRateHigh`
**Mitigation:**

1. Inspect DLQ messages: `kafkacat -b brokers -t my-topic.dlq -C -c 1`
2. Identify error pattern (e.g. "Schema mismatch").
3. Fix root cause (e.g. register new schema, fix producer).
4. Replay: Use `scripts/replay_dlq.ts` (TBD) to move messages back to main topic.

## 3. Glue Schema Registry Outage

**Symptoms:** Producers failing with "Failed to get schema ID". Consumers failing decode.
**Mitigation:**

1. Check AWS Status page.
2. If transient, the app will retry (ensure retry policy is active).
3. If prolonged, consider enabling "Cache" in Schema Registry Client (if supported) to survive reads. Writes will fail.
4. DR: Switch to backup registry in another region (requires config update).

## 4. Redis State Store Corruption/Loss

**Symptoms:** `RedisStateStore` connection errors or "Data Loss" alerts.
**Mitigation:**

1. If Redis is down, `AggregationProcessor` will fail. Restart Redis.
2. If data is lost (AOF/RDB missing):
   - Aggregations will reset to 0.
   - Impact: Inaccurate counts for current window.
   - Recovery: Accept loss for real-time dashboards. For audit compliance, replay Kafka topic from start of window (reset offsets).
