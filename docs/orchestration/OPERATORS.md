# Workflow Operators Reference

## Overview

Operators are the building blocks of workflows. Each operator encapsulates a specific type of task, such as executing a shell command, making an HTTP request, or running Python code.

## Built-in Operators

### BashOperator

Execute shell commands.

```typescript
import { BashOperator } from '@summit/workflow-operators';

dag.addTask({
  taskId: 'run_script',
  operator: 'bash',
  params: {
    command: 'bash /scripts/process_data.sh',
    env: {
      DATA_DIR: '/data',
      OUTPUT_DIR: '/output',
    },
    cwd: '/workspace',
    timeout: 300000, // 5 minutes
    shell: '/bin/bash',
  },
});
```

**Parameters:**
- `command` (required): Shell command to execute
- `env`: Environment variables
- `cwd`: Working directory
- `timeout`: Execution timeout in milliseconds
- `shell`: Shell to use (default: '/bin/sh')

**Output:**
```json
{
  "stdout": "command output",
  "stderr": "error output",
  "exitCode": 0
}
```

### PythonOperator

Execute Python code or scripts.

```typescript
dag.addTask({
  taskId: 'analyze_data',
  operator: 'python',
  params: {
    pythonCode: `
import pandas as pd
import json

# Load data
data = json.loads('{{ ti.xcom_pull(task_ids="fetch_data") }}')
df = pd.DataFrame(data)

# Analyze
result = {
    'total': len(df),
    'high_priority': len(df[df['priority'] == 'high']),
    'avg_score': df['score'].mean()
}

print(json.dumps(result))
    `,
    pythonBinary: 'python3',
    timeout: 600000,
  },
});
```

**Parameters:**
- `pythonCode`: Python code to execute (inline)
- `scriptPath`: Path to Python script file
- `pythonBinary`: Python interpreter (default: 'python3')
- `env`: Environment variables
- `timeout`: Execution timeout

**Note:** Either `pythonCode` or `scriptPath` must be provided.

### HttpOperator

Make HTTP requests.

```typescript
dag.addTask({
  taskId: 'api_call',
  operator: 'http',
  params: {
    url: 'https://api.example.com/intelligence',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{ var.secret.api_token }}',
    },
    data: {
      query: 'threat_actors',
      filters: {
        region: 'APAC',
        severity: 'high',
      },
    },
    timeout: 30000,
    validateStatus: (status) => status >= 200 && status < 300,
  },
});
```

**Parameters:**
- `url` (required): Request URL
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `headers`: Request headers
- `data`: Request body
- `params`: URL query parameters
- `timeout`: Request timeout
- `auth`: Basic authentication (`{ username, password }`)
- `validateStatus`: Function to validate HTTP status code

**Output:**
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": { ... },
  "data": { ... }
}
```

### EmailOperator

Send email notifications.

```typescript
dag.addTask({
  taskId: 'send_report',
  operator: 'email',
  params: {
    to: ['analyst1@example.com', 'analyst2@example.com'],
    subject: 'Daily Intelligence Report - {{ ds }}',
    body: `
Intelligence Summary for {{ ds }}:

Total Threats: {{ ti.xcom_pull(task_ids="analyze_data").total }}
High Priority: {{ ti.xcom_pull(task_ids="analyze_data").high_priority }}

Please review the attached report.
    `,
    cc: ['manager@example.com'],
    html: false,
    attachments: [
      {
        filename: 'report.pdf',
        path: '/reports/daily_report.pdf',
      },
    ],
  },
});
```

**Parameters:**
- `to` (required): Recipient email address(es)
- `subject` (required): Email subject
- `body` (required): Email body
- `cc`: CC recipients
- `bcc`: BCC recipients
- `from`: Sender email address
- `html`: Whether body is HTML (default: false)
- `attachments`: File attachments

### TransferOperator

Transfer data between tasks.

```typescript
dag.addTask({
  taskId: 'prepare_data',
  operator: 'transfer',
  params: {
    sourceTask: 'fetch_raw_data',
    transform: (data) => {
      // Transform data before passing to next task
      return {
        ...data,
        processed: true,
        timestamp: new Date(),
      };
    },
  },
  dependencies: ['fetch_raw_data'],
});
```

**Parameters:**
- `sourceTask` (required): Task ID to get data from
- `transform`: Optional transformation function

### BranchOperator

Implement conditional workflow logic.

```typescript
dag.addTask({
  taskId: 'route_by_priority',
  operator: 'branch',
  params: {
    condition: async (context) => {
      const data = await context.getTaskOutput('classify_threat');

      if (data.priority === 'critical') {
        return 'immediate_response';
      } else if (data.priority === 'high') {
        return 'urgent_queue';
      } else {
        return 'normal_queue';
      }
    },
    branches: {
      immediate_response: 'alert_soc',
      urgent_queue: 'queue_for_analyst',
      normal_queue: 'batch_process',
    },
  },
  dependencies: ['classify_threat'],
});
```

**Parameters:**
- `condition` (required): Function returning branch name
- `branches` (required): Map of branch names to task IDs

### DummyOperator

Placeholder task (useful for grouping or testing).

```typescript
dag.addTask({
  taskId: 'start',
  operator: 'dummy',
});

dag.addTask({
  taskId: 'end',
  operator: 'dummy',
  dependencies: ['task1', 'task2', 'task3'],
});
```

## Creating Custom Operators

### Basic Custom Operator

```typescript
import { Operator, ExecutionContext } from '@summit/dag-engine';

export class DatabaseOperator implements Operator {
  private connectionString: string;
  private query: string;

  constructor(config: { connectionString: string; query: string }) {
    this.connectionString = config.connectionString;
    this.query = config.query;
  }

  async execute(context: ExecutionContext): Promise<any> {
    // Connect to database
    const db = await connectToDatabase(this.connectionString);

    try {
      // Execute query
      const result = await db.query(this.query);
      return result.rows;
    } finally {
      await db.close();
    }
  }

  async onSuccess(context: ExecutionContext, output: any): Promise<void> {
    console.log(`Query returned ${output.length} rows`);
  }

  async onFailure(context: ExecutionContext, error: Error): Promise<void> {
    console.error(`Database query failed: ${error.message}`);
  }
}
```

### Register Custom Operator

```typescript
const dbOperator = new DatabaseOperator({
  connectionString: 'postgresql://localhost/intel',
  query: 'SELECT * FROM threats WHERE created_at > NOW() - INTERVAL \'1 day\'',
});

controller.executionEngine.registerOperator('database', dbOperator);

// Use in DAG
dag.addTask({
  taskId: 'fetch_threats',
  operator: 'database',
  params: {
    connectionString: 'postgresql://localhost/intel',
    query: 'SELECT * FROM threats WHERE severity = \'high\'',
  },
});
```

### Advanced Custom Operator with Retry Logic

```typescript
export class RetryableHttpOperator implements Operator {
  private config: HttpConfig;

  async execute(context: ExecutionContext): Promise<any> {
    // Operator execution
    const response = await fetch(this.config.url);
    return response.json();
  }

  async onRetry(context: ExecutionContext, error: Error, attempt: number): Promise<void> {
    console.log(`Retry attempt ${attempt} for ${context.taskId}`);

    // Adjust configuration based on retry
    if (attempt > 2) {
      // Use fallback endpoint
      this.config.url = this.config.fallbackUrl;
    }
  }
}
```

## Sensors

Sensors are special operators that wait for a condition to be met.

### FileSensor

Wait for a file to exist.

```typescript
import { FileSensor } from '@summit/task-scheduling';

const sensor = new FileSensor('/data/input/daily_report.csv', {
  pokeInterval: 60000,        // Check every minute
  timeout: 3600000,           // Timeout after 1 hour
  exponentialBackoff: true,   // Increase interval on each check
  softFail: false,            // Fail hard if timeout
});

controller.executionEngine.registerOperator('file_sensor', sensor);

dag.addTask({
  taskId: 'wait_for_data',
  operator: 'file_sensor',
  params: {
    filePath: '/data/input/daily_report.csv',
  },
});
```

### HttpSensor

Wait for HTTP endpoint to be available.

```typescript
import { HttpSensor } from '@summit/task-scheduling';

const sensor = new HttpSensor('https://api.example.com/health', {
  method: 'GET',
  expectedStatus: 200,
  pokeInterval: 30000,
  timeout: 600000,
});

dag.addTask({
  taskId: 'wait_for_api',
  operator: 'http_sensor',
  params: {
    url: 'https://api.example.com/health',
  },
});
```

### TimeSensor

Wait until a specific time.

```typescript
import { TimeSensor } from '@summit/task-scheduling';

const sensor = new TimeSensor(new Date('2025-01-01T00:00:00Z'), {
  pokeInterval: 60000,
});

dag.addTask({
  taskId: 'wait_for_midnight',
  operator: 'time_sensor',
});
```

### Custom Sensor

```typescript
import { BaseSensor, ExecutionContext } from '@summit/task-scheduling';

export class ApiReadySensor extends BaseSensor {
  private apiUrl: string;

  constructor(apiUrl: string, config?: SensorConfig) {
    super(config);
    this.apiUrl = apiUrl;
  }

  async poke(context: ExecutionContext): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/status`);
      const data = await response.json();
      return data.ready === true;
    } catch {
      return false;
    }
  }
}
```

## Operator Hooks

Hooks allow you to execute code at specific points in the workflow lifecycle.

```typescript
import { Hook, ExecutionContext, TaskState } from '@summit/dag-engine';

class NotificationHook implements Hook {
  async beforeDAGRun(dagId: string, executionId: string): Promise<void> {
    console.log(`Starting workflow ${dagId}`);
    await sendSlackMessage(`Workflow ${dagId} started`);
  }

  async afterDAGRun(dagId: string, executionId: string, state: TaskState): Promise<void> {
    console.log(`Workflow ${dagId} completed with state: ${state}`);

    if (state === 'failed') {
      await sendPagerDutyAlert(`Workflow ${dagId} failed`);
    }
  }

  async beforeTaskRun(context: ExecutionContext): Promise<void> {
    console.log(`Starting task ${context.taskId}`);
  }

  async afterTaskRun(context: ExecutionContext, state: TaskState): Promise<void> {
    console.log(`Task ${context.taskId} completed: ${state}`);
  }
}

// Register hook
const hook = new NotificationHook();
// Note: Hook registration would be added to the controller
```

## Best Practices

### 1. Idempotent Operations

Ensure operators can be safely retried:

```typescript
// Bad - not idempotent
dag.addTask({
  taskId: 'process_data',
  operator: 'bash',
  params: {
    command: 'cat input.txt >> output.txt',
  },
});

// Good - idempotent
dag.addTask({
  taskId: 'process_data',
  operator: 'bash',
  params: {
    command: 'cat input.txt > output.txt',
  },
});
```

### 2. Resource Cleanup

Always clean up resources in finally blocks:

```typescript
async execute(context: ExecutionContext): Promise<any> {
  const connection = await openConnection();

  try {
    return await connection.query();
  } finally {
    await connection.close();
  }
}
```

### 3. Error Handling

Provide meaningful error messages:

```typescript
async execute(context: ExecutionContext): Promise<any> {
  try {
    return await performOperation();
  } catch (error) {
    throw new Error(
      `Failed to perform operation for task ${context.taskId}: ${error.message}`
    );
  }
}
```

### 4. Output Formatting

Return structured, serializable data:

```typescript
async execute(context: ExecutionContext): Promise<any> {
  const results = await fetchData();

  return {
    success: true,
    recordCount: results.length,
    timestamp: new Date().toISOString(),
    data: results,
  };
}
```

## Operator Testing

```typescript
import { describe, it, expect } from 'vitest';
import { BashOperator } from '@summit/workflow-operators';

describe('BashOperator', () => {
  it('should execute command successfully', async () => {
    const operator = new BashOperator({ command: 'echo "Hello World"' });

    const context = {
      executionId: 'test-123',
      dagId: 'test-dag',
      taskId: 'test-task',
      executionDate: new Date(),
      params: {},
      attempt: 1,
      variables: {},
      getTaskOutput: async () => undefined,
      setVariable: () => {},
      getVariable: () => undefined,
    };

    const result = await operator.execute(context);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Hello World');
  });
});
```
