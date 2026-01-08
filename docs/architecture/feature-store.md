# Feature Store Scaffolding

## Goals

- Provide a software-only feature store contract aligned to the streaming intelligence model.
- Make feature lineage explicit so every derived value is traceable back to raw events.
- Keep format portable across Node, Go, and JVM services without introducing external brokers.

## Feature definition format

Feature specs are defined as YAML documents validated by `streaming/platform/feature-definition.schema.json`.

```yaml
featureId: risk_score
entity: account
version: 1.0.0
owner: fraud-intelligence
description: Risk score derived from behavioral deltas and device posture.
sources:
  - event: summit.account.login
    attributes: [ipReputation, deviceId]
  - event: summit.transaction.authorized
    attributes: [amount, merchantId, velocity]
transforms:
  - name: velocity_window
    type: tumbling
    window: 5m
    aggregation: count
lineage:
  parents:
    - summit.account.login@1.0
    - summit.transaction.authorized@1.0
  quality: gold
materialization:
  freshness: 30s
  retention: 30d
  storageClass: memory
observability:
  metrics:
    - name: feature_compute_duration_seconds
      type: histogram
  alerts:
    - name: feature_staleness_breach
      condition: freshness > 45s
```

### Key rules

- **Explicit lineage:** Every feature declares parents and quality tier.
- **Determinism:** Transform blocks must be pure and windowed; side effects belong in downstream actions, not feature derivation.
- **Versioning:** Semantic version increments on breaking schema or transform changes; downstream consumers pin to major versions.
- **Portability:** Field names and enums stay snake_case to map cleanly across languages.

## Storage and access patterns

- **Hot path:** In-memory cache keyed by `featureId` + entity key for low-latency reads.
- **Cold path:** Periodic checkpoints to append-only logs using the event log schema for replayability.
- **Lookup API:** Services retrieve features via lightweight HTTP/GRPC endpoints that respect version pins and freshness targets.

## Lineage and governance

- **Provenance records:** Each materialization emits an `feature.materialized` event referencing the source manifest IDs and feature version.
- **Auditability:** Feature definitions live in Git, validated in CI against the schema, and surfaced in the architecture catalog.
- **Change review:** Breaking changes require a deprecation window and dual-write of old/new versions until downstream consumers cut over.

## Observability

- **Metrics:** Feature pipelines export compute duration, cache hit ratio, and staleness gauges via `/metrics` endpoints (Prometheus format).
- **SLOs:** Default objectives target P99 < 200 ms for hot-path lookups and freshness under 60 seconds for streaming-derived features.
