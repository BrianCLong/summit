# Database Schema (Neo4j)

This document describes the Graph Data Model used in Neo4j.

## Core Concepts

The data model is centered around **Entities** and **Relationships** with support for **Provenance** and **Policy**.

## Nodes (Labels)

### `Entity`

The base label for all domain objects.

- **Properties**:
  - `id` (String, UUID): Unique identifier.
  - `type` (String): e.g., "Person", "Organization".
  - `createdAt` (DateTime): Creation timestamp.
  - `updatedAt` (DateTime): Last update.
  - `confidence` (Float): 0.0 - 1.0.

### Specific Entity Labels

- `Person`
- `Organization`
- `Location`
- `Event`
- `Document`

### `Agent`

Represents an actor (user or AI) that performed an action.

- `id`: Agent ID.
- `lastActive`: Timestamp.

### `Entry` (Provenance)

Represents a write operation or data source event.

- `id`: Ledger Entry ID.
- `action`: Type of action (e.g., "ingest", "edit").
- `timestamp`: When it happened.
- `tenantId`: Multi-tenancy isolation.

## Relationships

### Domain Relationships

Dynamic relationships between entities.

- **Type**: Variable (e.g., `WORKS_FOR`, `LOCATED_IN`, `KNOWS`).
- **Properties**:
  - `start` (DateTime): Validity start.
  - `end` (DateTime): Validity end.
  - `confidence` (Float).
  - `evidenceRef` (String): Pointer to source evidence.

### System Relationships

- `(Agent)-[:GENERATED]->(Entry)`: Who created the entry.
- `(Entry)-[:EVIDENCED]->(Entity)`: Which entry supports the entity.

## Indexes & Constraints

We assume the following constraints for performance and integrity:

```cypher
CREATE CONSTRAINT FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE INDEX FOR (e:Entity) ON (e.type);
CREATE INDEX FOR (e:Entity) ON (e.createdAt);
```

## Example Query

**Find all connections for a person:**

```cypher
MATCH (p:Person {name: "John Doe"})-[r]-(connected)
RETURN p, r, connected
```

**Find provenance of a node:**

```cypher
MATCH (e:Entity {id: $id})<-[:EVIDENCED]-(entry:Entry)<-[:GENERATED]-(agent:Agent)
RETURN entry, agent
```
