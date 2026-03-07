# TwinGraph Architecture

## Summary

TwinGraph is Summit’s graph-native digital twin layer built on property graph semantics. It
provides structured entity, property, and relationship primitives that can be read/written by
agent workflows and traced with deterministic lineage.

## Goals

- Provide a canonical twin data model aligned with NGSI-LD-style property graphs.
- Enable agent workflows to read/write twin state with deterministic lineage.
- Keep modeling interoperable and clean-room, avoiding proprietary ontology dependencies.
- Preserve clean-merge behavior by constraining high-risk changes to explicit gates.

## Component Topology

1. **TwinOntology**
   - Defines schema primitives: Entity, Property, Relationship.
   - Uses stable identifiers and provenance-ready fields.
2. **TwinGraph Store (Neo4j)**
   - Persists twin entities and relationships.
   - Enforces deterministic write conventions.
3. **GraphHub Router**
   - Selects specialist agents using graph state + policy context.
   - Denies actions not explicitly allowed.
4. **LineageBus**
   - Emits OpenLineage run events for each action stage.
   - Produces deterministic artifacts for auditability.
5. **Marquez Observatory**
   - Consumes OpenLineage events for run/job visibility.

## Data Model (Conceptual)

- **TwinEntity**: stable `id`, `type`, `properties`, `relationships`.
- **TwinProperty**: `value`, optional `confidence`, optional `provenance`.
- **TwinRelationship**: `type`, `object`, optional `provenance`.

## Action Flow (Golden Path)

1. GraphHub receives canonical `AgentAction` envelope.
2. Policy engine evaluates action (deny-by-default).
3. TwinGraph context is fetched and attached as lineage inputs.
4. Specialist executes action.
5. TwinGraph updates are persisted.
6. LineageBus emits START/COMPLETE events and deterministic artifacts.

## Determinism & Observability

- Persisted evidence excludes wall-clock timestamps.
- Stable event IDs are derived from canonicalized payloads.
- Emission overhead budget target: p95 < 25ms/action.

## Security & Governance

- Deny-by-default action envelopes and policy enforcement.
- Never-log list applied before lineage emission.
- Governed Exceptions require recorded rationale and rollback steps.
- CODEOWNERS-protected surfaces remain untouched without countersign.

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Observability, Security.
- **Threats Considered**: prompt injection, graph tampering, lineage exfiltration, policy drift.
- **Mitigations**: strict action schemas, append-only audit sink, redaction pipeline,
  policy-gated execution.

## Integration Boundaries

- TwinGraph is authoritative for graph-native twins.
- External systems integrate through connectors and export APIs.
- `server/src/*` remains the canonical implementation zone for backend changes.
