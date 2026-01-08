# Streaming Intelligence Blueprint

## Purpose

This blueprint defines how Summit delivers software-only, real-time intelligence without relying on external brokers. It clarifies the live intelligence model, event flow, observability, and the feature lineage contract required to keep downstream models auditable.

## Live intelligence model

- **Signal-first ingestion:** Normalize every ingress as an immutable event envelope defined by `streaming/platform/event-log.schema.json`.
- **Derived feature taps:** Event payloads are enriched with feature taps declared in the feature store manifest (`streaming/platform/feature-definition.schema.json`). Each tap produces feature deltas rather than full materializations to keep latency predictable.
- **Async intelligence workers:** Lightweight async workers evaluate the live model and emit decision deltas. Workers are stateless, pulling feature context from the in-memory store and persisting results back to the append-only event log.
- **Feedback loop:** Every emitted decision includes the lineage pointer (`lineage.runId` + `lineage.parents[]`) to guarantee explainability and model accountability.

## Event flow

1. **Ingress:** `ingest-gw` accepts JSON over HTTP, validates against the event log schema, and appends to `ingest.raw.v1`.
2. **Feature hydration:** A background hydrator joins raw events with cached feature values and emits `feature.delta.v1` events that reference the originating manifest IDs.
3. **Intelligence evaluation:** The live model consumes `feature.delta.v1` events, executes async rules, and emits `intelligence.decision.v1` envelopes.
4. **Delivery:** `alerts-api` streams `intelligence.decision.v1` over Server-Sent Events (SSE) for immediate consumption.

## Async processing stubs

The pipeline is intentionally software-only and broker-agnostic. Replace the queue layer with in-memory channels when Kafka is unavailable.

```ts
// Pseudocode stub for an async intelligence worker
async function processDelta(delta) {
  const ctx = await featureStore.loadContext(delta.key);
  const score = liveModel.score({ ...delta, context: ctx });
  await emitDecision({
    decisionId: uuid(),
    key: delta.key,
    score,
    lineage: { parents: [delta.eventId], featureVersion: ctx.version },
  });
}
```

## Observability (metrics-only hooks)

- **Ingress:** `ingest_events_total{result="accepted|rejected|failed"}` and `ingest_produce_duration_seconds` histogram wrap HTTP ingest and produce time.
- **Delivery:** `alert_stream_clients` gauge tracks active SSE connections and `alerts_streamed_total` counter tallies delivered decisions.
- **Health:** All streaming services expose `/metrics` (Prometheus text format) for scrape-based health and capacity dashboards.

## Failure semantics

- **At-least-once delivery** inside each process with idempotent consumers keyed by `manifestId`.
- **Quarantine** on schema violation; quarantined events are emitted as `*.deadletter` with reason codes.
- **Replay** by re-hydrating the event log; feature lineage guarantees deterministic rebuilds of the intelligence model state.
