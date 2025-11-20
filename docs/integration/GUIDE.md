# Data Integration Platform Guide

## Overview

The Summit Data Integration Platform is an enterprise-grade ETL/ELT solution that provides comprehensive data integration capabilities for intelligence operations. This platform positions Summit as a superior alternative to specialized tools like Informatica and Talend.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [Pipeline Development](#pipeline-development)
5. [Transformations](#transformations)
6. [Workflow Orchestration](#workflow-orchestration)
7. [Change Data Capture](#change-data-capture)
8. [Data Quality](#data-quality)
9. [Performance Optimization](#performance-optimization)
10. [Monitoring & Observability](#monitoring--observability)

## Architecture

The platform consists of several key packages and services:

### Packages

- **@intelgraph/data-integration**: Core integration framework with type definitions and base classes
- **@intelgraph/etl-engine**: ETL/ELT execution engine with transformation capabilities
- **@intelgraph/workflow-orchestration**: DAG-based workflow orchestration engine
- **@intelgraph/cdc-engine**: Change Data Capture engine with multiple strategies
- **@intelgraph/data-connectors**: Pre-built connectors for various data sources

### Services

- **integration-service**: REST API for managing pipelines, connectors, and workflows
- **pipeline-service**: Distributed pipeline execution workers

## Core Components

### 1. Data Integration Framework (@intelgraph/data-integration)

The foundation of the platform, providing:

- Type-safe configuration schemas using Zod
- Base connector and pipeline abstractions
- Comprehensive type definitions for all components
- Event-driven architecture for real-time monitoring

**Key Interfaces:**

```typescript
import {
  IConnector,
  IPipeline,
  ITransformer,
  IntegrationConfig,
} from '@intelgraph/data-integration';
```

### 2. ETL Engine (@intelgraph/etl-engine)

Executes data pipelines with support for both ETL and ELT patterns:

**ETL (Extract, Transform, Load):**
- Extract data from source
- Apply transformations in-flight
- Load transformed data to target

**ELT (Extract, Load, Transform):**
- Extract and load raw data to target
- Transform data in target system (efficient for data warehouses)

**Example:**

```typescript
import { ETLEngine } from '@intelgraph/etl-engine';
import { PipelineMode } from '@intelgraph/data-integration';

const pipeline = new ETLEngine({
  id: 'my-pipeline',
  name: 'Customer Data Pipeline',
  mode: PipelineMode.ETL,
  source: {
    type: DataSourceType.POSTGRES,
    name: 'source-db',
    host: 'localhost',
    port: 5432,
    database: 'source',
    username: 'user',
    password: 'pass',
  },
  target: {
    type: DataSourceType.POSTGRES,
    name: 'target-db',
    host: 'localhost',
    port: 5432,
    database: 'target',
    username: 'user',
    password: 'pass',
  },
  transformations: [
    {
      id: 'map-fields',
      type: TransformationType.MAP,
      name: 'Map customer fields',
      config: {
        mappings: [
          { source: 'first_name', target: 'firstName' },
          { source: 'last_name', target: 'lastName' },
          { source: 'email', target: 'emailAddress' },
        ],
      },
    },
  ],
});

// Execute pipeline
const result = await pipeline.execute();
console.log(`Processed ${result.metrics.recordsProcessed} records`);
```

### 3. Workflow Orchestration (@intelgraph/workflow-orchestration)

DAG-based workflow engine for complex data pipelines:

**Features:**
- Directed Acyclic Graph (DAG) execution
- Parallel and sequential task execution
- Conditional branching
- Dependency management
- Cron and event-driven scheduling

**Example:**

```typescript
import { WorkflowOrchestrator } from '@intelgraph/workflow-orchestration';

const orchestrator = new WorkflowOrchestrator();

// Define workflow
const workflowId = await orchestrator.createWorkflow({
  id: 'customer-workflow',
  name: 'Customer Data Workflow',
  nodes: [
    {
      id: 'extract',
      type: 'extract',
      name: 'Extract Customer Data',
      config: { source: 'customers' },
    },
    {
      id: 'transform',
      type: 'transform',
      name: 'Transform Data',
      config: { transformation: 'normalize' },
      dependencies: ['extract'],
    },
    {
      id: 'load',
      type: 'load',
      name: 'Load to Warehouse',
      config: { target: 'warehouse' },
      dependencies: ['transform'],
    },
  ],
  schedule: {
    type: 'cron',
    expression: '0 0 * * *', // Daily at midnight
  },
});

// Execute workflow
const executionId = await orchestrator.executeWorkflow(workflowId);
```

### 4. Change Data Capture (@intelgraph/cdc-engine)

Capture and stream database changes in real-time:

**Supported CDC Modes:**
- **Log-based CDC**: Read from database transaction logs
- **Timestamp-based CDC**: Track changes using timestamp columns
- **Trigger-based CDC**: Use database triggers
- **Delta detection**: Compare snapshots
- **Query-based CDC**: Custom SQL queries

**Example:**

```typescript
import { CDCEngine, CDCMode } from '@intelgraph/cdc-engine';

const cdc = new CDCEngine({
  mode: CDCMode.TIMESTAMP_BASED,
  source: sourceConfig,
  tables: ['customers', 'orders'],
  incrementalColumn: 'updated_at',
  pollInterval: 60000, // Poll every minute
});

// Start CDC
await cdc.start();

// Process changes
for await (const change of cdc.getChanges()) {
  console.log(`Change detected: ${change.operation} on ${change.table}`);
  // Process change...
}
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Start integration service
cd services/integration-service
pnpm dev
```

### Quick Start Example

```typescript
import { ETLEngine, MapTransformer } from '@intelgraph/etl-engine';
import { PostgresConnector } from '@intelgraph/data-connectors';

// 1. Create source connector
const sourceConnector = new PostgresConnector();
await sourceConnector.connect({
  type: DataSourceType.POSTGRES,
  name: 'source',
  host: 'localhost',
  database: 'mydb',
  username: 'user',
  password: 'pass',
});

// 2. Create target connector
const targetConnector = new PostgresConnector();
await targetConnector.connect({
  type: DataSourceType.POSTGRES,
  name: 'target',
  host: 'localhost',
  database: 'warehouse',
  username: 'user',
  password: 'pass',
});

// 3. Create pipeline
const pipeline = new ETLEngine({
  id: 'quick-start',
  name: 'Quick Start Pipeline',
  mode: PipelineMode.ETL,
  source: sourceConfig,
  target: targetConfig,
});

pipeline.setSourceConnector(sourceConnector);
pipeline.setTargetConnector(targetConnector);

// 4. Execute
const result = await pipeline.execute();
console.log('Pipeline completed:', result);
```

## Pipeline Development

### Pipeline Configuration

Pipelines are configured using the `IntegrationConfig` interface:

```typescript
interface IntegrationConfig {
  id: string;
  name: string;
  description?: string;
  mode: PipelineMode;
  source: ConnectionConfig;
  target: ConnectionConfig;
  transformations?: TransformationConfig[];
  validation?: ValidationConfig;
  errorHandling?: ErrorHandlingConfig;
  performance?: PerformanceConfig;
  schedule?: ScheduleConfig;
  cdc?: CDCConfig;
  dataQuality?: DataQualityRule[];
}
```

### Error Handling

Configure error handling strategies:

```typescript
errorHandling: {
  strategy: ErrorStrategy.RETRY,
  retryAttempts: 3,
  retryDelay: 1000,
  retryBackoff: 'exponential',
  deadLetterQueue: 'failed-records',
}
```

**Available Strategies:**
- `RETRY`: Retry failed operations
- `SKIP`: Skip failed records
- `FAIL`: Fail entire pipeline
- `DEAD_LETTER`: Send to dead letter queue
- `FALLBACK`: Use fallback value
- `CIRCUIT_BREAKER`: Circuit breaker pattern

### Performance Configuration

Optimize pipeline performance:

```typescript
performance: {
  parallelism: 4,
  batchSize: 1000,
  connectionPoolSize: 10,
  cacheEnabled: true,
  compressionEnabled: true,
  compressionType: 'gzip',
}
```

## Transformations

### Built-in Transformers

#### Map Transformer

Transform field mappings:

```typescript
{
  type: TransformationType.MAP,
  config: {
    mappings: [
      {
        source: 'old_field',
        target: 'new_field',
        transform: (value) => value.toUpperCase(),
      },
    ],
  },
}
```

#### Filter Transformer

Filter records based on conditions:

```typescript
{
  type: TransformationType.FILTER,
  config: {
    condition: 'age >= 18',
    invert: false,
  },
}
```

#### Aggregate Transformer

Aggregate data:

```typescript
{
  type: TransformationType.AGGREGATE,
  config: {
    groupBy: 'category',
    aggregations: [
      { field: 'amount', operation: 'sum', outputField: 'total' },
      { field: 'id', operation: 'count', outputField: 'count' },
    ],
  },
}
```

### Custom Transformers

Create custom transformers:

```typescript
import { BaseTransformer } from '@intelgraph/etl-engine';

class MyTransformer extends BaseTransformer {
  constructor() {
    super('my-transformer');
  }

  async transform(record: any, config?: any): Promise<any> {
    // Custom transformation logic
    return {
      ...record,
      processed: true,
      timestamp: new Date(),
    };
  }
}

// Register transformer
pipeline.registerTransformer('my-custom', new MyTransformer());
```

## Monitoring & Observability

### Pipeline Metrics

Monitor pipeline execution:

```typescript
const metrics = await pipeline.getMetrics(executionId);

console.log(`Records processed: ${metrics.recordsProcessed}`);
console.log(`Success rate: ${metrics.recordsSucceeded / metrics.recordsProcessed}`);
console.log(`Duration: ${metrics.duration}ms`);
console.log(`Throughput: ${metrics.throughput} records/sec`);
```

### Event Monitoring

Subscribe to pipeline events:

```typescript
pipeline.on('execution:started', ({ executionId }) => {
  console.log('Pipeline started:', executionId);
});

pipeline.on('progress', ({ recordsProcessed, total }) => {
  console.log(`Progress: ${recordsProcessed}/${total}`);
});

pipeline.on('execution:completed', ({ executionId }) => {
  console.log('Pipeline completed:', executionId);
});

pipeline.on('error', ({ error, context }) => {
  console.error('Pipeline error:', error);
});
```

## API Reference

### REST API Endpoints

#### Pipelines

- `GET /api/v1/pipelines` - List all pipelines
- `POST /api/v1/pipelines` - Create pipeline
- `GET /api/v1/pipelines/:id` - Get pipeline
- `PUT /api/v1/pipelines/:id` - Update pipeline
- `DELETE /api/v1/pipelines/:id` - Delete pipeline
- `POST /api/v1/pipelines/:id/execute` - Execute pipeline
- `GET /api/v1/pipelines/:id/executions` - Get execution history

#### Connectors

- `GET /api/v1/connectors` - List available connectors
- `POST /api/v1/connectors/test` - Test connection

#### Workflows

- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `POST /api/v1/workflows/:id/execute` - Execute workflow

## Best Practices

1. **Use appropriate pipeline mode**: ETL for transformations, ELT for data warehouses
2. **Configure error handling**: Always configure retry and dead letter strategies
3. **Optimize batch sizes**: Tune batch sizes based on data volume and target system
4. **Enable monitoring**: Subscribe to pipeline events for real-time monitoring
5. **Use CDC for real-time**: Implement CDC for real-time data synchronization
6. **Validate data quality**: Configure data quality rules to ensure data integrity
7. **Implement incremental loading**: Use CDC or timestamp-based incremental loading
8. **Use workflow orchestration**: Complex pipelines should use DAG orchestration
9. **Monitor performance**: Track metrics and optimize based on throughput
10. **Test pipelines**: Use dry-run mode before production execution

## Next Steps

- [Connector Guide](./CONNECTORS.md) - Learn about available connectors
- [Best Practices](./BEST_PRACTICES.md) - Advanced optimization techniques
- Examples - Browse example implementations
