# Offline GNN Enrichment Pattern

**Status:** APPROVED
**Effective:** Turn 5 (2026-01-25)

## 1. Problem Statement

Graph Neural Networks (GNNs) provide powerful signals (link prediction, node importance, community detection) but are computationally expensive and hard to operationalize in the hot path of user queries.

**Goal:** Enable GNN intelligence in millisecond-latency RAG responses *without* runtime GPU dependencies.

## 2. The Solution: Offline Enrichment

Instead of "GNN-as-a-Service", we treat GNNs as **Batch Enrichment Jobs**.

### 2.1 Workflow

1.  **Snapshot:** Daily/Hourly export of the graph (or a subgraph).
2.  **Inference:** Offline GNN pipeline runs on the snapshot.
    *   Calculates: `community_id`, `importance_rank`, `predicted_link_score`.
    *   Generates: `embedding` vectors for nodes.
3.  **Write-Back:** Results are written back to Neo4j as **static properties** on nodes/relationships.

### 2.2 Schema Updates

Nodes receive new properties that represent "frozen" intelligence:

```cypher
// Before
(n:Person {name: "Alice"})

// After Enrichment
(n:Person {
  name: "Alice",
  gnn_community: "104",       // Computed Cluster
  gnn_importance: 0.98,       // PageRank/Centrality
  gnn_embedding: [...]        // Vector
})
```

## 3. Online Usage (Cypher-Only)

Runtime RAG queries consume these properties just like any other data. No ML inference happens at query time.

**Example Query:**

```cypher
// "Find relevant experts in Alice's community"
MATCH (p:Person {name: "Alice"})
MATCH (expert:Person)
WHERE expert.gnn_community = p.gnn_community  // O(1) filtering using offline cluster
AND expert.gnn_importance > 0.9             // Filter by offline score
RETURN expert
ORDER BY expert.gnn_importance DESC
LIMIT 5
```

## 4. Benefits

*   **Zero Latency Overhead:** Query speed depends only on index lookups, not model inference.
*   **Simplicity:** The serving layer remains pure Cypher/Go/Node.js. No Python/PyTorch containers in the critical path.
*   **Stability:** "Bad" model updates are caught in batch processing, not during live user requests.

## 5. Implementation Status

*   **Enrichment Pipeline:** `packages/intelgraph_ai_ml/` (Planned)
*   **Schema:** Support for `gnn_*` prefix properties is enabled in Neo4j constraints.
