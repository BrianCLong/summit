# TwinGraph Architecture

## Summary

TwinGraph is Summit’s graph-native digital twin layer built on property graph semantics.
It provides structured entity, property, and relationship primitives that can be read/written
by agent workflows and traced with open lineage.

## Goals

- Provide a canonical twin data model aligned with NGSI-LD-style property graphs.
- Enable agent workflows to read/write twin state with deterministic lineage.
- Keep modeling interoperable and clean-room, avoiding proprietary ontology dependencies.

## Components

### TwinOntology

- Defines the schema primitives: Entity, Property, Relationship.
- Uses stable identifiers and typed properties with provenance.

### TwinGraph Store

- Neo4j-based store for twin entities and relationships.
- Enforces deterministic, policy-validated operations.

### GraphHub Integration

- Agent actions reference twin entities as graph datasets.
- Lineage facets tie actions to twin inputs and outputs.

## Data Model (Conceptual)

- **TwinEntity**: stable `id`, `type`, `properties`, `relationships`.
- **TwinProperty**: `value`, optional `confidence`, optional `provenance`.
- **TwinRelationship**: `type`, `object`, optional `provenance`.

## Determinism & Observability

- All persisted evidence must be deterministic (no timestamps).
- Lineage emission is mandatory for twin updates and queries.

## Security & Governance

- Deny-by-default action envelopes and policy enforcement.
- Never-log list applied before lineage emission.
- Governed Exceptions require recorded justification and rollback steps.

## MAESTRO Alignment

**MAESTRO Layers**: Foundation, Data, Agents, Observability, Security.

## Integration Boundaries

- The TwinGraph layer is authoritative for graph-native twins.
- External systems integrate via ingestion adapters and export APIs.
