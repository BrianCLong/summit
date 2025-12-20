# Graph Analytics Suite

## Overview

The Graph Analytics Suite provides comprehensive graph analysis capabilities for the Summit/IntelGraph platform, including:

- **Pathfinding**: K-shortest paths with policy-aware filtering
- **Community Detection**: Louvain and Label Propagation algorithms
- **Centrality Metrics**: Degree, Betweenness, Eigenvector, and Closeness centrality
- **Pattern/Motif Detection**: Star patterns, bipartite structures, repeated interactions
- **Explainability**: Human-readable summaries for all analysis results

## Architecture

### Components

```
apps/graph-analytics/
├── src/
│   ├── types/analytics.ts              # Core type definitions
│   ├── repositories/
│   │   └── GraphRepository.ts          # Graph data access layer
│   ├── algorithms/
│   │   ├── pathfinding.ts              # Shortest path & K-shortest paths
│   │   ├── centrality.ts               # Centrality metrics
│   │   ├── community.ts                # Community detection
│   │   ├── patterns.ts                 # Pattern/motif detection
│   │   └── explainability.ts           # Explanation generation
│   ├── services/
│   │   ├── GraphAnalyticsService.ts    # Legacy service
│   │   └── EnhancedGraphAnalyticsService.ts  # New enhanced service
│   ├── server.ts                       # Express API server
│   └── __tests__/                      # Test suites
└── docs/
    └── graph-analytics-suite.md        # This file
```

### Data Flow

```
API Request
    ↓
EnhancedGraphAnalyticsService
    ↓
GraphRepository (Neo4j)
    ↓
Algorithm Modules
    ↓
Explainability Layer
    ↓
API Response (with explanation)
```

## API Reference

### Base URL

```
http://localhost:4006/api
```

All endpoints require authentication via JWT token in the `Authorization` header.

### Endpoints

#### 1. Path Analysis

**POST** `/api/analysis/paths/enhanced`

Find K-shortest paths between two nodes with optional policy filtering.

**Request:**

```json
{
  "startNodeId": "node_123",
  "endNodeId": "node_456",
  "k": 3,
  "constraints": {
    "maxDepth": 6,
    "disallowedNodeLabels": ["Restricted"],
    "disallowedEdgeTypes": ["BLOCKED"],
    "requiredEdgeTypes": ["TRANSACTION", "TRANSFER"],
    "direction": "BOTH"
  }
}
```

**Response:**

```json
{
  "source": "node_123",
  "target": "node_456",
  "paths": [
    {
      "nodeIds": ["node_123", "node_789", "node_456"],
      "edgeIds": ["edge_1", "edge_2"],
      "length": 2,
      "weight": 2.5,
      "relationships": ["TRANSACTION", "TRANSFER"]
    }
  ],
  "shortestPath": { ... },
  "explanation": "Found 3 paths from node_123 to node_456. Shortest path length is 2 hops. Policy filters excluded 5 nodes and 3 edges from consideration.",
  "stats": {
    "totalPaths": 3,
    "averageLength": 2.7,
    "minLength": 2,
    "maxLength": 4,
    "policyFilteredNodes": 5,
    "policyFilteredEdges": 3
  }
}
```

#### 2. Community Detection

**POST** `/api/analysis/communities/enhanced`

Detect communities in a subgraph using Louvain or Label Propagation.

**Request:**

```json
{
  "nodeIds": ["node_1", "node_2", "node_3"],
  "depth": 2,
  "limit": 1000,
  "algorithm": "louvain"
}
```

**Response:**

```json
{
  "communities": {
    "communities": [
      {
        "nodeId": "node_1",
        "communityId": "community_0"
      }
    ],
    "numCommunities": 4,
    "modularityScore": 0.42,
    "sizes": {
      "community_0": 25,
      "community_1": 18
    },
    "densities": {
      "community_0": 0.65,
      "community_1": 0.52
    }
  },
  "explanation": "Detected 4 communities using louvain algorithm. Largest community contains 25 nodes. Modularity score of 42.0% indicates strong community structure.",
  "algorithm": "louvain",
  "parameters": {
    "depth": 2,
    "limit": 1000
  }
}
```

#### 3. Centrality Analysis

**POST** `/api/analysis/centrality/enhanced`

Calculate centrality metrics for nodes in a subgraph.

**Request:**

```json
{
  "nodeIds": ["node_1", "node_2"],
  "depth": 2,
  "includeEigenvector": true,
  "includeCloseness": false
}
```

**Response:**

```json
{
  "centrality": {
    "scores": {
      "degree": {
        "node_1": 12,
        "node_2": 8
      },
      "betweenness": {
        "node_1": 0.35,
        "node_2": 0.12
      },
      "eigenvector": {
        "node_1": 0.42,
        "node_2": 0.18
      }
    },
    "summaries": {
      "topByDegree": ["node_1", "node_3", "node_5"],
      "topByBetweenness": ["node_1", "node_4", "node_7"],
      "topByEigenvector": ["node_1", "node_2", "node_6"]
    },
    "stats": {
      "avgDegree": 5.2,
      "maxDegree": 12,
      "avgBetweenness": 0.08,
      "maxBetweenness": 0.35
    }
  },
  "explanation": "Computed centrality metrics using degree, betweenness, eigenvector for network analysis. Top 3 nodes by betweenness centrality account for 62% of shortest paths, highlighting key broker positions.",
  "algorithm": "degree, betweenness, eigenvector"
}
```

#### 4. Pattern Detection

**POST** `/api/analysis/patterns/enhanced`

Detect structural patterns and motifs in a subgraph.

**Request:**

```json
{
  "nodeIds": ["node_1", "node_2"],
  "depth": 3,
  "patternParams": {
    "star": {
      "minDegree": 10,
      "edgeTypes": ["TRANSACTION"]
    },
    "bipartiteFan": {
      "minSources": 5,
      "minTargets": 3,
      "edgeTypeFilter": "TRANSFER"
    },
    "repeatedInteractions": {
      "minInteractions": 5,
      "minParticipants": 2,
      "timeWindowSeconds": 86400
    }
  }
}
```

**Response:**

```json
{
  "patterns": [
    {
      "patternType": "STAR",
      "nodes": ["hub_1", "spoke_1", "spoke_2"],
      "edges": ["e1", "e2"],
      "metrics": {
        "degree": 25,
        "centralityScore": 0.18
      },
      "summary": "Node hub_1 has degree 25 and appears as a central hub connecting 25 other nodes."
    },
    {
      "patternType": "BIPARTITE_FAN",
      "nodes": ["intermediate", "src1", "src2", "tgt1"],
      "edges": ["e3", "e4", "e5"],
      "metrics": {
        "sources": 5,
        "targets": 3,
        "fanInOutRatio": 0.6
      },
      "summary": "Node intermediate acts as intermediary with 5 sources fanning in and 3 targets fanning out, suggesting potential structuring or aggregation."
    }
  ],
  "explanation": "Detected 12 structural patterns in the graph. Pattern breakdown: 7 star patterns, 3 bipartite fan patterns, 2 repeated interaction patterns.",
  "stats": {
    "totalPatterns": 12,
    "byType": {
      "STAR": 7,
      "BIPARTITE_FAN": 3,
      "REPEATED_INTERACTION": 2
    }
  }
}
```

#### 5. Comprehensive Analysis

**POST** `/api/analysis/comprehensive`

Run all analytics (communities, centrality, patterns) in parallel.

**Request:**

```json
{
  "nodeIds": ["node_1", "node_2"],
  "depth": 2,
  "includeEigenvector": true,
  "patternParams": {
    "star": { "minDegree": 5 },
    "bipartiteFan": { "minSources": 3, "minTargets": 2 }
  }
}
```

**Response:**

```json
{
  "communities": { ... },
  "centrality": { ... },
  "patterns": { ... }
}
```

## Algorithm Details

### 1. Pathfinding

#### Shortest Path
- **Algorithm**: BFS (unweighted) or Dijkstra (weighted)
- **Time Complexity**: O(V + E) for BFS, O((V + E) log V) for Dijkstra
- **Features**:
  - Policy-aware filtering (nodes and edges)
  - Constraint-based filtering (labels, types, depth)
  - Support for directed/undirected graphs

#### K-Shortest Paths
- **Algorithm**: Yen's algorithm (simplified)
- **Time Complexity**: O(K × V × (E + V log V))
- **Features**:
  - Returns up to K distinct paths
  - Sorted by length/weight
  - Same filtering as shortest path

### 2. Centrality Metrics

#### Degree Centrality
- **Formula**: degree(v) = number of edges incident to v
- **Time Complexity**: O(V + E)
- **Use Case**: Identify highly connected nodes

#### Betweenness Centrality
- **Algorithm**: Brandes' algorithm
- **Time Complexity**: O(V × E)
- **Use Case**: Identify broker nodes that control information flow

#### Eigenvector Centrality
- **Algorithm**: Power iteration
- **Time Complexity**: O(iterations × E)
- **Use Case**: Identify influential nodes connected to other influential nodes

#### Closeness Centrality
- **Algorithm**: BFS from each node
- **Time Complexity**: O(V × (V + E))
- **Use Case**: Identify nodes with shortest average distance to all others

### 3. Community Detection

#### Louvain Algorithm
- **Method**: Modularity optimization
- **Time Complexity**: O(E × log V) (approximate)
- **Advantages**: Fast, hierarchical, high modularity
- **Best For**: Large graphs, clear community structure

#### Label Propagation
- **Method**: Iterative label spreading
- **Time Complexity**: O(iterations × E)
- **Advantages**: Simple, scalable, no prior community count needed
- **Best For**: Quick detection, dynamic graphs

### 4. Pattern Detection

#### Star Patterns
- **Definition**: Central node with ≥ N neighbors
- **Time Complexity**: O(V + E)
- **Indicators**: Hubs, central control, broadcasting

#### Bipartite Fan Patterns
- **Definition**: Many sources → intermediary → many targets
- **Time Complexity**: O(V + E)
- **Indicators**: Structuring, aggregation, layering

#### Repeated Interactions
- **Definition**: Multiple edges between same node pairs over time
- **Time Complexity**: O(E)
- **Indicators**: Coordination, recurring relationships

## Usage Examples

### Example 1: Find Paths with Policy Filtering

```typescript
import { EnhancedGraphAnalyticsService } from './services/EnhancedGraphAnalyticsService';

const service = new EnhancedGraphAnalyticsService(neo4jDriver, pgPool, redisClient);

const result = await service.analyzePaths({
  startNodeId: 'account_1',
  endNodeId: 'account_2',
  k: 5,
  constraints: {
    maxDepth: 4,
    disallowedNodeLabels: ['Sanctioned'],
    requiredEdgeTypes: ['TRANSACTION'],
  },
  nodePolicyFilter: (node) => !node.properties.blocked,
});

console.log(result.explanation);
console.log(`Found ${result.paths.length} paths`);
```

### Example 2: Detect Communities

```typescript
const result = await service.analyzeCommunities({
  nodeIds: investigationNodeIds,
  depth: 3,
  algorithm: 'louvain',
});

console.log(`Detected ${result.communities.numCommunities} communities`);
console.log(result.explanation);
```

### Example 3: Find Suspicious Patterns

```typescript
const result = await service.analyzePatterns({
  nodeIds: suspiciousAccounts,
  depth: 2,
  patternParams: {
    star: { minDegree: 20 },
    bipartiteFan: { minSources: 10, minTargets: 5 },
    repeatedInteractions: { minInteractions: 10, minParticipants: 2 },
  },
});

for (const pattern of result.patterns) {
  console.log(pattern.summary);
}
```

## Performance Considerations

### Recommended Limits

| Operation | Max Nodes | Max Depth | Max K Paths | Cache TTL |
|-----------|-----------|-----------|-------------|-----------|
| Pathfinding | 10,000 | 6 | 10 | 1 hour |
| Community Detection | 5,000 | 3 | N/A | 1 hour |
| Centrality | 2,000 | 2 | N/A | 1 hour |
| Pattern Detection | 5,000 | 3 | N/A | 1 hour |

### Optimization Tips

1. **Use Subgraphs**: Limit analysis to relevant subgraphs via `nodeIds` and `depth`
2. **Enable Caching**: Results are cached in Redis for 1 hour by default
3. **Parallel Execution**: Use comprehensive analysis to run multiple analytics in parallel
4. **Limit K**: Keep K-shortest paths K ≤ 10 for best performance
5. **Filter Early**: Apply constraints and policy filters to reduce graph size

## Testing

Run the test suite:

```bash
cd apps/graph-analytics
pnpm test
```

Test coverage includes:
- Unit tests for each algorithm
- Integration tests with Neo4j
- Policy filter validation
- Explainability output verification

## Future Enhancements

- [ ] PageRank centrality
- [ ] Triangle counting
- [ ] Clique detection
- [ ] Temporal pattern detection with time decay
- [ ] Approximate algorithms for very large graphs
- [ ] GPU-accelerated computations
- [ ] Real-time pattern streaming
- [ ] Custom pattern DSL

## References

- Brandes, U. (2001). A faster algorithm for betweenness centrality
- Blondel, V. D., et al. (2008). Fast unfolding of communities in large networks (Louvain)
- Raghavan, U. N., et al. (2007). Near linear time algorithm to detect community structures (Label Propagation)
- Yen, J. Y. (1971). Finding the k shortest loopless paths in a network
