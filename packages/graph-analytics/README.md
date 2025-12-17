# Graph Analytics & Pattern Mining for IntelGraph

Advanced graph analytics engine with policy-aware algorithms, pattern mining templates, and XAI-integrated explanations.

## Features

### Core Algorithms

- **Pathfinding**
  - Shortest path (Dijkstra's algorithm)
  - K-shortest paths (Yen's algorithm)
  - Policy-aware filtering (node/edge types, policy labels)
  - Subgraph scoping (case/time filtering)
  - Resource budgets and performance controls

- **Centrality Measures**
  - PageRank
  - Betweenness Centrality
  - Closeness Centrality
  - Eigenvector Centrality

- **Community Detection**
  - Louvain Method
  - Label Propagation

- **Link Prediction**
- **Temporal Analysis**
- **Pattern Matching & Motif Discovery**

### Pattern Mining Templates

- **Co-Travel/Co-Presence Detection**
  - Spacetime pattern mining
  - Parameterized time windows and distance thresholds
  - Minimum co-occurrence filtering

- **Financial Structuring**
  - Fan-in pattern detection
  - Fan-out pattern detection
  - Amount thresholds and temporal windows

- **Communication Bursts & Lulls**
  - Burst detection (above baseline)
  - Lull detection (below baseline)
  - Configurable baseline rates and thresholds

### XAI Integration

All algorithms provide:
- **Explanation Metadata**: Element-level importance scores
- **Reasoning**: Human-readable explanations
- **Evidence**: Supporting facts for decisions
- **Feature Importances**: XAI-friendly feature attribution
- **Uncertainty Scores**: Confidence intervals

## Installation

```bash
pnpm add @intelgraph/graph-analytics
```

## Usage

### Pathfinding with Policy Awareness

```typescript
import { findShortestPath, type GraphData, type PathfindingOptions } from '@intelgraph/graph-analytics';

const graph: GraphData = {
  nodes: [
    { id: 'A', type: 'Person', policyLabels: ['public'] },
    { id: 'B', type: 'Organization', policyLabels: ['public'] },
    { id: 'C', type: 'Person', policyLabels: ['public'] },
  ],
  edges: [
    { source: 'A', target: 'B', type: 'WORKS_FOR', weight: 1 },
    { source: 'B', target: 'C', type: 'EMPLOYS', weight: 1 },
  ],
};

const options: PathfindingOptions = {
  policyFilter: {
    allowedNodeTypes: ['Person', 'Organization'],
    requiredPolicyLabels: ['public'],
  },
  scopeFilter: {
    startTime: Date.now() - 86400000, // Last 24 hours
    endTime: Date.now(),
  },
  maxNodesToExplore: 1000, // Resource budget
  generateExplanations: true, // Enable XAI
};

const result = findShortestPath(graph, 'A', 'C', options);

if (result.found && result.path) {
  console.log('Path:', result.path.path);
  console.log('Distance:', result.path.distance);
  console.log('Explanations:', result.path.explanations);
}
```

### K-Shortest Paths

```typescript
import { findKShortestPaths } from '@intelgraph/graph-analytics';

const result = findKShortestPaths(graph, 'A', 'C', 5, {
  policyFilter: {
    allowedEdgeTypes: ['WORKS_FOR', 'EMPLOYS', 'COLLABORATES'],
  },
  generateExplanations: true,
});

console.log(`Found ${result.paths.length} paths`);
result.paths.forEach((path, i) => {
  console.log(`Path ${i + 1}:`, path.path, 'Distance:', path.distance);
});
```

### Co-Travel Pattern Detection

```typescript
import { detectCoTravelPatterns, type CoTravelOptions } from '@intelgraph/graph-analytics';

const graph: GraphData = {
  nodes: [
    {
      id: 'Person1',
      type: 'Person',
      location: { lat: 40.7128, lon: -74.006 },
      timestamp: Date.now(),
    },
    {
      id: 'Person2',
      type: 'Person',
      location: { lat: 40.7130, lon: -74.0062 },
      timestamp: Date.now() + 1000,
    },
  ],
  edges: [],
};

const options: CoTravelOptions = {
  timeWindow: 300000, // 5 minutes
  distanceThreshold: 100, // 100 meters
  minCoOccurrences: 3,
  entityTypes: ['Person'],
};

const result = detectCoTravelPatterns(graph, options);

result.patterns.forEach((pattern) => {
  console.log('Co-travel pattern:', pattern.nodes);
  console.log('Confidence:', pattern.confidence);
  console.log('Metadata:', pattern.metadata);

  // XAI explanations
  pattern.explanations.forEach((exp) => {
    console.log(`  ${exp.elementId}: ${exp.reasoning}`);
    console.log(`  Evidence:`, exp.evidence);
    console.log(`  Feature Importances:`, exp.featureImportances);
  });
});
```

### Financial Structuring Detection

```typescript
import { detectFinancialStructuring, type FinancialStructuringOptions } from '@intelgraph/graph-analytics';

const graph: GraphData = {
  nodes: [
    { id: 'Account1', type: 'Account' },
    { id: 'Account2', type: 'Account' },
    { id: 'Account3', type: 'Account' },
    { id: 'Account4', type: 'Account' },
  ],
  edges: [
    {
      source: 'Account1',
      target: 'Account2',
      type: 'TRANSFER',
      timestamp: Date.now(),
      properties: { amount: 9500 },
    },
    {
      source: 'Account1',
      target: 'Account3',
      type: 'TRANSFER',
      timestamp: Date.now() + 1000,
      properties: { amount: 9500 },
    },
    {
      source: 'Account1',
      target: 'Account4',
      type: 'TRANSFER',
      timestamp: Date.now() + 2000,
      properties: { amount: 9500 },
    },
  ],
};

const options: FinancialStructuringOptions = {
  timeWindow: 3600000, // 1 hour
  minBranches: 3,
  maxHops: 1,
  amountThreshold: 9000,
  patternType: 'fan-out',
};

const result = detectFinancialStructuring(graph, options);

result.patterns.forEach((pattern) => {
  console.log('Structuring pattern detected:');
  console.log('  Type:', pattern.metadata.patternType);
  console.log('  Center:', pattern.metadata.centerNode);
  console.log('  Branches:', pattern.metadata.branches);
  console.log('  Total Amount:', pattern.metadata.totalAmount);

  // XAI explanations with feature importances
  pattern.explanations.forEach((exp) => {
    console.log(`  ${exp.reasoning}`);
    console.log(`  Importances:`, exp.featureImportances);
  });
});
```

### Communication Bursts Detection

```typescript
import { detectCommunicationBursts, type CommunicationBurstOptions } from '@intelgraph/graph-analytics';

const graph: GraphData = {
  nodes: [
    { id: 'Person1' },
    { id: 'Person2' },
  ],
  edges: Array.from({ length: 50 }, (_, i) => ({
    source: 'Person1',
    target: 'Person2',
    type: 'MESSAGE',
    timestamp: Date.now() + i * 1000,
  })),
};

const options: CommunicationBurstOptions = {
  timeWindow: 60000, // 1 minute windows
  burstThreshold: 3.0, // 3x baseline
  lullThreshold: 0.3, // 30% of baseline
  communicationTypes: ['MESSAGE', 'EMAIL'],
};

const result = detectCommunicationBursts(graph, options);

console.log('Bursts detected:', result.bursts.length);
result.bursts.forEach((burst) => {
  console.log('Burst:', burst.metadata.messageCount, 'messages');
  console.log('Ratio:', burst.metadata.burstRatio, 'x baseline');
  console.log('Window:', new Date(burst.metadata.timeWindow.start).toISOString());

  // XAI explanations
  burst.explanations.forEach((exp) => {
    console.log(`  ${exp.reasoning}`);
  });
});

console.log('Lulls detected:', result.lulls.length);
```

### Centrality Measures

```typescript
import {
  calculateBetweenness,
  calculateClosenessCentrality,
  calculateEigenvectorCentrality,
  calculatePageRank,
} from '@intelgraph/graph-analytics';

const graph = {
  nodes: ['A', 'B', 'C', 'D', 'E'],
  edges: [
    { source: 'A', target: 'B', weight: 1 },
    { source: 'B', target: 'C', weight: 1 },
    { source: 'C', target: 'D', weight: 1 },
    { source: 'D', target: 'E', weight: 1 },
    { source: 'E', target: 'A', weight: 1 },
  ],
};

// Betweenness Centrality
const betweenness = calculateBetweenness(graph, {
  normalized: true,
  directed: false,
});

// PageRank
const pagerank = calculatePageRank(graph, {
  dampingFactor: 0.85,
  maxIterations: 100,
});

// Closeness Centrality
const closeness = calculateClosenessCentrality(graph, {
  normalized: true,
  harmonic: true,
});

// Eigenvector Centrality
const eigenvector = calculateEigenvectorCentrality(graph, {
  maxIterations: 100,
  convergenceThreshold: 0.0001,
});
```

### Community Detection

```typescript
import {
  detectCommunitiesLouvain,
  detectCommunitiesLabelPropagation,
} from '@intelgraph/graph-analytics';

const graph = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    { source: 'A', target: 'B', weight: 1 },
    { source: 'B', target: 'C', weight: 1 },
    { source: 'D', target: 'E', weight: 1 },
    { source: 'E', target: 'F', weight: 1 },
  ],
};

// Louvain Method
const louvain = detectCommunitiesLouvain(graph, {
  resolution: 1.0,
  minModularityGain: 0.0001,
});

console.log('Communities:', louvain.numCommunities);
console.log('Modularity:', louvain.modularity);
console.log('Sizes:', louvain.communitySizes);

// Label Propagation
const labelProp = detectCommunitiesLabelPropagation(graph, {
  maxIterations: 100,
  seed: 42, // For reproducibility
});
```

## Integration with Graph-XAI Service

The analytics layer integrates with the Graph-XAI service by emitting explanation records:

```typescript
import { GraphXAIExplainer } from '@intelgraph/server/services/xai/graph-explainer';

// After running analytics
const result = findShortestPath(graph, source, target, {
  generateExplanations: true,
});

// Optionally send to Graph-XAI service for advanced explanations
if (result.path?.explanations) {
  const xaiExplainer = GraphXAIExplainer.getInstance();

  const xaiResult = await xaiExplainer.generateExplanation({
    query: `Shortest path from ${source} to ${target}`,
    graph_data: { nodes: graph.nodes, edges: graph.edges },
    explanation_type: 'path_explanation',
    context: {
      local_explanations: result.path.explanations,
      algorithm: 'dijkstra',
      distance: result.path.distance,
    },
  });

  console.log('XAI Explanation:', xaiResult.explanations);
  console.log('Confidence:', xaiResult.confidence);
}
```

## Performance Considerations

### Resource Budgets

All algorithms support resource budgets to prevent excessive computation:

```typescript
const result = findShortestPath(graph, source, target, {
  maxNodesToExplore: 1000, // Limit nodes explored
  maxPathLength: 10, // Limit path length
  scopeFilter: {
    maxSubgraphSize: 5000, // Limit graph size
  },
});

console.log('Budget exceeded:', result.metadata.budgetExceeded);
console.log('Nodes explored:', result.nodesExplored);
```

### Sampling for Large Graphs

Use sampling options for approximate results on large graphs:

```typescript
const betweenness = calculateBetweenness(largeGraph, {
  sampleSize: 100, // Sample 100 nodes for approximate betweenness
  normalized: true,
});

console.log('Approximate:', betweenness.approximate);
```

### Performance Metrics

All algorithms return execution time and metadata:

```typescript
const result = detectCoTravelPatterns(graph, options);

console.log('Execution time:', result.executionTime, 'ms');
console.log('Nodes analyzed:', result.metadata.nodesAnalyzed);
console.log('Time range:', result.metadata.timeRange);
```

## API Reference

### Types

#### GraphData

```typescript
interface GraphData {
  nodes: Array<{
    id: string;
    type?: string;
    properties?: Record<string, any>;
    location?: { lat: number; lon: number };
    timestamp?: number;
    policyLabels?: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    type?: string;
    weight?: number;
    properties?: Record<string, any>;
    timestamp?: number;
    policyLabels?: string[];
  }>;
}
```

#### PathfindingOptions

```typescript
interface PathfindingOptions {
  directed?: boolean;
  weightProperty?: string;
  policyFilter?: PolicyFilter;
  scopeFilter?: ScopeFilter;
  maxPathLength?: number;
  maxNodesToExplore?: number;
  generateExplanations?: boolean;
}
```

#### PatternExplanation

```typescript
interface PatternExplanation {
  elementId: string;
  elementType: 'node' | 'edge' | 'pattern';
  importanceScore: number; // 0-1
  reasoning: string;
  evidence: string[];
  uncertainty: number; // 0-1
  featureImportances?: Record<string, number>;
}
```

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test pathfinding.test.ts
```

## Contributing

See [CLAUDE.md](../../CLAUDE.md) for development guidelines and code conventions.

## License

MIT

## Authors

IntelGraph Graph Analytics Team

---

**Keywords**: graph analytics, pathfinding, pattern mining, XAI, explainability, intelligence analysis, network analysis, centrality, community detection, co-travel, financial structuring, communication bursts
