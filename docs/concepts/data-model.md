---
title: Data Model
summary: Core schema and conventions for entities, relationships, and provenance.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Data Model

Summit uses a property graph model (Neo4j) augmented by relational storage (PostgreSQL) for strict schemas and document storage.

## Core Abstractions

### Entity

The fundamental node in the graph.

- **id**: Unique identifier (UUID).
- **type**: Domain type (e.g., `Person`, `Organization`, `Location`).
- **confidence**: Score [0, 1] indicating trust in this entity's existence.
- **props**: JSON map of arbitrary properties.
- **createdAt/updatedAt**: ISO-8601 timestamps.

### Relationship

The directed edge between two Entities.

- **src / dst**: IDs of the source and destination entities.
- **kind**: The predicate (e.g., `WORKS_FOR`, `LOCATED_AT`).
- **confidence**: Score [0, 1]. Derived edges generally take the lower confidence of their parent evidence.
- **evidenceRef**: Reference to object storage containing the source document/blob.
- **start / end**: Optional temporal bounds (ISO-8601) for the relationship.

### Provenance

Strict tracking of _where_ data came from.

- **source**: The origin (e.g., "OSINT Feed A").
- **collector**: The internal service/agent that ingested it.
- **fetchedAt**: Timestamp of ingestion.
- **hash**: Content hash for verification.

## Schema Conventions

### Temporal Data

- Use ISO-8601 strings.
- Open intervals are allowed (e.g., `start` defined, `end` null means "ongoing").

### Confidence Scoring

- Range: 0.0 to 1.0.
- Default: 0.5.
- Application: Used by the AI Copilot and graph algorithms to filter "noise" or "weak signals".

## Graph Implementation (Cypher)

Entities are merged by ID to ensure idempotency during ingestion.

```cypher
MERGE (e:Entity {id:$id})
SET e.type=$type, e += $props, e.confidence=coalesce($confidence, 0.5)
```

Relationships represent the semantic glue:

```cypher
MERGE (src)-[r:REL {kind:$kind}]->(dst)
SET r.confidence=$confidence, r.evidenceRef=$evidenceRef
```
