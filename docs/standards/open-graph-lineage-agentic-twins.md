# Open Graph + Lineage + Agentic Twins Standard

## Purpose

Define Summit’s standards-first baseline for graph-native digital twins, graph-centered agent
orchestration, and open lineage emission. This standard is clean-room, interoperable, and
aligned to Summit’s readiness posture for evidence-first delivery.

## Scope

- Graph-native twin modeling using NGSI-LD-inspired property graph semantics.
- Graph hub orchestration routing specialized agents through graph context.
- OpenLineage emission for all agent actions and workflows.
- Optional Marquez integration for lineage observability and governance.
- OSINT ingestion that fuses into the knowledge graph and feeds action loops.

## Authority & Alignment

- Authority: Summit Readiness Assertion is the top readiness baseline for this standard.
- Alignment: Use shared definitions in Summit governance and architecture references.
- Governed Exceptions: Any deviation is recorded as a governed exception with an explicit rollback path.

## Concepts

### TwinGraph

A property-graph-first digital twin layer in Neo4j. A TwinGraph entity:

- Identified by a stable TwinEntityId.
- Holds typed properties (value, confidence, provenance).
- Expresses relationships as typed edges with provenance.

### GraphHub

A graph-centered orchestration layer that:

- Selects specialized agents based on graph state.
- Enforces policy checks and deny-by-default action envelopes.
- Emissions are lineage first, then side effects.

### LineageBus

OpenLineage emitter that:

- Builds deterministic Run events for each agent action.
- Redacts sensitive fields prior to emission.
- Supports file sink (deterministic artifacts) and HTTP sink (Marquez).
- Emits evidence-first artifacts before narrative summaries.

## Import / Export Matrix

### Import

- OSINT feeds → normalized entities and relationships.
- Action metadata → OpenLineage Run events.

### Export

- TwinGraph snapshots → JSON export.
- Lineage → OpenLineage JSON, compatible with Marquez.

## Non-goals

- RDF/OWL reasoning stacks or ontology parity layers.
- Proprietary ontology replication or Palantir-specific compatibility.

## Determinism Requirements

- Evidence artifacts are deterministic and exclude wall-clock timestamps.
- Evidence IDs are stable and derived from canonical JSON payloads.
- Any non-deterministic fields must be stripped before artifact emission.

## Feature Flag Policy

- All risky behavior must be behind feature flags default OFF.
- Flag enables are staged: dev → staging → production, per readiness gates.

## Evidence Artifacts

- `artifacts/lineage/report.json`
- `artifacts/lineage/stamp.json`
- `artifacts/lineage/metrics.json`

## Traceability

This standard is the authoritative mapping for open lineage + graph-native agentic twins and
should be referenced by future implementation PRs in this series.
