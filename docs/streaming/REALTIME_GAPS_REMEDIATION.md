# Real-Time Ingestion, Data Quality, and Lineage Remediation Plan

## Goals

- Add hardened real-time ingestion for Kafka and AWS Kinesis that ships events into the Summit event mesh with backpressure-aware delivery.
- Embed data quality validation at ingest and processing stages with deterministic failure handling and quarantine flows.
- Capture end-to-end data lineage (technical + business) for traceability, audit, and incident response.

## Target Architecture

- **Ingestion Layer**: Dual-source connectors
  - **Kafka**: Use `@intelgraph/kafka-integration` with idempotent producers, exactly-once semantics, and topic-level DLQs.
  - **Kinesis**: Mirror contract via Kinesis producer/consumer with enhanced fan-out for low-latency reads and shard-level checkpointing stored in DynamoDB or Postgres.
- **Schema & Contracts**: Avro/JSON schemas in Schema Registry with backward/forward compatibility checks during deployment.
- **Data Quality Gate**: Great Expectations (or in-house rules) invoked in two passes: synchronous (pre-enqueue) and asynchronous (post-transform) with a quarantine topic/stream and auto-ticketing on repeated failures.
- **Processing**: Stream processor uses deterministic checkpoints (e.g., Flink/Spark Structured Streaming) with watermarking for out-of-order events and replay-safe state recovery.
- **Lineage Capture**: OpenLineage-compatible events emitted on every ingest/transform/load step; persisted to the provenance ledger and exposed via a lineage API/UI.
- **Observability**: Distributed tracing (W3C trace context) propagated through producers/consumers; metrics for lag, throughput, error budgets, and validation failure ratios exported to Prometheus/Grafana.

## Implementation Steps

1. **Kafka Path**
   - Add `ingestion/kafka-consumer` service using `@intelgraph/kafka-integration` with EOS configs and per-topic DLQs.
   - Register schemas per topic; enable compatibility checks in CI via `pnpm run schema:check`.
2. **Kinesis Path**
   - Add `ingestion/kinesis-consumer` with enhanced fan-out, shard checkpoint persistence, and DLQ to SQS (or fallback Kinesis stream).
   - Provide IaC snippets (Terraform) for stream, IAM, and alarm provisioning.
3. **Data Quality Validation**
   - Implement `dq-rules` package with rule sets (null checks, range checks, reference integrity) and deterministic outcomes: `pass`, `soft_fail` (quarantine), `hard_fail` (drop + alert).
   - Wire validation to ingestion services (pre-enqueue) and stream processor (post-transform). Emit validation results to `dq.events` topic/stream.
4. **Lineage Tracking**
   - Emit OpenLineage events from ingestion and processor stages, including run/job facets for schema versions and validation outcomes.
   - Sync events to the provenance ledger service for long-term retention and to power lineage graph queries.
5. **Controls & SLOs**
   - Define SLOs: P99 ingestion < 250ms, validation failure rate < 0.5%, lineage emission success > 99.5%.
   - Add alerts for consumer lag, DLQ growth, validation error spikes, and lineage emitter failures.

## Rollout Phases

- **Phase 0 (This PR)**: Document remediation approach and add roadmap tracking entries.
- **Phase 1**: Stand up Kafka/Kinesis consumers with schemas and DLQs; enable basic validation rules.
- **Phase 2**: Expand validation coverage, add provenance hooks, and publish lineage UI endpoints.
- **Phase 3**: Harden with chaos testing, performance tuning, and compliance sign-off.

## Risks & Mitigations

- **Cross-stream schema drift**: Enforce CI schema checks and runtime compatibility validation; auto-block deployments on breaking changes.
- **Checkpoint corruption**: Store checkpoints in HA stores (DynamoDB/Postgres) with periodic verification and repair routines.
- **DLQ overload**: Rate-limit DLQ producers and auto-compact low-signal events; ship DLQ metrics to alerting policies.
- **Lineage gaps**: Make lineage emission part of the critical path with retry budgets; add synthetic probes to confirm coverage.

## Forward-Leaning Enhancements

- **Adaptive workload routing**: Auto-shift ingest between Kafka and Kinesis based on congestion signals.
- **Feature store alignment**: Capture validation facets as features for downstream ML quality gating.
- **Policy-as-code hooks**: Route validation outcomes through OPA/Rego policies for tenant-specific rules without code changes.
