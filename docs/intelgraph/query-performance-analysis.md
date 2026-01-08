# IntelGraph Query Performance Analysis

## Overview

This document analyzes the current state of Cypher queries within the IntelGraph layer, focusing on performance, scalability, and complexity. It identifies bottlenecks and proposes optimizations.

## Key Findings

### 1. `GraphOpsService.js` (Interactive Hot Paths)

#### `expandNeighbors`

- **Query**:
  ```cypher
  MATCH (n:Entity {id: $entityId})-[r]-(m:Entity)
  WITH DISTINCT m, r LIMIT $limit
  RETURN ...
  ```
- **Analysis**:
  - **Label Scans**: `MATCH (n:Entity {id: ...})` relies on an index on `:Entity(id)`. If this is missing, it's a full label scan.
  - **Type-Agostic Expansion**: `-[r]-` expands all relationship types. If the graph has many utility or system relationships, this will be noisy and slow.
  - **Post-Expansion Limit**: `LIMIT` is applied after fetching `m` and `r`. For supernodes, this expands everything before limiting.
  - **Recommendations**:
    - Ensure index on `:Entity(id)`.
    - If possible, restrict relationship types (e.g., `-[r:RELATIONSHIP]-`).
    - Use `LIMIT` earlier if possible, though `WITH DISTINCT` makes it tricky.

#### `expandNeighborhood`

- **Query**:
  ```cypher
  MATCH (n:Entity {id: $entityId, tenantId: $tenantId, ...})
  MATCH p = (n)-[r:RELATIONSHIP*1..$radius]-(m:Entity {tenantId: $tenantId, ...})
  ...
  ```
- **Analysis**:
  - **Unbounded Expansion Risks**: `*1..$radius` with `radius > 2` leads to exponential explosion.
  - **Filtering**: Filters on `m` (tenantId) are applied during traversal (good), but `RELATIONSHIP` type seems generic.
  - **Recommendations**:
    - Hard cap `radius` in the service (e.g., max 3).
    - Consider `apoc.path.subgraphNodes` or `apoc.path.spanningTree` for more efficient expansion if APOC is available.

### 2. `GraphAnalyticsService.js` (Heavy Jobs)

#### `calculateBasicMetrics`

- **Query**:
  ```cypher
  MATCH (n) ... WITH count(n) ...
  MATCH ()-[r]->() ... WITH ...
  MATCH (n)-[r]->() ...
  ```
- **Analysis**:
  - **Full Scans**: `MATCH (n)` scans every node in the database. `MATCH ()-[r]->()` scans every relationship.
  - **Inefficient predicates**: `WHERE n.investigation_id = ...` is applied after the scan.
  - **Redundant Scans**: Scans the graph multiple times (once for nodes, once for edges, once for degrees).
  - **Recommendations**:
    - Use label-specific matches: `MATCH (n:Entity)`.
    - Push predicates: `MATCH (n:Entity {investigation_id: $investigationId})`.
    - Combine aggregations into a single pass where possible.

#### `calculateCentralityMeasures`

- **Query**:
  ```cypher
  MATCH path = allShortestPaths((n)-[*]-(m)) WHERE n <> m ...
  ```
- **Analysis**:
  - **Complexity**: $O(N^2)$ all-pairs shortest path. This is computationally infeasible for graphs with > 100 nodes.
  - **Blocking**: Will likely timeout or crash the memory.
  - **Recommendations**:
    - Replace with approximation or limit the set of `n` and `m` significantly.
    - Use GDS (Graph Data Science) library if available (`gds.betweenness`).
    - If GDS is not available, implement a localized centrality (e.g. only for top degree nodes).

#### `detectCommunities`

- **Query**:
  ```cypher
  MATCH path = (n)-[*]-(m)
  ```
- **Analysis**:
  - **Infinite Expansion**: `[*]` finds _all_ paths of _any_ length. This will loop indefinitely in cyclic graphs or explode in size.
  - **Recommendations**:
    - Use Weakly Connected Components (WCC) algorithm (GDS) or a simple neighbor expansion with fixed depth.
    - Rewrite to finding connected components via traversal if GDS is missing.

#### `calculatePageRank`

- **Analysis**:
  - Fetches the _entire graph_ (`MATCH (n)-[r]->(m) RETURN ...`) into Node.js memory and calculates PageRank in JavaScript.
  - **Bottleneck**: Network transfer and Node.js heap limit.
  - **Recommendations**:
    - Use GDS `gds.pageRank` if available.
    - If not, this is acceptable only for small subgraphs (investigations). Must enforce strict node limits.

## Optimization Plan

1.  **Index Verification**: Ensure `:Entity(id)`, `:Entity(tenantId)`, `:Entity(investigationId)` are indexed.
2.  **`GraphOpsService` Rewrite**: Optimize `expandNeighbors` to be safer.
3.  **`GraphAnalyticsService` Rewrite**:
    - Fix the Cartesian products and full scans.
    - Cap the "deep" analytics queries to prevent server crashes.
    - Rewrite `calculateBasicMetrics` to be a single efficient pass.

## Targeted Optimizations (Phase 1)

We will apply the following changes:

1.  **Refactor `expandNeighbors`**: Add input validation and optimize the Cypher to use specific relationship types if applicable, or just rely on index lookups.
2.  **Fix `calculateBasicMetrics`**: Combine into one query using `MATCH (n:Entity)` and aggregation.
3.  **Safeguard `detectCommunities`**: Replace `[*]` with `[*1..3]` or similar bound, or use a better approach for components.
