# ADR 001: Graph Store Choice

## Context
We need a graph store capable of entity resolution, provenance edges, and deterministic merge logic across tenant namespaces.

## Decision
We will use **Neo4j** as the core graph store, wrapped by a policy layer that enforces tenant namespacing via label prefixes.

## Rationale
Neo4j provides robust Cypher support, necessary for multi-hop provenance tracing. To ensure determinism and multi-tenancy, our application layer will inject tenant IDs into all queries.
