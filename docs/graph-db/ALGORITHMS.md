# Graph Algorithms Reference

## Overview

This document provides detailed information about the graph algorithms available in Summit's Graph Database platform. All algorithms are optimized for intelligence analysis and network investigation use cases.

## Table of Contents

1. [Pathfinding Algorithms](#pathfinding-algorithms)
2. [Centrality Measures](#centrality-measures)
3. [Community Detection](#community-detection)
4. [Clustering Algorithms](#clustering-algorithms)
5. [Pattern Mining](#pattern-mining)
6. [Link Prediction](#link-prediction)

## Pathfinding Algorithms

### Dijkstra's Algorithm

**Use Case**: Find shortest weighted path between two nodes

**Complexity**: O((V + E) log V)

**Example**:
```typescript
const pathfinding = new ShortestPathAlgorithms(storage);
const path = pathfinding.dijkstra(sourceId, targetId);

console.log('Path length:', path.length);
console.log('Total weight:', path.weight);
console.log('Nodes:', path.nodes.map(n => n.id));
```

**When to Use**:
- All edge weights are non-negative
- Need guaranteed shortest path
- Moderate graph size (< 100K nodes)

### A* Algorithm

**Use Case**: Shortest path with heuristic guidance

**Complexity**: O(E) with good heuristic

**Example**:
```typescript
// Heuristic based on geographic distance
const heuristic = (nodeId: string, targetId: string) => {
  const node = storage.getNode(nodeId);
  const target = storage.getNode(targetId);

  const lat1 = node.properties.latitude as number;
  const lon1 = node.properties.longitude as number;
  const lat2 = target.properties.latitude as number;
  const lon2 = target.properties.longitude as number;

  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

const path = pathfinding.aStar(sourceId, targetId, heuristic);
```

**When to Use**:
- Have good heuristic function
- Spatial or geometric graphs
- Need faster performance than Dijkstra

### Bellman-Ford Algorithm

**Use Case**: Shortest path with negative edge weights

**Complexity**: O(V * E)

**Example**:
```typescript
try {
  const path = pathfinding.bellmanFord(sourceId, targetId);
} catch (error) {
  console.error('Graph contains negative cycle');
}
```

**When to Use**:
- Graph may have negative weights
- Need to detect negative cycles
- Financial or debt networks

### K-Shortest Paths

**Use Case**: Find multiple alternative paths

**Example**:
```typescript
const paths = pathfinding.kShortestPaths(sourceId, targetId, 5);

for (const [index, path] of paths.entries()) {
  console.log(`Path ${index + 1}: weight ${path.weight}`);
}
```

**When to Use**:
- Need backup routes
- Analyzing communication alternatives
- Redundancy analysis

## Centrality Measures

### PageRank

**Use Case**: Measure importance based on incoming connections

**Complexity**: O(E * iterations)

**Formula**: `PR(A) = (1-d)/N + d * Σ(PR(Ti)/C(Ti))`

**Example**:
```typescript
const centrality = new CentralityMeasures(storage);
const pageRank = centrality.pageRank(0.85, 100, 1e-6);
const topNodes = centrality.getTopK(pageRank, 20);

for (const { nodeId, score } of topNodes) {
  const node = storage.getNode(nodeId);
  console.log(`${node.properties.name}: ${score}`);
}
```

**Parameters**:
- `dampingFactor` (0.85): Probability of following links
- `maxIterations` (100): Maximum iterations
- `tolerance` (1e-6): Convergence threshold

**When to Use**:
- Identifying influential entities
- Ranking by importance
- Web-like networks

### Betweenness Centrality

**Use Case**: Measure importance based on bridging position

**Complexity**: O(V * E)

**Formula**: `CB(v) = Σ(σst(v)/σst)` for all s,t pairs

**Example**:
```typescript
const betweenness = centrality.betweennessCentrality();
const bridges = centrality.getTopK(betweenness, 10);
```

**When to Use**:
- Finding critical communication nodes
- Identifying bottlenecks
- Network vulnerability analysis

### Closeness Centrality

**Use Case**: Measure average distance to all other nodes

**Complexity**: O(V * E)

**Formula**: `CC(v) = (n-1) / Σd(v,u)` for all u

**Example**:
```typescript
const closeness = centrality.closenessCentrality();
```

**When to Use**:
- Finding central coordinators
- Optimizing information spread
- Accessibility analysis

### Eigenvector Centrality

**Use Case**: Importance based on importance of neighbors

**Complexity**: O(V * iterations)

**Example**:
```typescript
const eigenvector = centrality.eigenvectorCentrality();
```

**When to Use**:
- Quality over quantity of connections
- Social network analysis
- Influence propagation

### Degree Centrality

**Use Case**: Simple count of connections

**Complexity**: O(V)

**Example**:
```typescript
const degree = centrality.degreeCentrality('both');
const inDegree = centrality.degreeCentrality('in');
const outDegree = centrality.degreeCentrality('out');
```

**When to Use**:
- Quick initial analysis
- Identifying hubs
- Simple popularity measure

## Community Detection

### Louvain Method

**Use Case**: Detect communities by optimizing modularity

**Complexity**: O(V * log V)

**Example**:
```typescript
const community = new CommunityDetection(storage);
const communities = community.louvain(1.0);
const groups = community.getCommunities(communities);
const modularity = community.calculateModularity(communities);

console.log(`Found ${groups.length} communities`);
console.log(`Modularity: ${modularity}`);

for (const group of groups) {
  console.log(`Community ${group.id}: ${group.size} nodes`);
}
```

**Parameters**:
- `resolution` (1.0): Controls community size (higher = smaller communities)

**When to Use**:
- Large graphs (millions of nodes)
- Hierarchical community structure
- Fast community detection needed

### Label Propagation

**Use Case**: Fast community detection via label spreading

**Complexity**: O(E * iterations)

**Example**:
```typescript
const communities = community.labelPropagation(100);
const groups = community.getCommunities(communities);
```

**When to Use**:
- Very large graphs
- Speed is critical
- Don't need optimal solution

### Connected Components

**Use Case**: Find disconnected subgraphs

**Complexity**: O(V + E)

**Example**:
```typescript
const components = community.connectedComponents();
const groups = community.getCommunities(components);

console.log(`Graph has ${groups.length} connected components`);
```

**When to Use**:
- Graph connectivity analysis
- Finding isolated clusters
- Data quality checks

### Girvan-Newman

**Use Case**: Hierarchical community detection

**Complexity**: O(V² * E)

**Example**:
```typescript
const communities = community.girvanNewman(5); // 5 communities
```

**When to Use**:
- Need specific number of communities
- Hierarchical structure important
- Smaller graphs

## Clustering Algorithms

### Triangle Counting

**Use Case**: Count triangles in graph

**Example**:
```typescript
const clustering = new GraphClustering(storage);
const triangles = clustering.countTriangles();
console.log(`Graph contains ${triangles} triangles`);
```

**When to Use**:
- Measuring network cohesion
- Social network analysis
- Transitivity measurement

### Clustering Coefficient

**Use Case**: Measure local clustering

**Example**:
```typescript
// Single node
const coeff = clustering.localClusteringCoefficient(nodeId);

// All nodes
const allCoeffs = clustering.allClusteringCoefficients();

// Global metric
const global = clustering.globalClusteringCoefficient();
const average = clustering.averageClusteringCoefficient();
```

**When to Use**:
- Analyzing network structure
- Comparing graphs
- Identifying tightly-knit groups

### Clique Detection

**Use Case**: Find complete subgraphs

**Example**:
```typescript
// All maximal cliques
const cliques = clustering.findMaximalCliques();

// Cliques of specific size
const largeCliques = clustering.findKCliques(5);

// Maximum clique
const maxClique = clustering.findMaximumClique();
```

**When to Use**:
- Finding tight-knit groups
- Fraud detection
- Collaborative networks

### Graph Coloring

**Use Case**: Color nodes with no adjacent same-color nodes

**Example**:
```typescript
const colors = clustering.graphColoring();
const chromatic = clustering.chromaticNumber();

console.log(`Graph can be colored with ${chromatic} colors`);
```

**When to Use**:
- Resource allocation
- Scheduling problems
- Conflict resolution

### K-Core Decomposition

**Use Case**: Find subgraphs with minimum degree k

**Example**:
```typescript
const core3 = clustering.kCore(3); // All nodes with degree >= 3
const coreNumbers = clustering.coreNumbers();
```

**When to Use**:
- Finding cohesive subgraphs
- Network resilience
- Identifying core members

## Pattern Mining

### Frequent Subgraph Mining

**Use Case**: Find common patterns in graph

**Example**:
```typescript
const mining = new PatternMining(storage);
const patterns = mining.frequentSubgraphs(0.1, 5);

for (const pattern of patterns) {
  console.log(`Pattern ${pattern.id}: occurs ${pattern.frequency} times`);
  console.log(`Support: ${pattern.support}`);
}
```

**Parameters**:
- `minSupport` (0.1): Minimum frequency (10%)
- `maxSize` (5): Maximum pattern size

**When to Use**:
- Identifying common behaviors
- Network motif discovery
- Pattern-based classification

### Motif Detection

**Use Case**: Find specific network patterns

**Example**:
```typescript
const motifs = mining.detectMotifs();

for (const motif of motifs) {
  console.log(`${motif.type}: ${motif.count} instances`);
  console.log(`Significance: ${motif.significance}x expected`);
}
```

**Motif Types**:
- Triangle: Three mutually connected nodes
- Star: Hub with spokes
- Chain: Linear path
- Bipartite: Two disconnected groups

**When to Use**:
- Understanding network structure
- Comparing to random graphs
- Functional analysis

### Anomaly Detection

**Use Case**: Find unusual relationships

**Example**:
```typescript
const anomalies = mining.detectAnomalousRelationships(0.7);

for (const anomaly of anomalies) {
  console.log(`Anomalous: ${anomaly.edge.type}`);
  console.log(`Score: ${anomaly.anomalyScore}`);
  console.log(`Reasons:`, anomaly.reasons);
}
```

**When to Use**:
- Fraud detection
- Threat identification
- Quality control

## Link Prediction

### Common Neighbors

**Use Case**: Simple shared neighbor count

**Example**:
```typescript
const predictor = new LinkPredictor(storage);
const score = predictor.commonNeighbors(sourceId, targetId);
```

**When to Use**:
- Quick baseline prediction
- Social networks
- Collaborative filtering

### Jaccard Coefficient

**Use Case**: Normalized common neighbors

**Example**:
```typescript
const jaccard = predictor.jaccardCoefficient(sourceId, targetId);
```

**When to Use**:
- Normalizing for degree
- Recommendation systems
- Similarity measurement

### Adamic-Adar Index

**Use Case**: Weighted common neighbors

**Formula**: `Σ 1/log(k(z))` for common neighbors z

**Example**:
```typescript
const aa = predictor.adamicAdar(sourceId, targetId);
```

**When to Use**:
- Better than common neighbors
- Social network prediction
- Academic citations

### Ensemble Prediction

**Use Case**: Combine multiple methods

**Example**:
```typescript
const prediction = predictor.ensemblePrediction(sourceId, targetId);

console.log(`Score: ${prediction.score}`);
console.log(`Confidence: ${prediction.confidence}`);
console.log(`Explanation: ${prediction.explanation}`);
```

**When to Use**:
- Production systems
- High accuracy needed
- Comprehensive analysis

### Batch Predictions

**Use Case**: Predict many links efficiently

**Example**:
```typescript
// Predict links for specific node
const predictions = predictor.predictLinksForNode(nodeId, 10);

// Find missing links in graph
const missing = predictor.predictMissingLinks(0.5, 100);
```

**When to Use**:
- Recommendation systems
- Network completion
- Proactive monitoring

## Algorithm Selection Guide

| Task | Algorithm | Time | Space | Accuracy |
|------|-----------|------|-------|----------|
| Shortest Path | Dijkstra | Medium | Low | Exact |
| Importance | PageRank | Medium | Medium | Good |
| Bridges | Betweenness | High | Low | Exact |
| Communities | Louvain | Low | Medium | Good |
| Patterns | Subgraph Mining | High | High | Exact |
| Link Pred | Ensemble | Medium | Low | Best |

## Performance Tips

1. **Large Graphs**: Use Label Propagation instead of Louvain
2. **Fast Centrality**: Use Degree instead of Betweenness
3. **Many Queries**: Pre-compute centrality scores
4. **Memory Limited**: Use streaming algorithms
5. **Time Critical**: Sample the graph first

## References

- Dijkstra, E. W. (1959). "A note on two problems in connexion with graphs"
- Page, L., et al. (1999). "The PageRank Citation Ranking"
- Blondel, V. D., et al. (2008). "Fast unfolding of communities in large networks"
- Bron, C., & Kerbosch, J. (1973). "Algorithm 457: finding all cliques of an undirected graph"
