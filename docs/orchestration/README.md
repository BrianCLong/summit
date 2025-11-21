# Workflow Orchestration Platform

A comprehensive, enterprise-grade workflow orchestration and task scheduling platform for intelligence operations.

## Packages

### @summit/dag-engine
Core DAG (Directed Acyclic Graph) engine for workflow definitions.

```typescript
import { DAG, ExecutionEngine } from '@summit/dag-engine';

const dag = new DAG({
  dagId: 'data-pipeline',
  description: 'Daily data processing pipeline',
  defaultArgs: { retries: 3 },
});

dag.addTask({
  taskId: 'extract',
  execute: async (ctx) => {
    // Extract data from source
    return { records: 1000 };
  },
});

dag.addTask({
  taskId: 'transform',
  execute: async (ctx) => {
    // Transform the data
    return { transformed: true };
  },
});

dag.addTask({
  taskId: 'load',
  execute: async (ctx) => {
    // Load into destination
    return { loaded: true };
  },
});

// Set dependencies: extract -> transform -> load
dag.setDependency('extract', 'transform');
dag.setDependency('transform', 'load');

// Execute the workflow
const engine = new ExecutionEngine({ concurrency: 4 });
const result = await engine.execute(dag);
```

### @summit/task-scheduling
Cron-based scheduling and trigger management.

```typescript
import { CronScheduler, TriggerManager } from '@summit/task-scheduling';

const scheduler = new CronScheduler();

// Schedule a workflow to run daily at 9 AM
scheduler.addSchedule({
  dagId: 'daily-report',
  schedule: '0 9 * * *',
  timezone: 'America/New_York',
  catchup: false,
});

scheduler.on('schedule:trigger', (execution) => {
  console.log(`Triggered: ${execution.dagId} at ${execution.scheduledTime}`);
});

scheduler.start();
```

### @summit/workflow-orchestration
State management, worker pools, and templating.

```typescript
import { StateManager, WorkerPool, TemplateEngine } from '@summit/workflow-orchestration';

// State management
const stateManager = new StateManager();
stateManager.storeWorkflowExecution({
  executionId: 'exec-123',
  dagId: 'my-workflow',
  state: 'running',
  startTime: new Date(),
  params: {},
});

// Worker pool for distributed execution
const pool = new WorkerPool({ minWorkers: 2, maxWorkers: 10 });
await pool.start();

// Template engine for parameter substitution
const template = new TemplateEngine();
const result = template.render('Hello {{ name }}!', { name: 'World' });
```

### @summit/workflow-operators
Pre-built operators for common tasks.

```typescript
import {
  BashOperator,
  PythonOperator,
  HttpOperator,
  EmailOperator,
} from '@summit/workflow-operators';

// Execute shell commands
const bash = new BashOperator({
  command: 'echo "Hello from bash"',
  env: { MY_VAR: 'value' },
});

// Run Python scripts
const python = new PythonOperator({
  pythonCallable: 'process_data',
  pythonFile: '/path/to/script.py',
});

// Make HTTP requests
const http = new HttpOperator({
  method: 'POST',
  url: 'https://api.example.com/data',
  headers: { 'Content-Type': 'application/json' },
});

// Send emails
const email = new EmailOperator({
  to: ['team@example.com'],
  subject: 'Workflow Complete',
  body: 'The daily pipeline has finished.',
});
```

### @summit/workflow-monitoring
Metrics collection and alerting.

```typescript
import { MetricsCollector, AlertManager } from '@summit/workflow-monitoring';

const metrics = new MetricsCollector();

// Record workflow metrics
metrics.recordWorkflowStart('my-workflow', 'exec-123');
metrics.recordTaskDuration('my-workflow', 'task-1', 1500);
metrics.recordWorkflowEnd('my-workflow', 'exec-123', 'success');

// Get statistics
const stats = metrics.getWorkflowStats('my-workflow');
console.log(`Success rate: ${stats.successRate}%`);

// Alerting
const alerts = new AlertManager();
alerts.addRule({
  name: 'high-failure-rate',
  condition: (metrics) => metrics.failureRate > 0.1,
  severity: 'critical',
  channels: ['slack', 'email'],
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Service                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  REST API   │  │  Scheduler  │  │  Workflow Engine    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  DAG Engine   │   │ Task Scheduling │   │   Monitoring    │
│  - Graph ops  │   │ - Cron parsing  │   │ - Metrics       │
│  - Execution  │   │ - Triggers      │   │ - Alerts        │
│  - Validation │   │ - Sensors       │   │ - Dashboards    │
└───────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  State Manager  │
                    │  - Persistence  │
                    │  - Snapshots    │
                    │  - Recovery     │
                    └─────────────────┘
```

## Features

- **DAG-based workflows**: Define complex task dependencies with automatic cycle detection
- **Cron scheduling**: Standard cron expressions with timezone support
- **Event-driven triggers**: File sensors, HTTP webhooks, custom conditions
- **Distributed execution**: Worker pools with load balancing
- **Retry policies**: Exponential backoff, circuit breakers
- **State management**: Checkpoints, snapshots, crash recovery
- **Templating**: Jinja-like variable substitution
- **Monitoring**: Metrics, alerts, dashboards
- **Operators**: Bash, Python, HTTP, Email, Transfer, Branch

## License

MIT
