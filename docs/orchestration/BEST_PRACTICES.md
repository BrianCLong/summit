# Workflow Orchestration Best Practices

## Workflow Design Principles

### 1. Single Responsibility

Each task should do one thing well.

```typescript
// Bad - task does too much
dag.addTask({
  taskId: 'process_everything',
  operator: 'bash',
  params: {
    command: 'fetch_data.sh && process_data.sh && send_results.sh',
  },
});

// Good - separate concerns
dag.addTask({ taskId: 'fetch_data', operator: 'bash', params: { command: 'fetch_data.sh' } });
dag.addTask({ taskId: 'process_data', operator: 'bash', params: { command: 'process_data.sh' }, dependencies: ['fetch_data'] });
dag.addTask({ taskId: 'send_results', operator: 'bash', params: { command: 'send_results.sh' }, dependencies: ['process_data'] });
```

### 2. Idempotency

Tasks should produce the same result when run multiple times.

```typescript
// Bad - appends to file
dag.addTask({
  taskId: 'log_results',
  operator: 'bash',
  params: {
    command: 'echo "Result: $(date)" >> results.log',
  },
});

// Good - overwrites or uses unique identifiers
dag.addTask({
  taskId: 'log_results',
  operator: 'bash',
  params: {
    command: 'echo "Result: $(date)" > results_{{ execution_date }}.log',
  },
});
```

### 3. Clear Dependencies

Make task dependencies explicit and minimal.

```typescript
// Bad - unclear dependencies
dag.addTask({ taskId: 'task1', operator: 'dummy' });
dag.addTask({ taskId: 'task2', operator: 'dummy' });
dag.addTask({ taskId: 'task3', operator: 'dummy', dependencies: ['task1', 'task2'] });
dag.addTask({ taskId: 'task4', operator: 'dummy', dependencies: ['task1', 'task2', 'task3'] });

// Good - minimal dependencies
dag.addTask({ taskId: 'task1', operator: 'dummy' });
dag.addTask({ taskId: 'task2', operator: 'dummy' });
dag.addTask({ taskId: 'task3', operator: 'dummy', dependencies: ['task1', 'task2'] });
dag.addTask({ taskId: 'task4', operator: 'dummy', dependencies: ['task3'] });
```

## Error Handling

### 1. Appropriate Retry Policies

Configure retries based on failure mode.

```typescript
// Transient failures - retry aggressively
dag.addTask({
  taskId: 'api_call',
  operator: 'http',
  params: { url: 'https://api.example.com/data' },
  retryPolicy: {
    maxRetries: 5,
    retryDelay: 30000,
    exponentialBackoff: true,
    backoffMultiplier: 2,
  },
});

// Data processing - retry cautiously
dag.addTask({
  taskId: 'process_data',
  operator: 'python',
  params: { pythonCode: '...' },
  retryPolicy: {
    maxRetries: 1,
    retryDelay: 60000,
  },
});

// Idempotent operations - no retry
dag.addTask({
  taskId: 'send_notification',
  operator: 'email',
  params: { to: '...', subject: '...', body: '...' },
  retryPolicy: {
    maxRetries: 0,
  },
});
```

### 2. Trigger Rules for Error Handling

Use trigger rules to handle failures gracefully.

```typescript
// Cleanup task that always runs
dag.addTask({
  taskId: 'cleanup',
  operator: 'bash',
  params: { command: 'rm -rf /tmp/workflow_*' },
  dependencies: ['process_data'],
  triggerRule: 'all_done',
});

// Alert on failure
dag.addTask({
  taskId: 'failure_alert',
  operator: 'email',
  params: {
    to: 'ops@example.com',
    subject: 'Workflow Failed',
    body: 'The workflow has failed. Please investigate.',
  },
  dependencies: ['critical_task'],
  triggerRule: 'one_failed',
});

// Success notification
dag.addTask({
  taskId: 'success_notification',
  operator: 'email',
  params: {
    to: 'team@example.com',
    subject: 'Workflow Completed',
    body: 'The workflow completed successfully.',
  },
  dependencies: ['final_task'],
  triggerRule: 'all_success',
});
```

### 3. Circuit Breaker Pattern

Prevent cascading failures.

```typescript
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;

dag.addTask({
  taskId: 'check_service',
  operator: 'http',
  params: {
    url: 'https://api.example.com/health',
  },
});

dag.addTask({
  taskId: 'call_service',
  operator: 'branch',
  params: {
    condition: async (context) => {
      if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        return 'circuit_open';
      }

      try {
        const health = await context.getTaskOutput('check_service');
        if (health.status === 'healthy') {
          consecutiveFailures = 0;
          return 'proceed';
        }
      } catch {
        consecutiveFailures++;
      }

      return 'circuit_open';
    },
    branches: {
      proceed: 'make_api_call',
      circuit_open: 'use_fallback',
    },
  },
  dependencies: ['check_service'],
});
```

## Performance Optimization

### 1. Maximize Parallelism

Design workflows to maximize parallel execution.

```typescript
// Bad - sequential execution
dag.addTask({ taskId: 'task1', operator: 'http', params: { url: 'api1' } });
dag.addTask({ taskId: 'task2', operator: 'http', params: { url: 'api2' }, dependencies: ['task1'] });
dag.addTask({ taskId: 'task3', operator: 'http', params: { url: 'api3' }, dependencies: ['task2'] });

// Good - parallel execution
dag.addTask({ taskId: 'task1', operator: 'http', params: { url: 'api1' } });
dag.addTask({ taskId: 'task2', operator: 'http', params: { url: 'api2' } });
dag.addTask({ taskId: 'task3', operator: 'http', params: { url: 'api3' } });
dag.addTask({
  taskId: 'merge',
  operator: 'python',
  params: { pythonCode: 'merge_results(...)' },
  dependencies: ['task1', 'task2', 'task3'],
});
```

### 2. Resource Allocation

Allocate resources appropriately.

```typescript
// Lightweight task
dag.addTask({
  taskId: 'log_start',
  operator: 'bash',
  params: { command: 'echo "Starting workflow"' },
  resources: {
    cpu: 0.1,
    memory: 128,
  },
  queue: 'default',
});

// Heavy computation
dag.addTask({
  taskId: 'ml_training',
  operator: 'python',
  params: { pythonCode: 'train_model(...)' },
  resources: {
    cpu: 16,
    memory: 32768,
    gpu: 4,
  },
  queue: 'ml-queue',
  priority: 10,
});
```

### 3. Concurrency Limits

Control workflow concurrency to prevent resource exhaustion.

```typescript
const dag = new DAG({
  dagId: 'resource_intensive_workflow',
  concurrency: 5,           // Max 5 tasks running concurrently
  maxActiveRuns: 1,         // Only one instance at a time
  schedule: '0 * * * *',    // Runs hourly
});
```

## Data Management

### 1. Minimize Data Transfer

Transfer only necessary data between tasks.

```typescript
// Bad - transfers large dataset
dag.addTask({
  taskId: 'filter_data',
  operator: 'transfer',
  params: {
    sourceTask: 'fetch_data',
  },
});

// Good - transfers metadata only
dag.addTask({
  taskId: 'process_data',
  operator: 'python',
  params: {
    pythonCode: `
import json

# Get file path instead of full data
metadata = json.loads('{{ ti.xcom_pull(task_ids="fetch_data") }}')
file_path = metadata['file_path']

# Process file directly
with open(file_path, 'r') as f:
    process(f)
    `,
  },
});
```

### 2. Data Validation

Validate data at workflow boundaries.

```typescript
dag.addTask({
  taskId: 'validate_input',
  operator: 'python',
  params: {
    pythonCode: `
import json
from jsonschema import validate

data = json.loads('{{ ti.xcom_pull(task_ids="fetch_data") }}')

schema = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
        "timestamp": {"type": "string", "format": "date-time"}
    },
    "required": ["id", "priority", "timestamp"]
}

validate(instance=data, schema=schema)
print("Validation successful")
    `,
  },
  dependencies: ['fetch_data'],
});
```

### 3. Data Lineage

Track data transformations.

```typescript
dag.addTask({
  taskId: 'transform_data',
  operator: 'python',
  params: {
    pythonCode: `
import json

data = json.loads('{{ ti.xcom_pull(task_ids="fetch_data") }}')

# Transform and track lineage
result = {
    "data": transform(data),
    "lineage": {
        "source": "{{ ti.xcom_pull(task_ids='fetch_data').source }}",
        "transformations": ["normalize", "deduplicate", "enrich"],
        "timestamp": "{{ ds }}",
        "task_id": "{{ task_id }}"
    }
}

print(json.dumps(result))
    `,
  },
});
```

## Security Best Practices

### 1. Secret Management

Never hardcode secrets.

```typescript
// Bad - hardcoded secret
dag.addTask({
  taskId: 'api_call',
  operator: 'http',
  params: {
    headers: {
      'Authorization': 'Bearer sk-1234567890abcdef',
    },
  },
});

// Good - use variables
dag.addTask({
  taskId: 'api_call',
  operator: 'http',
  params: {
    headers: {
      'Authorization': 'Bearer {{ var.secret.api_token }}',
    },
  },
});
```

### 2. Input Sanitization

Sanitize external inputs.

```typescript
dag.addTask({
  taskId: 'process_user_input',
  operator: 'python',
  params: {
    pythonCode: `
import html
import re

# Get user input
user_input = '{{ params.user_query }}'

# Sanitize
sanitized = html.escape(user_input)
sanitized = re.sub(r'[^a-zA-Z0-9\s]', '', sanitized)

# Process
result = process_query(sanitized)
print(result)
    `,
  },
});
```

### 3. Least Privilege

Run tasks with minimal required permissions.

```typescript
dag.addTask({
  taskId: 'read_data',
  operator: 'bash',
  params: {
    command: 'cat /data/input.txt',
    // Run as read-only user
  },
  metadata: {
    runAsUser: 'readonly-user',
  },
});
```

## Monitoring and Observability

### 1. Structured Logging

Use structured logs for better debugging.

```typescript
dag.addTask({
  taskId: 'process_data',
  operator: 'python',
  params: {
    pythonCode: `
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Structured logging
logger.info(json.dumps({
    "event": "processing_start",
    "task_id": "{{ task_id }}",
    "execution_id": "{{ execution_id }}",
    "record_count": 1000,
    "timestamp": "{{ ds }}"
}))

# Process data
result = process()

logger.info(json.dumps({
    "event": "processing_complete",
    "task_id": "{{ task_id }}",
    "duration_ms": 5000,
    "output_records": result.count
}))
    `,
  },
});
```

### 2. Metrics Collection

Emit custom metrics for monitoring.

```typescript
dag.addTask({
  taskId: 'analyze_threats',
  operator: 'python',
  params: {
    pythonCode: `
import json

# Analyze threats
threats = analyze_data()

# Emit metrics
metrics = {
    "total_threats": len(threats),
    "critical_threats": len([t for t in threats if t['severity'] == 'critical']),
    "avg_confidence": sum(t['confidence'] for t in threats) / len(threats)
}

# These will be captured by the metrics collector
print(json.dumps(metrics))
    `,
  },
});
```

### 3. SLA Monitoring

Set SLAs for critical tasks.

```typescript
dag.addTask({
  taskId: 'critical_analysis',
  operator: 'python',
  params: { pythonCode: '...' },
  timeout: {
    execution: 600000,  // 10 minutes execution timeout
    sla: 900000,        // 15 minutes SLA
  },
});

// Alert on SLA breach
controller.alertManager.addRule({
  id: 'sla_breach',
  name: 'SLA Breach Alert',
  condition: (context) => {
    const execution = context.taskExecution;
    return execution.duration! > execution.timeout!.sla!;
  },
  severity: 'critical',
  message: 'Task exceeded SLA',
  cooldown: 300000, // 5 minutes
});
```

## Testing Workflows

### 1. Unit Testing Tasks

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DAG } from '@summit/dag-engine';

describe('IntelligencePipeline', () => {
  let dag: DAG;

  beforeEach(() => {
    dag = new DAG({
      dagId: 'test_pipeline',
      description: 'Test pipeline',
    });
  });

  it('should validate DAG structure', () => {
    dag.addTask({ taskId: 'task1', operator: 'dummy' });
    dag.addTask({ taskId: 'task2', operator: 'dummy', dependencies: ['task1'] });

    const validation = dag.validate();
    expect(validation.valid).toBe(true);
  });

  it('should detect circular dependencies', () => {
    dag.addTask({ taskId: 'task1', operator: 'dummy' });
    dag.addTask({ taskId: 'task2', operator: 'dummy', dependencies: ['task1'] });

    expect(() => {
      dag.setDependencies('task1', ['task2']);
    }).toThrow();
  });
});
```

### 2. Integration Testing

```typescript
describe('Workflow Execution', () => {
  it('should execute workflow end-to-end', async () => {
    const controller = new OrchestrationController();

    const dag = new DAG({ dagId: 'test_workflow' });
    dag.addTask({ taskId: 'start', operator: 'dummy' });
    dag.addTask({ taskId: 'end', operator: 'dummy', dependencies: ['start'] });

    controller.registerDAG(dag);

    const execution = await controller.executeWorkflow(dag);

    expect(execution.state).toBe('success');
  });
});
```

### 3. Dry Run Testing

```typescript
// Test workflow without executing
const dag = DAG.fromJSON(workflowDefinition);
const validation = dag.validate();

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
}

console.log('Workflow is valid');
console.log('Execution order:', dag.getTopologicalOrder());
console.log('Root tasks:', dag.getRootTasks());
console.log('Leaf tasks:', dag.getLeafTasks());
```

## Deployment Best Practices

### 1. Version Control

Store workflow definitions in version control.

```typescript
// workflows/intelligence_pipeline_v1.ts
export const intelligencePipeline = {
  dagId: 'intelligence_pipeline',
  version: '1.0.0',
  config: { ... },
  tasks: [ ... ],
};
```

### 2. Environment Configuration

Use environment-specific configurations.

```typescript
const config = {
  development: {
    schedule: null, // Manual trigger in dev
    concurrency: 2,
    maxActiveRuns: 1,
  },
  production: {
    schedule: '0 */6 * * *',
    concurrency: 10,
    maxActiveRuns: 3,
  },
};

const dag = new DAG({
  ...baseConfig,
  ...config[process.env.NODE_ENV],
});
```

### 3. Gradual Rollout

Test new workflows in stages.

```typescript
// Phase 1: Canary deployment
if (Math.random() < 0.1) {
  // 10% of workflows use new version
  useNewWorkflow();
} else {
  useOldWorkflow();
}

// Phase 2: Parallel run
Promise.all([
  runOldWorkflow(),
  runNewWorkflow(),
]).then(([oldResult, newResult]) => {
  compareResults(oldResult, newResult);
});

// Phase 3: Full rollout
useNewWorkflow();
```
