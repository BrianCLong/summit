# Real-Time Feed Processor Deployment Guide

This guide explains how to deploy and monitor the Python-based feed processor that
provides near real-time ingestion for IntelGraph. The processor streams records
from Kafka, enriches them, and forwards normalized payloads to downstream
services.

## Architecture Overview

1. **Kafka Consumer** – Subscribes to `intel.raw` (override per environment) with
   an idempotent consumer group so records are processed exactly once.
2. **Processor** – Runs in Python, applying enrichment and normalization logic
   with configurable retry semantics. The processor publishes clean records to
   the `intel.enriched` topic and routes exhaustively failing messages to a DLQ.
3. **Observability** – Exposes Prometheus metrics on port `9464` and exports
   OpenTelemetry spans/metrics to the collector defined by the
   `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.

## Kubernetes Configuration

The Helm values now accept Kafka-centric configuration:

```yaml
services:
  feedProcessor:
    kafka:
      bootstrapServers: kafka.kafka.svc.cluster.local:9092
      inputTopic: intel.raw
      outputTopic: intel.enriched
      deadLetterTopic: intel.dlq
      consumerGroup: feed-processor
    processor:
      maxRetries: 5
      retryBackoffSeconds: 0.5
    telemetry:
      prometheusAlertThreshold: 5
```

Environment variables are generated automatically and surfaced to the Python
container so the runtime has no hard-coded infrastructure values. Override the
values per environment (`values-staging.yaml`, `values-prod.yaml`) to align with
cluster topology.

## Running Locally

1. Start Kafka (e.g., via Docker compose) and create the three topics listed
   above.
2. Install Python requirements:

   ```bash
   cd python
   pip install -r requirements.txt
   ```

3. Launch the processor with the desired OTLP endpoint:

   ```bash
   export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
   export KAFKA_INPUT_TOPIC=intel.raw
   export KAFKA_OUTPUT_TOPIC=intel.enriched
   export KAFKA_DEAD_LETTER_TOPIC=intel.dlq
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
   python -m feed_processor.main
   ```

   (A simple entry point can import `RealtimeFeedProcessor` with a handler that
   uses existing enrichment services.)

4. Scrape Prometheus metrics at `http://localhost:9464/metrics`. The exporter
   publishes counters for processed, failed, and retried messages plus a
   histogram for processing latency.

## Alerting and Throughput Monitoring

The processor tracks throughput in a rolling window via the `ThroughputTracker`.
Expose the `feed_processor_retries_total`, `feed_processor_failed_total`, and
`feed_processor_latency_seconds_bucket` metrics to Prometheus. Example alert
rule:

```yaml
- alert: FeedProcessorLowThroughput
  expr: rate(feed_processor_processed_total[5m]) <
    on() group_left() scalar($FEED_PROCESSOR_PROM_ALERT_THRESHOLD)
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: Feed processor throughput is below the expected floor
```

## Performance Testing

Unit tests under `python/tests/test_feed_processor_performance.py` validate the
rolling throughput logic. Extend those tests with synthetic Kafka load generators
(e.g., `kafka_load_tester.py`) to benchmark production-sized traffic before a
rollout.

## Operational Tips

- Tune `processor.maxRetries` and `processor.retryBackoffSeconds` to reflect
  the stability of upstream connectors.
- Set `telemetry.prometheusAlertThreshold` to the minimum acceptable events per
  second for your environment; the deployment surfaces this value as
  `FEED_PROCESSOR_PROM_ALERT_THRESHOLD`.
- Always configure the OTLP exporter endpoint so traces and metrics join the
  global telemetry fabric.
