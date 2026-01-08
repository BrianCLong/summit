# Graph Intelligence & Network Analysis

The Summit platform includes a robust Graph Intelligence Engine that runs network analysis algorithms over tenant-scoped graph data. This engine allows for the discovery of relationships, influence scoring, community detection, and anomaly detection.

## Architecture

The system operates using an in-memory graph analysis model:

1.  **Data Loading**: A slice of the tenant's graph is loaded from Neo4j into an efficient in-memory adjacency list structure.
2.  **Algorithm Execution**: Pure functions execute standard graph algorithms (BFS, Centrality, etc.) on the in-memory graph.
3.  **Result Persistence**: Results are returned to the caller or stored (future state).
4.  **Orchestration**: Maestro can schedule and execute these analyses as tasks.

## Core Algorithms

The following algorithms are currently implemented:

### 1. Shortest Path (`shortestPath`)

Finds the shortest path between two entities.

- **Input**: `sourceNodeId`, `targetNodeId`, `maxDepth` (optional)
- **Output**: Path (sequence of nodes/edges) and distance.

### 2. k-Hop Neighborhood (`kHopNeighborhood`)

Explores the graph outward (or inward) from a starting node up to `k` steps.

- **Input**: `sourceNodeId`, `k`, `direction` ('in' | 'out' | 'both')
- **Output**: Subgraph (nodes and edges) within the radius.

### 3. Degree Centrality (`degreeCentrality`)

Calculates the number of connections for each node.

- **Input**: `direction`, `topK` (optional)
- **Output**: List of nodes sorted by degree score.

### 4. Connected Components (`connectedComponents`)

Identifies isolated clusters or subgraphs within the larger network.

- **Input**: None (runs on full slice)
- **Output**: List of components (arrays of nodes).

## API Usage

### Run Analysis

**POST** `/api/graph/analysis/run`

Body:

```json
{
  "algorithm": "shortestPath",
  "params": {
    "sourceNodeId": "node-123",
    "targetNodeId": "node-456",
    "maxDepth": 5
  }
}
```

Response:

```json
{
  "id": "job-uuid",
  "status": "completed",
  "result": {
    "path": ["node-123", "node-789", "node-456"],
    "distance": 2
  }
}
```

### Get Job Status

**GET** `/api/graph/analysis/:jobId`

## Maestro Integration

You can define a Maestro task to run graph analysis:

```typescript
const task = {
  kind: "graph.analysis",
  description: "Find influence hubs in the network",
  input: {
    tenantId: "tenant-123",
    algorithm: "degreeCentrality",
    params: {
      direction: "both",
      topK: 10,
    },
  },
};
```
