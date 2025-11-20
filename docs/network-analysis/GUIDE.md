# Network Analysis Platform Guide

## Overview

The IntelGraph Network Analysis Platform provides comprehensive social network analysis (SNA) capabilities including community detection, influence mapping, link prediction, and network intelligence for understanding complex relationship networks and identifying key actors and communities.

## Architecture

The platform consists of several integrated packages:

### Core Packages

1. **@intelgraph/network-analysis** - Core graph operations and algorithms
2. **@intelgraph/community-detection** - Community detection algorithms
3. **@intelgraph/influence-analysis** - Influence propagation and maximization
4. **@intelgraph/link-prediction** - Link prediction algorithms
5. **@intelgraph/network-visualization** - Network visualization layouts
6. **@intelgraph/social-media-analysis** - Social media specific analysis

### Services

- **network-service** - REST API for network analysis operations

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -F @intelgraph/network-analysis build
pnpm -F @intelgraph/community-detection build
pnpm -F @intelgraph/influence-analysis build
pnpm -F @intelgraph/link-prediction build
pnpm -F @intelgraph/network-visualization build
pnpm -F @intelgraph/social-media-analysis build
pnpm -F @intelgraph/network-service build
```

### Starting the Service

```bash
# Start the network analysis service
pnpm -F @intelgraph/network-service dev
```

The service will be available at `http://localhost:3100`.

## Core Features

### 1. Graph Construction

Build networks from entity relationships:

```typescript
import { GraphBuilder } from '@intelgraph/network-analysis';

const builder = new GraphBuilder(true, true); // directed, weighted

// Add nodes
builder.addNode({ id: 'user1', label: 'Alice', attributes: { role: 'analyst' } });
builder.addNode({ id: 'user2', label: 'Bob', attributes: { role: 'manager' } });

// Add edges
builder.addEdge({ source: 'user1', target: 'user2', weight: 0.8 });

const graph = builder.build();
```

### 2. Centrality Metrics

Calculate various centrality measures:

```typescript
import { CentralityMetrics } from '@intelgraph/network-analysis';

const centrality = new CentralityMetrics(graph);

// Calculate individual metrics
const degreeCentrality = centrality.degreeCentrality();
const betweenness = centrality.betweennessCentrality();
const pageRank = centrality.pageRank();

// Calculate all metrics for a node
const allMetrics = centrality.calculateAllMetrics('user1');
console.log(allMetrics);
// {
//   nodeId: 'user1',
//   degree: 0.5,
//   betweenness: 0.3,
//   closeness: 0.6,
//   eigenvector: 0.4,
//   pageRank: 0.2,
//   katz: 0.45,
//   harmonic: 0.55
// }
```

### 3. Community Detection

Detect communities using multiple algorithms:

```typescript
import { LouvainAlgorithm, LabelPropagation } from '@intelgraph/community-detection';

// Louvain algorithm (modularity optimization)
const louvain = new LouvainAlgorithm(graph);
const communities = louvain.detectCommunities();

console.log(`Found ${communities.communities.length} communities`);
console.log(`Modularity: ${communities.modularity}`);

// Label propagation
const labelProp = new LabelPropagation(graph);
const communities2 = labelProp.detectCommunities();
```

### 4. Influence Propagation

Simulate information diffusion:

```typescript
import { DiffusionSimulator, InfluenceMaximization } from '@intelgraph/influence-analysis';

// Independent cascade model
const simulator = new DiffusionSimulator(graph);
const seedNodes = new Set(['user1', 'user2']);
const result = simulator.independentCascade(seedNodes, 0.1);

console.log(`Cascade size: ${result.cascadeSize}`);
console.log(`Activated nodes:`, Array.from(result.activatedNodes));

// Influence maximization
const maximization = new InfluenceMaximization(graph);
const optimalSeeds = maximization.greedyMaximization(5, {
  type: 'independent_cascade',
  parameters: { activationProbability: 0.1 }
});
```

### 5. Link Prediction

Predict future connections:

```typescript
import { LinkPredictor } from '@intelgraph/link-prediction';

const predictor = new LinkPredictor(graph);

// Ensemble prediction (combines multiple methods)
const predictions = predictor.ensemblePrediction(100);

predictions.slice(0, 5).forEach(pred => {
  console.log(`${pred.sourceId} -> ${pred.targetId}: ${pred.score.toFixed(3)}`);
});

// Individual methods
const commonNeighbors = predictor.commonNeighbors(50);
const adamicAdar = predictor.adamicAdar(50);
const jaccard = predictor.jaccardCoefficient(50);
```

### 6. Network Metrics

Calculate network-level statistics:

```typescript
import { NetworkMetricsCalculator } from '@intelgraph/network-analysis';

const calculator = new NetworkMetricsCalculator(graph);
const metrics = calculator.calculateAll();

console.log('Network Metrics:', {
  density: metrics.density,
  avgPathLength: metrics.averagePathLength,
  clusteringCoeff: metrics.clusteringCoefficient,
  assortativity: metrics.assortativity,
  diameter: metrics.diameter,
  components: metrics.numberOfComponents
});

// Check network properties
console.log('Small-world network?', calculator.isSmallWorld());
console.log('Scale-free network?', calculator.isScaleFree());
```

### 7. Motif Analysis

Analyze network patterns:

```typescript
import { MotifAnalyzer } from '@intelgraph/network-analysis';

const analyzer = new MotifAnalyzer(graph);

// Count triangles
const triangleCount = analyzer.countTriangles();

// Find all motifs
const motifs = analyzer.find3NodeMotifs();

// Detect structural holes
const structuralHoles = analyzer.findStructuralHoles();

// Find bridges
const bridges = analyzer.findBridges();

// K-core decomposition
const coreness = analyzer.kCoreDecomposition();
```

### 8. Network Visualization

Apply layout algorithms:

```typescript
import { LayoutEngine } from '@intelgraph/network-visualization';

const engine = new LayoutEngine(graph);

// Force-directed layout
const layout = engine.applyLayout({
  type: 'force-directed',
  parameters: {
    iterations: 100,
    width: 800,
    height: 600
  }
});

// Hierarchical layout
const hierarchical = engine.applyLayout({
  type: 'hierarchical',
  parameters: { levelSeparation: 100 }
});

// Geographic layout (based on node attributes)
const geographic = engine.applyLayout({
  type: 'geographic',
  parameters: {
    latitudeKey: 'lat',
    longitudeKey: 'lon'
  }
});
```

### 9. Social Media Analysis

Analyze social networks and detect bots:

```typescript
import { SocialNetworkAnalyzer } from '@intelgraph/social-media-analysis';

const analyzer = new SocialNetworkAnalyzer(graph);

// Detect bots
const profiles = new Map([
  ['user1', { id: 'user1', followers: 100, following: 1000, ... }],
  ['user2', { id: 'user2', followers: 5000, following: 200, ... }]
]);

const botScores = analyzer.detectBots(profiles);

botScores.forEach((score, userId) => {
  console.log(`${userId}: ${score.classification} (score: ${score.score})`);
});

// Identify echo chambers
const echoChambers = analyzer.identifyEchoChambers();

echoChambers.forEach((chamber, idx) => {
  console.log(`Chamber ${idx}: ${chamber.members.size} members, insularity: ${chamber.insularity}`);
});
```

## REST API

### Create a Graph

```bash
POST /api/graphs
Content-Type: application/json

{
  "id": "my-network",
  "nodes": [
    { "id": "user1", "label": "Alice" },
    { "id": "user2", "label": "Bob" }
  ],
  "edges": [
    { "source": "user1", "target": "user2", "weight": 0.8 }
  ],
  "options": {
    "directed": true,
    "weighted": true
  }
}
```

### Calculate Centrality

```bash
GET /api/graphs/my-network/centrality?metric=pagerank
```

### Detect Communities

```bash
POST /api/graphs/my-network/communities
Content-Type: application/json

{
  "algorithm": "louvain"
}
```

### Predict Links

```bash
GET /api/graphs/my-network/link-prediction?method=ensemble&topK=100
```

### Calculate Network Metrics

```bash
GET /api/graphs/my-network/metrics
```

## Database Schema

The platform includes a comprehensive PostgreSQL schema for storing:

- Networks and snapshots
- Nodes and edges
- Centrality scores
- Communities
- Influence scores
- Link predictions
- Bot scores
- Coordinated behavior patterns
- Echo chambers

See `docs/network-analysis/schema.sql` for the complete schema.

## Performance Considerations

### Large Networks

For networks with >10,000 nodes:

1. Use sampling for expensive algorithms (betweenness centrality)
2. Enable caching for repeated calculations
3. Consider incremental updates instead of full recalculation
4. Use database persistence for large graphs

### Optimization Tips

```typescript
// Use approximate algorithms for large graphs
const config = {
  enableCaching: true,
  maxIterations: 50,
  convergenceThreshold: 1e-4
};

// Batch operations
builder.addNodes(nodes); // Better than individual addNode() calls
builder.addEdges(edges);
```

## Advanced Features

### Temporal Network Analysis

```typescript
const snapshots = [
  GraphBuilder.createSnapshot(graph1, new Date('2025-01-01'), 'v1'),
  GraphBuilder.createSnapshot(graph2, new Date('2025-01-02'), 'v2'),
  GraphBuilder.createSnapshot(graph3, new Date('2025-01-03'), 'v3')
];

const temporalNetwork = GraphBuilder.buildTemporalNetwork(snapshots);

// Temporal link prediction
const predictor = new LinkPredictor(currentGraph);
const temporalPredictions = predictor.temporalPrediction(snapshots, 100);
```

### Heterogeneous Networks

```typescript
const heterogeneousGraph = GraphBuilder.createHeterogeneousGraph(
  [
    { id: 'user1', type: 'person', ... },
    { id: 'org1', type: 'organization', ... }
  ],
  [
    { source: 'user1', target: 'org1', type: 'works_at', ... }
  ]
);
```

## Use Cases

### 1. Organizational Network Analysis
- Identify key connectors and influencers
- Detect silos and bottlenecks
- Optimize communication flows
- Track knowledge diffusion

### 2. Social Media Intelligence
- Bot detection and attribution
- Coordinated inauthentic behavior
- Influence operations mapping
- Echo chamber identification

### 3. Threat Intelligence
- Actor attribution and tracking
- Campaign detection
- Network disruption analysis
- TTPs and infrastructure mapping

### 4. Fraud Detection
- Money laundering networks
- Collusion detection
- Shell company identification
- Risk propagation analysis

## Best Practices

1. **Start Small**: Test algorithms on subgraphs before applying to full network
2. **Validate Results**: Use multiple methods and compare outputs
3. **Monitor Performance**: Track execution time and resource usage
4. **Document Assumptions**: Record parameters and methodology
5. **Version Graphs**: Maintain snapshots for temporal analysis

## Troubleshooting

### Memory Issues
- Use streaming/chunking for very large graphs
- Enable garbage collection hints
- Consider graph database (Neo4j) integration

### Slow Performance
- Profile bottlenecks with timing logs
- Use approximate algorithms when exact values not needed
- Parallelize independent calculations

### Accuracy Concerns
- Compare multiple algorithms
- Validate against known ground truth
- Use ensemble methods for predictions

## References

- Newman, M.E.J. (2010). Networks: An Introduction
- Barabási, A.-L. (2016). Network Science
- Blondel et al. (2008). Fast unfolding of communities in large networks
- Kempe et al. (2003). Maximizing the spread of influence through a social network

## Support

For issues, questions, or contributions:
- GitHub: [IntelGraph Network Analysis](https://github.com/intelgraph/network-analysis)
- Documentation: [docs.intelgraph.com](https://docs.intelgraph.com)
- Email: support@intelgraph.com
