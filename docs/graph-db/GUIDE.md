# Graph Database Platform Guide

## Overview

Summit's Graph Database platform provides enterprise-grade graph storage, query, and analytics capabilities designed specifically for intelligence operations. This guide covers the core concepts, architecture, and usage patterns.

## Table of Contents

1. [Architecture](#architecture)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Performance Optimization](#performance-optimization)

## Architecture

### Components

The Graph Database platform consists of several integrated components:

1. **Graph Storage Engine** (`@intelgraph/graph-database`)
   - Native property graph storage
   - Index-free adjacency architecture
   - ACID transaction support
   - Temporal graph versioning

2. **Query Engine** (`@intelgraph/graph-query`)
   - Cypher query language support
   - Gremlin traversal language
   - SPARQL for RDF graphs
   - Query optimization and planning

3. **Graph Algorithms** (`@intelgraph/graph-algorithms`)
   - Pathfinding (Dijkstra, A*, Bellman-Ford)
   - Centrality measures (PageRank, Betweenness, Closeness)
   - Community detection (Louvain, Label Propagation)
   - Clustering and clique detection

4. **Relationship Mining** (`@intelgraph/relationship-mining`)
   - Pattern detection
   - Motif discovery
   - Anomaly detection
   - Temporal pattern analysis

5. **Link Prediction** (`@intelgraph/link-prediction`)
   - Common neighbors
   - Adamic-Adar index
   - Jaccard similarity
   - Ensemble prediction methods

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Graph DB Service                       │
│                    (REST API)                            │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
┌───▼──────┐ ┌───▼──────┐ ┌───▼──────┐ ┌───▼──────┐
│ Storage  │ │  Query   │ │Algorithm │ │  Mining  │
│  Engine  │ │  Engine  │ │ Library  │ │ & Predict│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm -F @intelgraph/graph-database run build
pnpm -F @intelgraph/graph-query run build
pnpm -F @intelgraph/graph-algorithms run build

# Start the service
pnpm -F @intelgraph/graph-db-service run dev
```

### Basic Usage

#### Creating Nodes and Edges

```typescript
import { GraphStorage } from '@intelgraph/graph-database';

const storage = new GraphStorage({
  dataDir: './data/graph',
  cacheSize: 1024 * 1024 * 100 // 100MB
});

// Create nodes
const person1 = storage.createNode(
  ['Person', 'Agent'],
  { name: 'John Doe', role: 'analyst' }
);

const person2 = storage.createNode(
  ['Person'],
  { name: 'Jane Smith', role: 'director' }
);

// Create relationship
const edge = storage.createEdge(
  person1.id,
  person2.id,
  'REPORTS_TO',
  { since: '2024-01-01' },
  1.0
);
```

#### Querying with Cypher

```typescript
import { QueryEngine } from '@intelgraph/graph-query';

const queryEngine = new QueryEngine(storage);

// Find all analysts
const result = queryEngine.executeCypher(`
  MATCH (p:Person)
  WHERE p.role = 'analyst'
  RETURN p.name, p.role
`);

// Find reporting relationships
const reports = queryEngine.executeCypher(`
  MATCH (a:Person)-[r:REPORTS_TO]->(b:Person)
  RETURN a.name, b.name
`);
```

#### Running Graph Algorithms

```typescript
import {
  ShortestPathAlgorithms,
  CentralityMeasures,
  CommunityDetection
} from '@intelgraph/graph-algorithms';

// Shortest path
const pathfinding = new ShortestPathAlgorithms(storage);
const path = pathfinding.dijkstra(person1.id, person2.id);

// Centrality analysis
const centrality = new CentralityMeasures(storage);
const pageRank = centrality.pageRank();
const topInfluencers = centrality.getTopK(pageRank, 10);

// Community detection
const communityDetection = new CommunityDetection(storage);
const communities = communityDetection.louvain();
const modularity = communityDetection.calculateModularity(communities);
```

## Core Concepts

### Property Graph Model

Summit uses a property graph data model where:

- **Nodes** represent entities with:
  - Unique ID
  - Labels (types)
  - Properties (key-value pairs)
  - Temporal information

- **Edges** represent relationships with:
  - Unique ID
  - Type
  - Source and target nodes
  - Properties
  - Weight
  - Temporal validity

### Index-Free Adjacency

Unlike traditional databases, Summit's graph storage uses index-free adjacency where:

- Each node maintains direct references to its edges
- Traversals don't require index lookups
- O(1) access to neighbors
- Optimized for graph queries

### Temporal Graphs

Support for temporal analysis:

```typescript
// Create time-valid edge
const temporalEdge = storage.createEdge(
  source.id,
  target.id,
  'COMMUNICATED_WITH',
  { message: 'Meeting scheduled' },
  1.0
);

// Add temporal validity
temporalEdge.validFrom = Date.parse('2024-01-01');
temporalEdge.validTo = Date.parse('2024-12-31');
```

### Hypergraphs

Support for complex multi-node relationships:

```typescript
// Create hyperedge connecting multiple nodes
const hyperedge = storage.createHyperedge(
  [node1.id, node2.id, node3.id],
  'PARTICIPATED_IN',
  { event: 'summit-2024' }
);
```

## API Reference

### REST API Endpoints

#### Node Operations

- `POST /api/nodes` - Create node
- `GET /api/nodes/:id` - Get node by ID
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node
- `GET /api/nodes/label/:label` - Get nodes by label

#### Edge Operations

- `POST /api/edges` - Create edge
- `GET /api/edges/:id` - Get edge by ID
- `DELETE /api/edges/:id` - Delete edge
- `GET /api/edges/type/:type` - Get edges by type

#### Query Operations

- `POST /api/query/cypher` - Execute Cypher query
- `POST /api/query/explain` - Get query execution plan

#### Algorithm Operations

- `POST /api/algorithms/shortest-path` - Find shortest path
- `POST /api/algorithms/centrality/:type` - Calculate centrality
- `POST /api/algorithms/community-detection/:algorithm` - Detect communities
- `GET /api/algorithms/clustering` - Get clustering metrics
- `GET /api/algorithms/cliques` - Find cliques

#### Mining Operations

- `POST /api/mining/patterns` - Find frequent patterns
- `GET /api/mining/motifs` - Detect network motifs
- `POST /api/mining/anomalies` - Detect anomalies

#### Prediction Operations

- `POST /api/prediction/link` - Predict link between nodes
- `POST /api/prediction/node-links` - Predict links for node
- `POST /api/prediction/missing-links` - Find missing links

## Best Practices

### 1. Node Label Design

```typescript
// Good: Specific, hierarchical labels
storage.createNode(['Person', 'Employee', 'Analyst'], properties);

// Avoid: Too generic
storage.createNode(['Entity'], properties);
```

### 2. Property Indexing

Index frequently queried properties:

```typescript
// Properties that should be indexed
{ id: 'unique-id', name: 'searchable', email: 'unique' }

// Use label-specific indexes
storage.createNode(['Person'], {
  ssn: '123-45-6789', // Should be indexed
  favoriteColor: 'blue' // Probably not indexed
});
```

### 3. Edge Type Naming

Use clear, descriptive edge types:

```typescript
// Good
'REPORTS_TO', 'COMMUNICATED_WITH', 'LOCATED_IN'

// Avoid
'RELATED', 'CONNECTED', 'LINKED'
```

### 4. Temporal Data

Always include temporal information for intelligence:

```typescript
const edge = storage.createEdge(source.id, target.id, 'MET_WITH', {
  location: 'Prague',
  timestamp: Date.now(),
  duration: 3600000 // 1 hour
});
```

### 5. Batch Operations

For bulk inserts, use batch operations:

```typescript
// Import from external source
const data = {
  nodes: [...],
  edges: [...]
};
storage.importGraph(data);
```

## Performance Optimization

### 1. Caching Strategy

Configure appropriate cache size:

```typescript
const storage = new GraphStorage({
  cacheSize: 1024 * 1024 * 500, // 500MB for large graphs
  enableCompression: true
});
```

### 2. Query Optimization

Use query planning to optimize:

```typescript
// Check execution plan
const plan = queryEngine.explain(query);
console.log('Estimated cost:', plan.estimatedCost);

// Optimize by adding indexes or restructuring query
```

### 3. Partitioning

For very large graphs, use partitioning:

```typescript
const storage = new GraphStorage({
  partitionStrategy: 'hash', // or 'range', 'edge_cut'
  replicationFactor: 2
});
```

### 4. Algorithm Tuning

Tune algorithm parameters:

```typescript
// PageRank with custom parameters
const pageRank = centrality.pageRank(
  0.85,  // damping factor
  100,   // max iterations
  1e-6   // tolerance
);

// Community detection with resolution parameter
const communities = communityDetection.louvain(1.2);
```

### 5. Monitoring

Monitor graph statistics:

```typescript
const stats = storage.getStats();
console.log('Nodes:', stats.nodeCount);
console.log('Edges:', stats.edgeCount);
console.log('Density:', stats.density);
console.log('Avg Degree:', stats.avgDegree);
```

## Intelligence Use Cases

### 1. Network Analysis

Identify key players and communication patterns:

```typescript
// Find most influential nodes
const betweenness = centrality.betweennessCentrality();
const keyPlayers = centrality.getTopK(betweenness, 20);

// Detect communities
const communities = communityDetection.louvain();
const groups = communityDetection.getCommunities(communities);
```

### 2. Threat Detection

Identify anomalous relationships:

```typescript
const mining = new PatternMining(storage);
const anomalies = mining.detectAnomalousRelationships(0.8);

for (const anomaly of anomalies) {
  console.log('Anomalous edge:', anomaly.edge.id);
  console.log('Score:', anomaly.anomalyScore);
  console.log('Reasons:', anomaly.reasons);
}
```

### 3. Link Prediction

Predict future relationships:

```typescript
const predictor = new LinkPredictor(storage);
const predictions = predictor.predictLinksForNode(suspectId, 10);

for (const pred of predictions) {
  console.log(`Predicted link to ${pred.targetId}`);
  console.log(`Confidence: ${pred.confidence}`);
  console.log(`Explanation: ${pred.explanation}`);
}
```

### 4. Temporal Analysis

Track relationship evolution:

```typescript
const patterns = mining.temporalPatterns(86400000); // 1 day windows

for (const pattern of patterns) {
  console.log('Pattern:', pattern.pattern.id);
  console.log('Frequency over time:', pattern.frequency);
}
```

## Comparison with Other Graph Databases

| Feature | Summit | Neo4j | TigerGraph |
|---------|--------|-------|------------|
| Native Graph Storage | ✓ | ✓ | ✓ |
| Index-Free Adjacency | ✓ | ✓ | ✓ |
| Cypher Support | ✓ | ✓ | ✗ |
| Gremlin Support | ✓ | Plugin | ✓ |
| Built-in Algorithms | ✓ | Limited | ✓ |
| Link Prediction | ✓ | ✗ | ✗ |
| Pattern Mining | ✓ | Limited | Limited |
| Temporal Graphs | ✓ | Plugin | Limited |
| Intelligence Focus | ✓ | ✗ | ✗ |
| Distributed | Planned | ✓ | ✓ |

## Next Steps

- See [ALGORITHMS.md](./ALGORITHMS.md) for detailed algorithm documentation
- See [QUERY_LANGUAGE.md](./QUERY_LANGUAGE.md) for query language reference
- Check the API examples in `/examples`
- Join the community discussions

## Support

For questions and support:
- Documentation: `/docs/graph-db`
- Issues: GitHub Issues
- Community: Slack channel
