# @summit/data-lineage

Enterprise data lineage tracking with end-to-end mapping, column-level tracking, and impact analysis. Track data flows across your entire data ecosystem, understand dependencies, and analyze the impact of changes before they happen.

## Features

- **End-to-End Lineage Mapping** - Track data flows from source to consumption
- **Column-Level Lineage** - Granular tracking at the column level with transformation mapping
- **Impact Analysis** - Analyze downstream impact of schema changes, removals, and modifications
- **Dependency Graphs** - Visualize upstream and downstream dependencies
- **Transformation Tracking** - Capture and track data transformations
- **Source-to-Target Mapping** - Define and validate data mappings
- **Automated Discovery** - Automatically discover lineage from SQL, metadata, and APIs
- **Multiple Export Formats** - Export to JSON, DOT, Cytoscape, D3
- **Graph Visualization** - Build subgraphs, find paths, detect circular dependencies
- **Production-Ready** - TypeScript, comprehensive error handling, PostgreSQL persistence

## Installation

```bash
npm install @summit/data-lineage
# or
pnpm add @summit/data-lineage
```

## Quick Start

```typescript
import { LineageEngine } from '@summit/data-lineage';
import { Pool } from 'pg';

// Initialize with optional PostgreSQL connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const engine = new LineageEngine({
  pool,
  enableAutoDiscovery: true,
  defaultScanDepth: 10,
  criticalSystems: ['customer_dashboard', 'revenue_report'],
});

// Register data assets
const sourceTable = await engine.registerNode({
  name: 'customers',
  type: 'table',
  platform: 'postgres',
  schema: 'public',
  owner: 'data-team',
  tags: ['pii', 'production'],
  metadata: {},
  columns: [
    {
      name: 'customer_id',
      dataType: 'integer',
      nullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      tags: [],
      transformations: [],
    },
    {
      name: 'email',
      dataType: 'varchar',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      classification: 'pii',
      tags: ['sensitive'],
      transformations: [],
    },
  ],
});

const targetTable = await engine.registerNode({
  name: 'customer_summary',
  type: 'materialized-view',
  platform: 'postgres',
  schema: 'analytics',
  owner: 'analytics-team',
  tags: ['analytics'],
  metadata: {},
  columns: [
    {
      name: 'customer_id',
      dataType: 'integer',
      nullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      tags: [],
      transformations: [],
    },
    {
      name: 'email_domain',
      dataType: 'varchar',
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
      tags: [],
      transformations: [],
    },
  ],
});

// Track column-level lineage
await engine.trackColumnLineage(
  sourceTable.id,
  targetTable.id,
  [
    {
      sourceColumns: ['customer_id'],
      targetColumn: 'customer_id',
      confidence: 1.0,
    },
    {
      sourceColumns: ['email'],
      targetColumn: 'email_domain',
      transformation: {
        type: 'custom',
        expression: 'SUBSTRING(email FROM POSITION(\'@\' IN email) + 1)',
        description: 'Extract domain from email',
      },
      confidence: 1.0,
    },
  ]
);

// Analyze impact of removing a column
const impact = engine.analyzeSchemaChange(sourceTable.id, {
  removedColumns: ['email'],
});

console.log(`Risk Level: ${impact.riskLevel}`);
console.log(`Affected Nodes: ${impact.affectedNodes.length}`);
console.log(`Recommendations:`, impact.recommendations);
```

## Core Concepts

### LineageNode

Represents a data asset in your ecosystem (table, view, file, API, dashboard, ML model, etc.).

```typescript
const node: LineageNode = {
  id: 'uuid',
  name: 'customer_orders',
  type: 'table',
  subtype: 'fact',
  schema: 'production',
  database: 'analytics_db',
  platform: 'snowflake',
  owner: 'data-team',
  description: 'Customer order transactions',
  tags: ['production', 'revenue'],
  metadata: { retention_days: 365 },
  columns: [...],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### LineageEdge

Represents a relationship/dependency between two nodes.

```typescript
const edge: LineageEdge = {
  id: 'uuid',
  sourceNodeId: 'source-id',
  targetNodeId: 'target-id',
  type: 'transformation',
  transformationType: 'aggregate',
  transformationLogic: 'SELECT customer_id, SUM(amount) ...',
  confidence: 0.95,
  discoveryMethod: 'sql-parsing',
  columnMappings: [...],
  metadata: {},
  createdAt: new Date(),
};
```

### Column-Level Tracking

Track lineage at the column level with transformations.

```typescript
const columnMapping: ColumnMapping = {
  sourceColumns: ['first_name', 'last_name'],
  targetColumn: 'full_name',
  transformation: {
    type: 'concatenate',
    expression: 'CONCAT(first_name, \' \', last_name)',
    description: 'Combine name fields',
  },
  confidence: 1.0,
};
```

## Advanced Usage

### Automated Lineage Discovery

```typescript
// Discover lineage from SQL queries
const sql = `
  CREATE VIEW customer_metrics AS
  SELECT
    c.customer_id,
    c.email,
    COUNT(o.order_id) as order_count
  FROM customers c
  LEFT JOIN orders o ON c.customer_id = o.customer_id
  GROUP BY c.customer_id, c.email
`;

const edges = await engine.discoverFromSQL(sql, targetNodeId, {
  platform: 'postgres',
  schema: 'analytics',
});

// Full lineage scan
const result = await engine.scanLineage({
  sources: [nodeId1, nodeId2],
  maxDepth: 5,
  direction: 'both',
  includeColumnLineage: true,
  discoveryMethods: ['sql-parsing', 'metadata-scanning'],
});

console.log(`Discovered ${result.discoveredNodes.length} nodes`);
console.log(`Discovered ${result.discoveredEdges.length} edges`);
```

### Building Lineage Graphs

```typescript
// Build complete graph
const graph = engine.buildGraph({
  name: 'Production Data Lineage',
  direction: 'both',
  maxDepth: 10,
});

// Build subgraph focused on a specific node
const subgraph = engine.buildSubgraph(nodeId, {
  direction: 'downstream',
  maxDepth: 5,
  includeNodeTypes: ['table', 'view', 'report'],
});

// Build dependency graph
const deps = engine.buildDependencyGraph(nodeId);
console.log(`Upstream dependencies: ${deps.upstream.nodes.length}`);
console.log(`Downstream dependencies: ${deps.downstream.nodes.length}`);
console.log(`Critical path: ${deps.criticalPath.map(n => n.name).join(' -> ')}`);

// Find paths between nodes
const paths = engine.findPaths(sourceNodeId, targetNodeId, 10);
paths.forEach(path => {
  console.log(`Path length: ${path.length}, Confidence: ${path.confidence}`);
  console.log(`Path: ${path.path.map(p => p.node.name).join(' -> ')}`);
});
```

### Impact Analysis

```typescript
// Analyze schema changes
const impact = engine.analyzeSchemaChange(nodeId, {
  addedColumns: ['new_field'],
  removedColumns: ['old_field'],
  renamedColumns: [{ old: 'name', new: 'full_name' }],
  typeChanges: [{ column: 'amount', oldType: 'integer', newType: 'decimal' }],
});

console.log(`Risk Level: ${impact.riskLevel}`);
console.log(`Systems Impacted: ${impact.estimatedImpact.systemsImpacted}`);
console.log(`Reports Impacted: ${impact.estimatedImpact.reportsImpacted}`);
console.log(`Estimated Downtime: ${impact.estimatedImpact.estimatedDowntime}`);

// Check affected nodes
impact.affectedNodes.forEach(affected => {
  console.log(`${affected.node.name}: ${affected.severity} (distance: ${affected.distance})`);
  if (affected.breakingChange) {
    console.log(`  BREAKING CHANGE - Migration required`);
  }
});

// Review recommendations
impact.recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.category}: ${rec.action}`);
  console.log(`  Rationale: ${rec.rationale}`);
});

// Analyze node removal
const removalImpact = engine.analyzeNodeRemoval(nodeId);

// Estimate blast radius
const blastRadius = engine.estimateBlastRadius(nodeId);
console.log(`Total affected: ${blastRadius.totalAffected}`);
console.log(`Critical paths affected: ${blastRadius.criticalPathsAffected}`);
```

### Lineage Navigation

```typescript
// Get upstream dependencies
const upstream = engine.getUpstreamNodes(nodeId, 5);
console.log(`Dependencies: ${upstream.map(n => n.name).join(', ')}`);

// Get downstream dependents
const downstream = engine.getDownstreamNodes(nodeId, 5);
console.log(`Dependents: ${downstream.map(n => n.name).join(', ')}`);

// Trace column lineage
const columnTrace = engine.traceColumnLineage(nodeId, 'email', 'upstream');
columnTrace.forEach(trace => {
  console.log(`${trace.node.name}.${trace.column}`);
  if (trace.transformation) {
    console.log(`  Transformation: ${trace.transformation.expression}`);
  }
});
```

### Searching and Querying

```typescript
// Search for nodes
const results = engine.searchNodes({
  nodeName: 'customer',
  nodeType: 'table',
  platform: 'postgres',
  tags: ['production'],
  owner: 'data-team',
  columnName: 'email',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date(),
  },
});

// Get lineage metrics
const metrics = engine.calculateMetrics();
console.log(`Total nodes: ${metrics.totalNodes}`);
console.log(`Total edges: ${metrics.totalEdges}`);
console.log(`Average depth: ${metrics.averageDepth}`);
console.log(`Orphaned nodes: ${metrics.orphanedNodes}`);
console.log(`Circular dependencies: ${metrics.circularDependencies}`);
console.log(`Coverage: ${metrics.coverage}%`);

// Detect circular dependencies
const cycles = engine.detectCircularDependencies();
if (cycles.length > 0) {
  console.log(`Found ${cycles.length} circular dependencies`);
  cycles.forEach(cycle => {
    console.log(`Cycle: ${cycle.join(' -> ')}`);
  });
}
```

### Graph Export

```typescript
// Export to JSON
const json = engine.exportGraph(graph, 'json');

// Export to DOT (Graphviz)
const dot = engine.exportGraph(graph, 'dot');

// Export to Cytoscape format
const cytoscape = engine.exportGraph(graph, 'cytoscape');

// Export to D3 format
const d3 = engine.exportGraph(graph, 'd3');
```

### Source-to-Target Mapping

```typescript
const mapping: SourceTargetMapping = {
  id: 'uuid',
  sourceSystems: [
    {
      id: 'src1',
      name: 'orders_table',
      type: 'table',
      schema: 'public',
      table: 'orders',
      metadata: {},
    },
  ],
  targetSystem: {
    id: 'tgt1',
    name: 'order_summary',
    type: 'view',
    schema: 'analytics',
    table: 'order_summary',
    metadata: {},
  },
  mappings: [
    {
      sourceFields: ['order_id'],
      targetField: 'id',
      required: true,
    },
    {
      sourceFields: ['order_total'],
      targetField: 'total_amount',
      transformation: {
        id: 'trans1',
        name: 'Round to 2 decimals',
        type: 'custom',
        expression: 'ROUND(order_total, 2)',
        language: 'sql',
        parameters: {},
      },
      required: true,
    },
  ],
  transformationRules: [],
  validationRules: [],
  status: 'active',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validation = engine.validateMapping(mapping);
if (!validation.valid) {
  console.log('Mapping errors:', validation.errors);
}
```

## API Reference

### LineageEngine

Main orchestrator class for all lineage operations.

#### Constructor

```typescript
new LineageEngine(config?: LineageEngineConfig)
```

#### Node Management

- `registerNode(node)` - Register a new data asset
- `updateNode(nodeId, updates)` - Update an existing node
- `getNode(nodeId)` - Get a specific node
- `getAllNodes()` - Get all nodes
- `searchNodes(query)` - Search for nodes

#### Edge Management

- `registerEdge(edge)` - Register a lineage relationship
- `trackColumnLineage(sourceId, targetId, mappings, transformation?)` - Track column-level lineage
- `getAllEdges()` - Get all edges

#### Discovery

- `discoverFromSQL(sql, targetNodeId, options?)` - Discover lineage from SQL
- `scanLineage(config)` - Scan data sources for lineage
- `autoDiscoverLineage(options?)` - Auto-discover lineage for all nodes

#### Graph Building

- `buildGraph(options?)` - Build complete lineage graph
- `buildSubgraph(focusNodeId, options?)` - Build subgraph focused on a node
- `buildDependencyGraph(nodeId, maxDepth?)` - Build dependency graph
- `findPaths(sourceId, targetId, maxPaths?)` - Find paths between nodes
- `exportGraph(graph, format)` - Export graph in various formats
- `calculateMetrics(graph?)` - Calculate lineage metrics

#### Impact Analysis

- `analyzeImpact(nodeId, changeType, description, options?)` - Analyze impact of a change
- `analyzeSchemaChange(nodeId, schemaChanges)` - Analyze schema change impact
- `analyzeNodeRemoval(nodeId, replacementNodeId?)` - Analyze node removal impact
- `compareNodeVersions(oldVersion, newVersion)` - Compare node versions
- `estimateBlastRadius(nodeId, maxDepth?)` - Estimate blast radius

#### Navigation

- `getUpstreamNodes(nodeId, maxDepth?)` - Get upstream dependencies
- `getDownstreamNodes(nodeId, maxDepth?)` - Get downstream dependents
- `traceColumnLineage(nodeId, columnName, direction?)` - Trace column lineage

#### Utilities

- `getSummary()` - Get lineage summary statistics
- `detectCircularDependencies()` - Detect circular dependencies
- `getEvents(filters?)` - Get lineage events
- `createMapping(mapping)` - Create source-to-target mapping
- `validateMapping(mapping)` - Validate a mapping

## Node Types

- `table` - Database table
- `view` - Database view
- `materialized-view` - Materialized view
- `file` - File (CSV, Parquet, etc.)
- `api` - REST/GraphQL API
- `stream` - Data stream (Kafka, Kinesis)
- `report` - Business report
- `dashboard` - Analytics dashboard
- `ml-model` - Machine learning model
- `transformation` - ETL/ELT transformation
- `stored-procedure` - Stored procedure
- `function` - Function/UDF

## Edge Types

- `direct-copy` - Direct copy with no transformation
- `transformation` - Data transformation
- `aggregation` - Aggregation operation
- `join` - Join operation
- `union` - Union operation
- `filter` - Filter operation
- `lookup` - Lookup/reference
- `derived` - Derived calculation

## Change Types

- `schema-change` - General schema change
- `column-add` - Column addition
- `column-remove` - Column removal
- `column-rename` - Column rename
- `datatype-change` - Data type change
- `transformation-change` - Transformation logic change
- `data-source-change` - Data source change
- `deprecation` - Deprecation
- `removal` - Node removal

## Risk Levels

- `critical` - Critical impact requiring immediate attention
- `high` - High impact requiring careful planning
- `medium` - Medium impact with manageable risks
- `low` - Low impact with minimal risks
- `informational` - Informational only, no risk

## Best Practices

1. **Register All Data Assets** - Register all tables, views, files, APIs, reports, and dashboards
2. **Track Column Lineage** - Enable column-level tracking for better impact analysis
3. **Use Automated Discovery** - Leverage SQL parsing and metadata scanning for automatic lineage
4. **Define Critical Systems** - Mark production reports and dashboards as critical
5. **Regular Scans** - Run periodic lineage scans to keep mappings up-to-date
6. **Analyze Before Changes** - Always run impact analysis before schema changes
7. **Document Transformations** - Include clear descriptions for transformations
8. **Tag Appropriately** - Use tags for classification (PII, production, etc.)
9. **Version Control** - Track changes to lineage over time
10. **Monitor Metrics** - Regularly review lineage metrics and coverage

## License

MIT

## Support

For issues and questions, please open an issue on GitHub or contact the Summit data team.
