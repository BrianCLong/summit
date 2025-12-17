# IntelGraph Architecture & Analytics

## Overview

IntelGraph is the investigative spine of the Summit platform, providing a multi-tenant, policy-aware graph engine for modeling entities, relationships, events, and signals. It enables analysts to discover hidden structures, communities, chokepoints, and flows.

## Core Models

### Entity
Represents a node in the graph (e.g., Person, Organization, Account).

```typescript
interface Entity {
  id: string;
  tenantId: string;
  type: string;
  label: string;
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
}
```

### Edge
Represents a directed relationship between two entities.

```typescript
interface Edge {
  id: string;
  tenantId: string;
  type: string;
  fromEntityId: string;
  toEntityId: string;
  weight?: number;
  attributes: Record<string, unknown>;
}
```

### Investigation Session
Persists the state of an analyst's investigation workbench.

```typescript
interface InvestigationSession {
  id: string;
  tenantId: string;
  graphState: {
      focusedEntityIds: string[];
      visibleEdges: string[];
      pinnedNotes: Array<{entityId?: string, text: string}>;
  };
}
```

## Architecture

- **Storage**: Hybrid approach using Neo4j for graph traversal and Postgres for session state/metadata.
- **Service Layer**:
  - `Neo4jGraphService`: Handles CRUD and basic searches.
  - `Neo4jGraphAnalyticsService`: Executes algorithms (Shortest Path, Centrality, Community Detection).
  - `GraphPatternService`: Executes complex pattern matching queries.
- **API**: REST endpoints at `/api/v1/graph/`.

## Analytics Algorithms

IntelGraph supports the following on-demand analytics:

1.  **Shortest Path**: Find the most direct connection between two entities (max 6 hops by default).
2.  **k-Hop Neighborhood**: Expand the graph around a set of seed nodes.
3.  **Degree Centrality**: Identify highly connected nodes within a scope.
4.  **Anomaly Detection**: Detect nodes with statistically significant high degrees (Z-score based).

## Integration

- **Audit**: All graph mutations and heavy queries are audited to `ProvenanceLedger`.
- **Quotas**: Usage is metered via `QuotaManager`.
- **Security**: Strict tenant isolation is enforced at the query level.

## Usage

### Pattern Search API
```json
POST /api/v1/graph/patterns/search
{
  "pattern": {
    "nodes": [
      { "alias": "a", "types": ["person"] },
      { "alias": "b", "types": ["account"] }
    ],
    "edges": [
      { "from": "a", "to": "b", "types": ["owns"] }
    ]
  }
}
```
