# Open Graph + Lineage + Agentic Twins Standard

## Purpose

Define Summit’s standards-first baseline for graph-native digital twins, graph-centered agent
orchestration, and open lineage emission. This standard is clean-room, interoperable, and
aligned to the Summit Readiness Assertion for evidence-first delivery.

## Scope

- Graph-native twin modeling using NGSI-LD-inspired property graph semantics.
- Graph hub orchestration routing specialized agents through graph context.
- OpenLineage emission for all agent actions and workflows.
- Optional Marquez integration for lineage observability and governance.
- OSINT ingestion that fuses into the knowledge graph and feeds action loops.

## Authority & Alignment

- Authority: `docs/SUMMIT_READINESS_ASSERTION.md` is the governing readiness contract.
- Alignment: shared definitions from governance and architecture references are mandatory.
- Governed Exceptions: any deviation must include rationale, owner, rollback trigger, and rollback
  steps.

## Concepts

### TwinGraph

A property-graph-first digital twin layer in Neo4j. A TwinGraph entity:

- is identified by a stable TwinEntityId,
- holds typed properties (`value`, `confidence`, `provenance`), and
- expresses relationships as typed edges with provenance.

### GraphHub

A graph-centered orchestration layer that:

- selects specialized agents based on graph state,
- enforces policy checks and deny-by-default action envelopes, and
- emits lineage before side effects commit.

### LineageBus

OpenLineage emitter that:

- builds deterministic Run events for each agent action,
- redacts sensitive fields before emission,
- supports file sink (deterministic artifacts) and HTTP sink (Marquez), and
- emits evidence artifacts before narrative summaries.

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
- Non-deterministic fields are stripped before artifact emission.

### Evidence ID Pattern

`EVID:<git_sha>:<pipeline>:<step>:<stable_hash>`

Where `stable_hash = sha256(canonical_json_without_timestamps)`.

## Feature Flag Policy

- All risky behavior is behind feature flags default OFF.
- Enablement progression is dev → staging → production.
- Production enablement requires explicit SLO watch window and rollback trigger.

## MWS Acceptance Contract

1. Unit tests verify `AgentAction` emits deterministic OpenLineage START/COMPLETE events.
2. E2E path verifies at least one job and one run are visible through Marquez API.
3. Deterministic artifacts are generated:
   - `artifacts/lineage/report.json`
   - `artifacts/lineage/metrics.json`
   - `artifacts/lineage/stamp.json`

## CI Mapping (Clean Merge Contract)

- `pnpm test` validates unit-level behavior.
- `pnpm test:e2e` validates Marquez/OpenLineage e2e integration.
- `pnpm lint` + `pnpm typecheck` preserve merge gate hygiene.
- `make smoke` remains required when touching golden-path surfaces.

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Observability, Security.
- **Threats Considered**: OSINT poisoning, policy bypass, lineage exfiltration, graph tampering.
- **Mitigations**: source allowlist + quarantine, deny-by-default policy envelope, never-log
  redaction, append-only audit chain.

## Traceability

This standard is authoritative for open lineage + graph-native agentic twins and is referenced by
implementation PRs in this sequence.
