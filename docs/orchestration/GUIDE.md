# Workflow Orchestration Platform Guide

## Overview

Summit's Workflow Orchestration Platform is an enterprise-grade, DAG-based workflow engine designed for intelligence operations. It provides comprehensive workflow management, distributed task execution, and advanced scheduling capabilities that surpass specialized tools like Apache Airflow and Temporal.

## Architecture

### Core Components

1. **DAG Engine** (`@summit/dag-engine`)
   - Directed Acyclic Graph definition and validation
   - Task dependency management
   - Execution engine with retry logic
   - Circular dependency detection

2. **Task Scheduling** (`@summit/task-scheduling`)
   - Cron-based scheduling
   - Event-driven triggers
   - Sensor-based activation
   - Catchup and backfill support

3. **Workflow Operators** (`@summit/workflow-operators`)
   - Bash operator
   - Python operator
   - HTTP operator
   - Email operator
   - Transfer operator
   - Branch operator
   - Custom operator support

4. **Workflow Orchestration** (`@summit/workflow-orchestration`)
   - State management and persistence
   - Worker pool for distributed execution
   - Jinja templating for parameter substitution

5. **Workflow Monitoring** (`@summit/workflow-monitoring`)
   - Metrics collection
   - Alert management
   - Performance tracking

6. **Orchestration Service**
   - REST API for workflow management
   - Execution control (pause/resume/cancel)
   - Monitoring endpoints

## Quick Start

### 1. Define a Workflow

```typescript
import { DAG, TaskConfig } from '@summit/dag-engine';

const dag = new DAG({
  dagId: 'intelligence_pipeline',
  description: 'Intelligence data processing pipeline',
  schedule: '0 */6 * * *', // Every 6 hours
  startDate: new Date('2025-01-01'),
  maxActiveRuns: 1,
  catchup: false,
});

// Add tasks
dag.addTask({
  taskId: 'fetch_data',
  operator: 'http',
  params: {
    url: 'https://api.example.com/data',
    method: 'GET',
  },
});

dag.addTask({
  taskId: 'process_data',
  operator: 'python',
  params: {
    pythonCode: `
import json
data = json.loads('{{ ti.xcom_pull(task_ids="fetch_data") }}')
processed = [item for item in data if item['priority'] == 'high']
print(json.dumps(processed))
    `,
  },
  dependencies: ['fetch_data'],
});

dag.addTask({
  taskId: 'send_alert',
  operator: 'email',
  params: {
    to: 'analyst@example.com',
    subject: 'Intelligence Alert',
    body: 'New high-priority intelligence data available',
  },
  dependencies: ['process_data'],
  triggerRule: 'one_success',
});
```

### 2. Register and Execute

```typescript
import { OrchestrationController } from '@summit/orchestration-service';

const controller = new OrchestrationController();

// Register DAG
controller.registerDAG(dag);

// Execute immediately
await controller.executeWorkflow(dag, {
  custom_param: 'value',
});

// Or schedule it
controller.scheduler.addSchedule({
  dagId: 'intelligence_pipeline',
  schedule: '0 */6 * * *',
  timezone: 'UTC',
  catchup: true,
});
```

### 3. Monitor Execution

```typescript
// Get execution history
const history = controller.stateManager.getWorkflowHistory('intelligence_pipeline', 10);

// Get active workflows
const active = controller.stateManager.getActiveWorkflows();

// Get metrics
const stats = controller.metricsCollector.getMetricStats('workflow.duration', {
  dag_id: 'intelligence_pipeline',
});

console.log(`Average duration: ${stats.avg}ms`);
console.log(`P95: ${stats.p95}ms`);
```

## Advanced Features

### Conditional Branching

```typescript
dag.addTask({
  taskId: 'check_priority',
  operator: 'branch',
  params: {
    condition: async (context) => {
      const data = await context.getTaskOutput('fetch_data');
      return data.priority === 'critical' ? 'urgent_path' : 'normal_path';
    },
    branches: {
      urgent_path: 'alert_immediately',
      normal_path: 'queue_for_review',
    },
  },
  dependencies: ['fetch_data'],
});
```

### Dynamic DAG Generation

```typescript
function createPipelineDAG(sources: string[]): DAG {
  const dag = new DAG({
    dagId: `multi_source_pipeline`,
    description: 'Dynamic pipeline from multiple sources',
  });

  // Create fetch tasks for each source
  sources.forEach((source, index) => {
    dag.addTask({
      taskId: `fetch_${source}`,
      operator: 'http',
      params: { url: `https://api.${source}.com/data` },
    });
  });

  // Create merge task
  dag.addTask({
    taskId: 'merge_data',
    operator: 'python',
    params: {
      pythonCode: 'merged = merge_sources(...)',
    },
    dependencies: sources.map(s => `fetch_${s}`),
  });

  return dag;
}
```

### Sensors for External Dependencies

```typescript
import { FileSensor, HttpSensor } from '@summit/task-scheduling';

// Wait for file to appear
const fileSensor = new FileSensor('/data/input.json', {
  pokeInterval: 60000, // Check every minute
  timeout: 3600000,    // Timeout after 1 hour
  exponentialBackoff: true,
});

// Wait for API to be available
const httpSensor = new HttpSensor('https://api.example.com/health', {
  expectedStatus: 200,
  pokeInterval: 30000,
  timeout: 600000,
});
```

### Parameter Templating

```typescript
dag.addTask({
  taskId: 'process_date_range',
  operator: 'bash',
  params: {
    command: `
      echo "Processing data for {{ ds }}"
      python process.py --start {{ macros.ds_add(-7) }} --end {{ ds }}
    `,
  },
});
```

### Retry Policies

```typescript
dag.addTask({
  taskId: 'unreliable_task',
  operator: 'http',
  params: { url: 'https://api.example.com/data' },
  retryPolicy: {
    maxRetries: 5,
    retryDelay: 60000,
    exponentialBackoff: true,
    backoffMultiplier: 2,
    maxRetryDelay: 600000,
  },
  timeout: {
    execution: 300000, // 5 minutes
    sla: 600000,       // 10 minutes SLA
  },
});
```

### Trigger Rules

```typescript
dag.addTask({
  taskId: 'cleanup',
  operator: 'bash',
  params: { command: 'rm -rf /tmp/workflow_*' },
  dependencies: ['task1', 'task2', 'task3'],
  triggerRule: 'all_done', // Run regardless of upstream success/failure
});
```

## REST API

### Workflow Management

```bash
# List all workflows
GET /api/workflows

# Get workflow details
GET /api/workflows/:dagId

# Register workflow
POST /api/workflows
Content-Type: application/json
{
  "dagId": "my_workflow",
  "config": { ... },
  "tasks": [ ... ]
}

# Execute workflow
POST /api/workflows/:dagId/execute
Content-Type: application/json
{
  "params": {
    "key": "value"
  }
}

# Get execution history
GET /api/workflows/:dagId/executions?limit=10

# Pause execution
POST /api/workflows/:dagId/executions/:executionId/pause

# Resume execution
POST /api/workflows/:dagId/executions/:executionId/resume

# Cancel execution
POST /api/workflows/:dagId/executions/:executionId/cancel
```

### Schedule Management

```bash
# List schedules
GET /api/schedules

# Add schedule
POST /api/schedules
Content-Type: application/json
{
  "dagId": "my_workflow",
  "schedule": "0 */6 * * *",
  "timezone": "UTC",
  "catchup": false
}

# Pause schedule
POST /api/schedules/:dagId/pause

# Resume schedule
POST /api/schedules/:dagId/resume
```

### Monitoring

```bash
# Get metrics
GET /api/monitoring/metrics?name=workflow.duration

# Get metric statistics
GET /api/monitoring/metrics/workflow.duration/stats

# Get alerts
GET /api/monitoring/alerts?active=true

# Get statistics
GET /api/monitoring/statistics

# Get worker status
GET /api/monitoring/workers
```

## Configuration

### Environment Variables

```bash
# Service configuration
PORT=3000
NODE_ENV=production

# Database (for state persistence)
DATABASE_URL=postgresql://user:pass@localhost/workflows

# Redis (for distributed locks)
REDIS_URL=redis://localhost:6379

# Monitoring
METRICS_ENABLED=true
ALERT_ENABLED=true
```

### Worker Configuration

```typescript
controller.workerPool.registerWorker({
  workerId: 'worker-1',
  concurrency: 5,
  queues: ['default', 'high-priority'],
  resources: {
    cpu: 4,
    memory: 8192,
    gpu: 1,
  },
});
```

## Performance Optimization

### Parallel Execution

The engine automatically identifies tasks that can run in parallel:

```typescript
// These tasks will run in parallel
dag.addTask({ taskId: 'fetch_source_1', operator: 'http', params: {...} });
dag.addTask({ taskId: 'fetch_source_2', operator: 'http', params: {...} });
dag.addTask({ taskId: 'fetch_source_3', operator: 'http', params: {...} });

// This task will wait for all three to complete
dag.addTask({
  taskId: 'merge',
  operator: 'python',
  params: {...},
  dependencies: ['fetch_source_1', 'fetch_source_2', 'fetch_source_3'],
});
```

### Resource Management

```typescript
dag.addTask({
  taskId: 'gpu_intensive_task',
  operator: 'python',
  params: {...},
  resources: {
    cpu: 8,
    memory: 16384,
    gpu: 2,
  },
  pool: 'gpu-pool',
  queue: 'ml-queue',
  priority: 10,
});
```

### Concurrency Control

```typescript
const dag = new DAG({
  dagId: 'my_workflow',
  concurrency: 5, // Max 5 tasks running concurrently
  maxActiveRuns: 2, // Max 2 workflow instances running
});
```

## Security

### Secret Management

```typescript
dag.addTask({
  taskId: 'api_call',
  operator: 'http',
  params: {
    url: 'https://api.example.com/data',
    headers: {
      'Authorization': '{{ var.secret.api_key }}',
    },
  },
});
```

### Authentication

The orchestration service supports authentication:

```typescript
app.use('/api', authenticateMiddleware);
app.use('/api', authorizeMiddleware);
```

## Troubleshooting

### Debug Mode

```typescript
const controller = new OrchestrationController();

controller.executionEngine.on('task:start', (execution) => {
  console.log(`Task ${execution.taskId} started`);
});

controller.executionEngine.on('task:failed', (execution, error) => {
  console.error(`Task ${execution.taskId} failed:`, error);
});
```

### Common Issues

1. **Circular Dependencies**: Use `dag.validate()` to check for cycles
2. **Memory Issues**: Increase worker memory allocation
3. **Timeout Errors**: Adjust task timeout configuration
4. **Schedule Not Triggering**: Verify cron expression and timezone

## Next Steps

- Read [OPERATORS.md](./OPERATORS.md) for detailed operator documentation
- Read [BEST_PRACTICES.md](./BEST_PRACTICES.md) for workflow design patterns
- Check out example workflows in the `/examples` directory
