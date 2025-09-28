# Data Spine MVP Delivery Plan

## Mission Overview

- **Objective:** Governed data movement with versioned schemas, full lineage capture, and regional residency enforcement.
- **Timebox:** 6 weeks.
- **Scope:**
  - Schema registry supporting Avro/Protobuf with semantic version contracts and linting gates.
  - OpenLineage-compatible event emission with a lightweight visualization surface.
  - Change data capture (CDC) pipeline from OLTP sources into analytics sinks with residency checks.
  - Residency guardrails aligned to classification matrix and security gates (PII tagging, egress denial, retention policies).

## Delivery Breakdown

### Week 1 – Foundations

- Author ADR in `adr/0002-data-spine.md` documenting architectural choices.
- Stand up golden dashboards (`dashboard/grafana/data-spine-lag.json`) and alert routing (`alertmanager/data-spine.yml`).
- Enable cosign/provenance verification in CI (`.github/workflows/data-spine-supply-chain.yml`) and admission policies (`controllers/admission/cosign-policy.yaml`).
- Bootstrap schema registry service, CLI, and synthetic probes.

### Week 2 – Schema Contracts

- Implement Avro/Protobuf lint rules (PII tagging, retention hints) and semantic version enforcement.
- Add compatibility validation endpoints and CLI workflows.
- Publish initial classifications/residency matrix (`schema/data-residency-matrix.yaml`).

### Week 3 – CDC Enablement

- Define Debezium-based CDC route (`streaming/cdc/data-spine.yaml`).
- Wire residency gate (`services/router/residency_gate.py`) to evaluate routes against policy.
- Configure DLQ/replay options (`streaming/cdc/data-spine.yaml#dead-letter` section).

### Week 4 – Lineage Telemetry

- Ship OpenLineage emitter (`services/data-spine/lineageEmitter.js`) and persist events for UI consumption.
- Build lightweight lineage explorer UI (`web/data-spine-lineage/index.html`).
- Emit provenance snapshots into `.evidence/` and link via `.prbodies/` templates.

### Week 5 – Controls & Testing

- Expand synthetic journeys (`synthetics/journeys/data-spine.probe.ts`) for schema publish/validate/lineage smoke.
- Validate residency gate using sample matrices and CDC config.
- Capture CDC lag metrics into Grafana dashboard panels.

### Week 6 – Hardening & Evidence

- Document SLO posture, risk mitigations, and runbooks under `.evidence/`.
- Capture schema diffs, lineage UI screenshots, and CDC lag graphs as evidence.
- Final readiness review referencing DoR/DoD checklists.

## Service Level Objectives

| Capability                | Target        | Notes                                                                                |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| Schema validation latency | p95 < 50 ms   | Inline timings exposed through `Server-Timing` header.                               |
| CDC replication lag       | p95 < 60 s    | Dashboard panel `cdc_lag_p95` and Alertmanager route `data-spine-lag`.               |
| Lineage event delivery    | 99.9% success | `lineageEmitter` retries with exponential backoff and writes to DLQ file on failure. |

## Security Gates

- **PII tagging:** enforced by schema lint rules; blocking error when suspicious fields lack `[pii]` annotations.
- **Residency:** policy gate denies replication to regions disallowed by matrix; CLI surfaces violation reason codes.
- **Retention policies:** Protobuf lint warns when string/bytes fields omit `retain=duration` tag.
- **Cosign verification:** admission controller policy validates signed OCI provenance before workloads are scheduled.

## Operational Artifacts

- **Schema Registry REST API:** `/schemas/{subject}/versions`, `/schemas/{subject}/validate`, `/schemas`.
- **CLI:** `node tools/schema-cli/index.js publish|validate|subjects|latest` (supports metadata injection).
- **Lineage Events:** JSON payloads conforming to OpenLineage 1.0 semantics, persisted to `services/data-spine/lineage-events.json`. UI polls this file for visualization.
- **CDC Config:** `streaming/cdc/data-spine.yaml` referencing sources, sinks, and residency guard.
- **Residency Matrix:** `schema/data-residency-matrix.(yaml|json)` enumerates classification (PII, PCI, Restricted) per target geography.

## Evidence Strategy

- Weekly artifacts placed under `.evidence/data-spine/` with signed manifest.
- `.prbodies/data-spine.md` links metrics snapshots, schema diffs, and lineage screenshots.
- Synthetic probe runs stored in `runs/synthetics/data-spine/` (created by CI jobs).

## Risks & Mitigations

- **Breaking schema changes:** compatibility gates and CLI validation before publish.
- **Sink outages:** CDC config includes DLQ topic and replay script pointers.
- **Lineage drop:** emitter persists to disk before HTTP send and surfaces metrics on dashboard.

## Next Steps

- Integrate privacy budget accounting (Track B) once MVP stabilizes.
- Extend residency gate to support dynamic policy updates via OPA bundles.
- Expand lineage UI with filtering and run-level drill downs.
