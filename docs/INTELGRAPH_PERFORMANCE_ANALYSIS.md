# IntelGraph Query Layer: Formal Performance & Complexity Analysis

## 1. Executive Summary

The IntelGraph Query Layer relies on Neo4j for graph storage and query execution, augmented by a custom sharding layer (`GraphRouter`) and semantic search capabilities (`SemanticSearchService`). The current architecture exhibits several critical performance bottlenecks, particularly in multi-tenant environments and high-degree node traversals.

Key findings:
- **Unbounded Expansion**: `expandNeighborhood` queries have $O(d^k)$ complexity and are vulnerable to "supernode" explosion.
- **Analytics Overhead**: `GraphAnalyticsService` uses anonymous GDS projections, incurring significant overhead for every execution ($O(V+E)$ projection cost).
- **Vector Search Recall Failure**: `SemanticSearchService` performs global KNN before filtering by tenant, potentially returning zero results for valid queries in a multi-tenant index.
- **Memory Pressure**: Aggregating full results in memory (`collect(...)`) before streaming causes heap pressure on both the DB and API server.

---

## 2. Query Type Analysis

### 2.1. Neighborhood Expansion (k-Hop)

*   **Endpoint**: `GraphOpsService.expandNeighborhood`
*   **Pattern**: Breadth-First Search (BFS) / Pattern Match
*   **Complexity**: $O(d^k)$ where $d$ is average degree, $k$ is radius.
*   **Worst-Case Trace**: Starting at a supernode (e.g., "Internet" or "USA") with $d > 10,000$ and $k=2$.
*   **Memory Cost**: $O(d^k \times \text{size(node)})$. All nodes/edges are materialized in memory via `collect()`.
*   **Performance Bounds**:
    *   $k=1$: < 50ms
    *   $k=2$: 100ms - 5s (highly variance dependent)
    *   $k=3$: > 10s (Timeout risk)

### 2.2. Graph Analytics (Centrality, Community)

*   **Endpoint**: `GraphAnalyticsService.getPageRank`, `getCommunityDetection`
*   **Pattern**: Iterative Global Algorithms
*   **Complexity**:
    *   PageRank: $O(i \times (V + E))$ where $i$ is iterations (~20).
    *   Louvain: $O(V \log V)$.
*   **Hot Spot**: Graph Projection (`CALL gds.graph.project`). Currently done *per query* implicitly or explicitly.
*   **Worst-Case Trace**: Large tenant ($V > 100k$). Projection takes 5s, Algo takes 2s.
*   **Memory Cost**: High. Requires loading subgraph into GDS in-memory graph.
*   **Performance Bounds**: > 2s for medium graphs.

### 2.3. Semantic Search

*   **Endpoint**: `SemanticSearchService.search`
*   **Pattern**: Approximate Nearest Neighbor (HNSW)
*   **Complexity**: $O(\log N)$.
*   **Hot Spot**: Post-filtering. The query finds global top-K, then filters by `tenantId`.
*   **Failure Mode**: If the top $K$ global results belong to other tenants, the user receives 0 results despite matches existing. This is a correctness and performance issue.

### 2.4. Shortest Path

*   **Endpoint**: `GraphAnalyticsService.getShortestPath`
*   **Pattern**: Dijkstra / BFS
*   **Complexity**: $O(E + V \log V)$.
*   **Hot Spot**: Expansion of high-degree nodes during traversal.

---

## 3. Optimization & Rewrite Plan

### 3.1. Patching `GraphOpsService.js`

**Strategy**: "Supernode Truncation" & "Memory-Efficient Streaming".
- **Change**: Limit the number of relationships traversed per node.
- **Change**: Use `CALL { ... }` subqueries (if Neo4j 5.x) or explicit limits to prevent explosion.
- **Caching**: Wrap in `withCache` (Redis).

### 3.2. Patching `GraphAnalyticsService.js`

**Strategy**: "Named Graph Projection" & "Result Caching".
- **Change**: Project the graph *once* per tenant/investigation into a named graph `(tenantId-investigationId)`.
- **Change**: Run algorithms against the named graph.
- **Change**: Cache the calculated scores.

### 3.3. Patching `SemanticSearchService.ts`

**Strategy**: "Over-fetching" or "Tenant-Partitioned Indexes".
- **Fix**: Since Neo4j < 5.18 doesn't strictly support pre-filtering in `queryNodes` easily without index configuration, we will use a hybrid approach or over-fetch ($k \times 10$) and filter.
- **Recommendation**: Upgrade to Neo4j 5.x which supports `CALL db.index.vector.queryNodes` with pre-filtering if configured correctly, or use "Cypher filters" in newer versions.
- **Immediate Patch**: Increase retrieval limit and filter in application or Cypher `WHERE` clause aggressively.

---

## 4. Indexing Strategy

Execute the following Cypher migrations:

1.  **Composite Index**: `CREATE INDEX entity_tenant_inv_id IF NOT EXISTS FOR (n:Entity) ON (n.tenantId, n.investigationId, n.id)`
2.  **Label Index**: `CREATE INDEX entity_label IF NOT EXISTS FOR (n:Entity) ON (n.label)`
3.  **Vector Index**: Ensure `vector.similarity_function` is 'cosine'.

## 5. Caching Layer

Implement `server/src/services/Neo4jCacheService.ts` to standardize caching of graph responses using the `withCache` helper.
