# 0002 – Data Spine Governance Architecture

- Status: Accepted
- Date: 2025-02-17
- Stakeholders: Data Platform, Security, Analytics Engineering
- Deciders: Data Spine Working Group
- Context: Need unified controls for schema governance, CDC, and lineage.

## Problem Statement

Analytics teams require governed data movement from OLTP systems into analytic stores with:

1. Versioned schemas covering Avro/Protobuf payloads.
2. Observable lineage across ingestion, processing, and delivery.
3. Residency and privacy enforcement aligned to regulatory obligations.

Existing schema tooling was ad-hoc and lacked compatibility checks. Lineage events were not standardized and residency policy lived outside CI/CD.

## Decision

Adopt a dedicated "Data Spine" control plane composed of:

- **Schema Registry Service** (`services/schema-registry/`) persisting schemas with semantic versioning, linting (PII tags, retention hints), and compatibility enforcement.
- **Registry CLI** (`tools/schema-cli/`) for engineers to publish/validate schemas before deploy gates.
- **OpenLineage Event Layer** (`services/data-spine/lineageEmitter.js`) emitting run events to downstream analytics and UI visualizer.
- **CDC Pipeline** using Debezium/Kafka connectors (`streaming/cdc/data-spine.yaml`) with DLQ + replay hooks.
- **Residency Gate** (`services/router/residency_gate.py`) consulted in deployment and replication flows, referencing `schema/data-residency-matrix.yaml`.
- **Supply Chain Controls** via cosign verification in CI (`.github/workflows/data-spine-supply-chain.yml`) and admission policy (`controllers/admission/cosign-policy.yaml`).

## Consequences

- Positive: Unified governance artifacts, faster detection of incompatible schema changes, improved lineage observability, automated residency enforcement.
- Negative: Additional tooling to maintain (registry service & CLI). Requires training for teams migrating from legacy flows.
- Follow-up: Integrate privacy budget telemetry (Track B) and extend OPA policy bundles for dynamic residency updates.

## Alternatives Considered

1. **Reuse Confluent Schema Registry** – rejected due to licensing + lack of custom linting/residency logic.
2. **Embed schema checks in CI only** – fails to provide runtime discoverability or CLI guardrails.
3. **Rely on data catalog lineage** – insufficient real-time coverage and no CDC coupling.

## References

- `.github/workflows/data-spine-supply-chain.yml`
- `docs/data-spine-mvp.md`
- `streaming/cdc/data-spine.yaml`
- `.evidence/data-spine/2025-02-17-sprint1.md`
