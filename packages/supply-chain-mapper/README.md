# @intelgraph/supply-chain-mapper

Supply chain network mapping, visualization, and analysis capabilities.

## Features

- **Network Analysis**: Topology analysis, critical path identification, dependency mapping
- **Visualization**: Interactive graph generation with multiple layout options
- **Geographic Distribution**: Geographic mapping and concentration risk analysis
- **Bottleneck Detection**: Identify single points of failure and bottlenecks
- **Diversification Analysis**: Supplier diversification and concentration metrics

## Installation

```bash
pnpm add @intelgraph/supply-chain-mapper
```

## Usage

### Network Analysis

```typescript
import { NetworkAnalyzer } from '@intelgraph/supply-chain-mapper';
import { SupplyChainNode, SupplyChainRelationship } from '@intelgraph/supply-chain-types';

const analyzer = new NetworkAnalyzer();

// Analyze network topology
const topology = analyzer.analyzeTopology(nodes, relationships);
console.log(`Network has ${topology.totalNodes} nodes with density ${topology.networkDensity}`);

// Find critical paths
const criticalPath = analyzer.findCriticalPaths(
  sourceNodeId,
  targetNodeId,
  nodes,
  relationships
);
console.log(`Critical path: ${criticalPath.path.join(' -> ')}`);
console.log(`Lead time: ${criticalPath.totalLeadTime} days`);

// Analyze dependencies
const deps = analyzer.analyzeDependencies(nodeId, nodes, relationships);
console.log(`Node has ${deps.totalDependencies} upstream dependencies`);
console.log(`Impact score: ${deps.impactScore}/100`);

// Analyze diversification
const diversification = analyzer.analyzeDiversification(
  componentId,
  nodes,
  relationships
);
console.log(`Component has ${diversification.supplierCount} suppliers`);
console.log(`Concentration risk: ${diversification.concentrationRisk}`);
```

### Visualization

```typescript
import { VisualizationService } from '@intelgraph/supply-chain-mapper';

const visService = new VisualizationService();

// Generate visualization graph
const graph = visService.toVisualizationGraph(
  nodes,
  relationships,
  'hierarchical' // or 'force', 'geographic', 'circular'
);

// Get geographic distribution
const geoDist = visService.getGeographicDistribution(nodes);
console.log(`Supply chain spans ${geoDist.countries.length} countries`);

// Get dashboard data
const dashboard = visService.getDashboardData(nodes, relationships);
console.log(`Active nodes: ${dashboard.overview.activeNodes}`);
console.log(`Critical nodes: ${dashboard.criticality.critical}`);
```

## API

### NetworkAnalyzer

- `analyzeTopology(nodes, relationships)`: Analyze network topology and structure
- `findCriticalPaths(source, target, nodes, relationships)`: Find critical paths
- `analyzeDependencies(nodeId, nodes, relationships)`: Analyze node dependencies
- `analyzeDiversification(componentId, nodes, relationships)`: Analyze supplier diversification

### VisualizationService

- `toVisualizationGraph(nodes, relationships, layout)`: Convert to visualization format
- `getGeographicDistribution(nodes)`: Get geographic distribution data
- `getTierVisualization(nodes, relationships)`: Get hierarchical tier data
- `getDashboardData(nodes, relationships)`: Get real-time dashboard metrics

## License

Proprietary - IntelGraph
