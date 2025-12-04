# Real-Time Streaming Platform (Kafka + Pulsar)

This blueprint stitches Apache Kafka and Apache Pulsar into a cohesive streaming fabric with end-to-end guarantees, Kafka Streams analytics, and operational guardrails. It is designed for multi-tenant domains that need fast ingestion, stateful processing, and tiered messaging (log + pub/sub) without sacrificing exactly-once semantics.

## Architecture Overview

- **Ingress Layer**: Fastify ingress gateway (see `streaming/ingest-gw`) accepts HTTPS events, validates schema, and produces to Kafka using idempotent producers with entity-key partitioning.
- **Log Layer (Kafka)**: Durable append-only log for ordered, partitioned writes; enables Kafka Streams topologies with exactly-once processing (`EXACTLY_ONCE_V2`).
- **Pub/Sub Layer (Pulsar)**: Pulsar namespaces host fan-out consumers, long-term storage tiers, and topic-level isolation for multi-tenant analytics.
- **Bridge**: Pulsar Kafka-compatibility protocol handler (`pulsar-kafka-compat`) exposes Kafka APIs to Pulsar, while Kafka Connect + Pulsar IO mirror topics in both directions for hybrid workloads.
- **Stream Processing**: `streaming/stream-jobs` (Kotlin/Kafka Streams) enriches events with features, emits scores and alerts, and publishes 1-minute analytics aggregates.
- **Serving**: `alerts-api` streams alerts via SSE/WebSockets; downstream OLAP sinks (e.g., Pinot/Druid) ingest `alerts.analytics.v1` for dashboards.
- **Observability**: Metrics via JMX + OpenTelemetry exporters; logs shipped to Loki; traces from ingress to analytics with shared `trace_id` header propagated to Kafka/Pulsar message headers.

```
Clients -> Ingress Gateway -> Kafka (log) <-> Pulsar (pub/sub bridge)
                               |                     |
                          Kafka Streams         Pulsar Functions
                               |                     |
                       alerts.v1 / analytics   topic-level fan-out
```

## Topic & Partitioning Strategy

- **Keys**: Use stable entity identifiers as keys to keep joins collocated. In `Topology.kt`, `selectKey` enforces the entity key for all subsequent operators.
- **Partitions**: Default to 12–24 partitions for high-volume topics; scale using `StreamPartitioner` to hash the entity key and maintain ordering per entity.
- **Replication**: Replication factor 3 for log durability; min in-sync replicas 2; Pulsar uses 3-bookie ensemble/2-write quorum.
- **Retention**: Kafka topics log-compacted for reference data (`features.entity.v1`), time-based retention for raw and alerts; Pulsar namespaces configured with TTL + offload to tiered storage.

## Exactly-Once Processing

- Kafka Streams properties (also applied in `App.kt`):
  - `processing.guarantee=exactly_once_v2`
  - `commit.interval.ms=10000`
  - Producer idempotence (`enable.idempotence=true`, `acks=all`, `max.in.flight.requests.per.connection=1`)
  - State stores on fast SSD and backed by changelog topics with compaction.
- Transactional sinks: `signals.scores.v1`, `alerts.v1`, and `alerts.analytics.v1` are written in a single transaction per task to avoid duplicates.
- Cross-cluster: Use Kafka MirrorMaker 2.0 or Pulsar IO Kafka source with transactional consumption disabled but idempotent sink writes; replay protection via dedupe keys stored in Redis/Spanner if bridging to external systems.

## Consumer Groups & Backpressure

- Kafka Streams app ID acts as the consumer group; horizontal scale by adding stream threads or instances.
- For Pulsar consumers, use **KeyShared** subscription to preserve key ordering while scaling.
- Apply `max.poll.interval.ms` tuning to handle long joins, and `queued.max.requests`/`receiveQueueSize` in Pulsar to balance throughput vs. memory.
- Dead-letter queues (DLQs) for both Kafka (via error-handling topics) and Pulsar (via negative-ack redelivery with cap).

## Stream Analytics & SLOs

- `alerts.analytics.v1` emits per-entity 1-minute counts for downstream dashboards and anomaly detection.
- Additional windows can be layered (5m/1h) via the same topology using `TimeWindows` to feed SLOs (e.g., alert rate p95, enrich latency p99).
- Expose metrics: `kafka_streams_task_lag`, `commit_latency_ms`, `process_latency_ms`, `pulsar_subscribe_rate`, and bridge replication lag.
- Alerts: page when E2E lag > 2 minutes, processing failure rate > 0.1%, or DLQ growth > 100 msgs/min.

## Deployment Blueprint

- **Local**: Use Redpanda for Kafka API + Pulsar standalone with Kafka compatibility to validate the bridge quickly. Run `App.kt` with `BOOTSTRAP_SERVERS=localhost:9092`.
- **Kubernetes**: Deploy Kafka (Strimzi) and Pulsar (StreamNative or Helm) in separate namespaces; co-locate brokers with SSD-backed StatefulSets. Istio/Linkerd mTLS between services.
- **CI/CD**: Build and test Kotlin topology via Gradle; contract tests for ingress; integration tests in CI to validate transactional delivery and bridge mirroring.
- **Security**: mTLS for brokers and clients, SCRAM for dev. Encrypt data at rest, rotate secrets via external vault. Enable Pulsar authz with namespaces per tenant.

## Next Steps & Enhancements

- Add **Pulsar Functions** to perform lightweight feature computation near storage.
- Introduce **ksqlDB** or **Flink SQL** for ad-hoc analytics on top of the same topics.
- Enable **tiered storage** for Kafka to align with Pulsar's offload and reduce broker disk pressure.
- Add **Protobuf/Avro** schemas with Schema Registry + Pulsar Schema Registry for strong typing and evolution.
