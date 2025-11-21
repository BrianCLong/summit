# Graph Analytics Engine Documentation

## Overview

The IntelGraph Graph Analytics Engine provides production-grade graph analysis capabilities for intelligence analysis and network discovery. It implements state-of-the-art algorithms rivaling commercial platforms like Palantir and Maltego.

## Architecture

```
packages/
  graph-analytics/          # Core algorithm implementations
    src/
      algorithms/           # Centrality and community detection
      temporal/             # Temporal graph analysis
      pattern-matching/     # Subgraph isomorphism and motif discovery
      export/               # Export to standard formats
  graph-viz/                # Visualization layouts
    src/
      layouts/              # Force-directed, hierarchical layouts

services/
  graph-compute/            # Background compute workers
    src/
      workers/              # Parallel algorithm execution
      cache/                # Redis-based result caching
```

## Core Algorithms

### 1. Centrality Measures

#### PageRank
Measures node importance based on the link structure, similar to Google's web page ranking.

**Use Cases:**
- Identify influential entities in networks
- Rank targets by importance
- Detect key opinion leaders

**Example:**
```typescript
import { calculatePageRank } from '@intelgraph/graph-analytics';

const graph = {
  nodes: ['A', 'B', 'C', 'D'],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' },
    { source: 'D', target: 'C' }
  ]
};

const result = calculatePageRank(graph, {
  dampingFactor: 0.85,
  maxIterations: 100,
  convergenceThreshold: 0.0001
});

console.log(result.ranks); // Map of node -> PageRank score
```

**Parameters:**
- `dampingFactor`: Probability of following a link (default: 0.85)
- `maxIterations`: Maximum iterations (default: 100)
- `convergenceThreshold`: Stop when changes < threshold (default: 0.0001)

**Performance:**
- Time Complexity: O(k * (V + E)) where k = iterations
- Space Complexity: O(V)
- Typical runtime: <1s for 10K nodes, ~10s for 100K nodes

---

#### Betweenness Centrality
Identifies nodes that act as bridges between different parts of the network.

**Use Cases:**
- Find information brokers or intermediaries
- Identify critical nodes whose removal disrupts the network
- Detect bottlenecks in operational flows

**Example:**
```typescript
import { calculateBetweenness } from '@intelgraph/graph-analytics';

const result = calculateBetweenness(graph, {
  normalized: true,
  directed: false,
  sampleSize: 100  // Use sampling for large graphs
});

console.log(result.nodeBetweenness);
```

**Parameters:**
- `normalized`: Normalize scores 0-1 (default: true)
- `directed`: Whether graph is directed (default: false)
- `sampleSize`: Sample size for approximation (default: exact)

**Performance:**
- Exact: O(V * E) using Brandes' algorithm
- Approximate: O(k * E) where k = sample size
- Use approximate for graphs > 1000 nodes

---

#### Closeness Centrality
Measures how close a node is to all other nodes in the network.

**Use Cases:**
- Identify nodes that can quickly reach others
- Find central coordination points
- Detect nodes optimal for information dissemination

**Example:**
```typescript
import { calculateClosenessCentrality } from '@intelgraph/graph-analytics';

const result = calculateClosenessCentrality(graph, {
  normalized: true,
  harmonic: true  // Better for disconnected graphs
});
```

---

#### Eigenvector Centrality
Assigns scores based on the principle that connections to high-scoring nodes matter more.

**Use Cases:**
- Find well-connected influential nodes
- Identify elite or prestigious members
- Detect nodes with access to important contacts

**Example:**
```typescript
import { calculateEigenvectorCentrality } from '@intelgraph/graph-analytics';

const result = calculateEigenvectorCentrality(graph, {
  maxIterations: 100,
  convergenceThreshold: 0.0001
});
```

---

### 2. Community Detection

#### Louvain Method
Hierarchical algorithm that optimizes modularity to find communities.

**Use Cases:**
- Detect operational cells or organizational groups
- Identify clusters of related entities
- Find natural divisions in networks

**Example:**
```typescript
import { detectCommunitiesLouvain } from '@intelgraph/graph-analytics';

const result = detectCommunitiesLouvain(graph, {
  resolution: 1.0,  // Higher = more communities
  minModularityGain: 0.0001
});

console.log(`Found ${result.numCommunities} communities`);
console.log(`Modularity: ${result.modularity}`);
console.log(result.communities); // Map of node -> community ID
```

**Modularity Score Interpretation:**
- < 0.3: Weak community structure
- 0.3 - 0.7: Moderate community structure
- > 0.7: Strong community structure

**Performance:**
- Time Complexity: O(V * log(V))
- Handles millions of nodes efficiently
- Typically converges in < 10 iterations

---

#### Label Propagation
Fast algorithm where nodes adopt the most common label among neighbors.

**Use Cases:**
- Quick community detection for large networks
- Real-time community updates
- Initial community estimates

**Example:**
```typescript
import { detectCommunitiesLabelPropagation } from '@intelgraph/graph-analytics';

const result = detectCommunitiesLabelPropagation(graph, {
  maxIterations: 100,
  seed: 12345  // For reproducibility
});
```

**Performance:**
- Near-linear time complexity: O(E)
- 10-100x faster than Louvain
- Less stable but good for first-pass analysis

---

### 3. Link Prediction

Predicts potential future connections based on network structure.

**Methods:**
1. **Common Neighbors**: Count of shared neighbors
2. **Jaccard Coefficient**: Normalized common neighbors
3. **Adamic-Adar**: Weights rare shared neighbors higher
4. **Preferential Attachment**: Product of degrees ("rich get richer")
5. **Resource Allocation**: Flow-based similarity

**Example:**
```typescript
import { predictLinks } from '@intelgraph/graph-analytics';

const result = predictLinks(graph, {
  methods: ['adamic-adar', 'jaccard', 'common-neighbors'],
  minScore: 0.1,
  topK: 50,
  onlyNonExisting: true
});

// Predictions sorted by score
result.predictions.forEach(pred => {
  console.log(`${pred.source} -> ${pred.target}: ${pred.score} (${pred.method})`);
});
```

**Use Cases:**
- Predict future collaborations
- Identify hidden relationships
- Find missing data or intelligence gaps

---

### 4. Temporal Graph Analysis

Analyzes how graphs evolve over time.

**Example:**
```typescript
import { analyzeTemporalEvolution } from '@intelgraph/graph-analytics';

const temporalGraph = {
  nodes: [
    { id: 'A', timestamp: new Date('2024-01-01') },
    { id: 'B', timestamp: new Date('2024-01-15') }
  ],
  edges: [
    { source: 'A', target: 'B', timestamp: new Date('2024-02-01') }
  ]
};

const result = analyzeTemporalEvolution(temporalGraph, {
  numSnapshots: 20,
  detectBursts: true,
  burstThreshold: 2.0
});

console.log(result.trends);
console.log(result.changeEvents);
```

**Capabilities:**
- **Time-windowed snapshots**: Graph state at different times
- **Event burst detection**: Unusual spikes in activity
- **Temporal centrality**: How node importance changes over time
- **Change event detection**: Structural changes and community shifts

---

### 5. Pattern Matching

#### Subgraph Isomorphism
Finds all occurrences of a pattern in the graph.

**Example:**
```typescript
import { findSubgraphMatches } from '@intelgraph/graph-analytics';

// Define a triangle pattern
const pattern = {
  nodes: ['A', 'B', 'C'],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' }
  ]
};

const result = findSubgraphMatches(graph, pattern, {
  maxMatches: 100
});

console.log(`Found ${result.count} matches`);
```

**Use Cases:**
- Detect specific operational patterns
- Find organizational structures
- Identify recurring tactics

---

#### Motif Discovery
Discovers recurring small subgraphs (motifs) in the network.

**Example:**
```typescript
import { discoverMotifs } from '@intelgraph/graph-analytics';

const result = discoverMotifs(graph, {
  motifSize: 3,
  minFrequency: 5,
  sampleSize: 1000
});

result.motifs.forEach(motif => {
  console.log(`Motif ${motif.id}: ${motif.frequency} occurrences`);
});
```

---

### 6. Anomaly Detection

Identifies unusual subgraphs that deviate from normal patterns.

**Example:**
```typescript
import { detectAnomalousSubgraphs } from '@intelgraph/graph-analytics';

const anomalies = detectAnomalousSubgraphs(graph, {
  subgraphSize: 4,
  numSamples: 100,
  threshold: 2.0  // z-score threshold
});

anomalies.forEach(anomaly => {
  console.log(`Anomaly score: ${anomaly.anomalyScore}`);
  console.log(`Reasons: ${anomaly.reasons.join(', ')}`);
});
```

---

## Graph Export

Export graphs to standard formats for use with external tools.

### Supported Formats

#### GEXF (Gephi)
```typescript
import { exportToGEXF } from '@intelgraph/graph-analytics';

const gexfXml = exportToGEXF({
  nodes: [{ id: 'A', label: 'Entity A', properties: { type: 'Person' } }],
  edges: [{ source: 'A', target: 'B', weight: 2.5 }],
  metadata: { title: 'Intelligence Network', directed: false }
});

// Save or send gexfXml
```

#### GraphML (Cytoscape, yEd)
```typescript
import { exportToGraphML } from '@intelgraph/graph-analytics';

const graphml = exportToGraphML(graph);
```

#### DOT (Graphviz)
```typescript
import { exportToDOT } from '@intelgraph/graph-analytics';

const dot = exportToDOT(graph);
// Render with: dot -Tpng input.dot -o output.png
```

#### JSON (d3.js)
```typescript
import { exportToJSON } from '@intelgraph/graph-analytics';

const json = exportToJSON(graph);
```

#### CSV (Excel, databases)
```typescript
import { exportToCSV } from '@intelgraph/graph-analytics';

const { nodes, edges } = exportToCSV(graph);
// nodes.csv and edges.csv
```

---

## Visualization Layouts

### Force-Directed Layout
Creates natural-looking layouts where edges act as springs.

```typescript
import { computeForceDirectedLayout } from '@intelgraph/graph-viz';

const result = computeForceDirectedLayout(nodes, edges, {
  width: 1000,
  height: 800,
  iterations: 100,
  repulsionStrength: 100,
  attractionStrength: 0.01
});

// result.nodes contains x, y positions for each node
```

### Hierarchical Layout
Arranges nodes in levels (for tree-like structures).

```typescript
import { computeHierarchicalLayout } from '@intelgraph/graph-viz';

const result = computeHierarchicalLayout(nodes, edges, {
  rootId: 'A',
  levelSeparation: 100,
  nodeSeparation: 50
});
```

---

## Performance Optimization

### Caching
The system includes Redis-based caching for expensive computations:

```typescript
import { GraphAnalyticsCache } from '@intelgraph/graph-compute';

const cache = new GraphAnalyticsCache(redisClient, {
  defaultTTL: 3600  // 1 hour
});

// Check cache before computing
const cached = await cache.get('pagerank', graph, options);
if (cached) {
  return cached;
}

// Compute and cache
const result = calculatePageRank(graph, options);
await cache.set('pagerank', graph, result, options);
```

### Parallel Execution
Use worker threads for parallel algorithm execution:

```typescript
import { Worker } from 'worker_threads';

const worker = new Worker('./workers/analytics-worker.ts');

worker.postMessage({
  id: 'task-1',
  type: 'betweenness',
  graph: myGraph,
  options: { sampleSize: 100 }
});

worker.on('message', (result) => {
  console.log(result);
});
```

### Sampling Strategies
For large graphs (> 10K nodes):
- Use `sampleSize` parameter in betweenness centrality
- Enable approximate algorithms
- Consider community detection before detailed analysis

---

## Best Practices

1. **Start with Community Detection**: Identify major clusters before detailed analysis
2. **Use Multiple Centrality Measures**: Different measures reveal different aspects
3. **Cache Results**: Graph algorithms are expensive, cache aggressively
4. **Sample Large Graphs**: Use approximation for initial exploration
5. **Validate with Domain Experts**: Algorithmic results need context
6. **Track Temporal Changes**: Monitor how networks evolve over time
7. **Export for Collaboration**: Share findings using standard formats

---

## API Reference

Full TypeScript API documentation is available in the source code comments.
All functions are fully typed and include detailed JSDoc documentation.

---

## Performance Benchmarks

| Algorithm | 1K Nodes | 10K Nodes | 100K Nodes |
|-----------|----------|-----------|------------|
| PageRank | <100ms | <1s | ~10s |
| Betweenness (exact) | <500ms | ~5s | ~5min |
| Betweenness (sampled) | <100ms | <1s | ~5s |
| Louvain | <200ms | ~2s | ~20s |
| Label Propagation | <50ms | <500ms | ~5s |
| Link Prediction | <1s | ~10s | ~2min |

*Benchmarks on Intel Xeon E5-2680 v4 @ 2.40GHz*

---

## Troubleshooting

### Out of Memory
- Enable sampling for large graphs
- Use streaming algorithms
- Increase Node.js heap size: `node --max-old-space-size=8192`

### Slow Performance
- Check if caching is enabled
- Use parallel workers for multiple computations
- Consider approximate algorithms

### Poor Community Detection
- Adjust resolution parameter
- Try different algorithms (Louvain vs Label Propagation)
- Check if graph is too sparse/dense

---

## References

1. Page, L., et al. (1999). "The PageRank Citation Ranking"
2. Brandes, U. (2001). "A Faster Algorithm for Betweenness Centrality"
3. Blondel, V., et al. (2008). "Fast Unfolding of Communities in Large Networks" (Louvain)
4. Raghavan, U., et al. (2007). "Near Linear Time Algorithm to Detect Community Structures"
5. Liben-Nowell, D., & Kleinberg, J. (2007). "The Link-Prediction Problem for Social Networks"

---

## Support

For questions or issues:
- GitHub Issues: https://github.com/intelgraph/summit/issues
- Documentation: https://docs.intelgraph.ai
- API Reference: https://api-docs.intelgraph.ai

---

*Last Updated: 2025-11-20*
*Version: 1.0.0*
