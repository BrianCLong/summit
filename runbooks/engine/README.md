# Runbook Orchestration Engine

Production-ready DAG-based workflow orchestration engine for IntelGraph. Executes runbooks as directed acyclic graphs with typed inputs/outputs, human-in-the-loop approvals, conditional branching, and comprehensive audit logging.

## Features

### Core Capabilities
- **DAG Execution**: Execute workflows as directed acyclic graphs with automatic dependency resolution
- **Retry Logic**: Configurable retry policies with exponential backoff
- **State Management**: Persistent state tracking with support for memory and database backends
- **Idempotency**: Automatic duplicate detection to prevent redundant executions
- **Replay**: Re-run completed executions for debugging and verification

### Advanced Features
- **Human Approvals**: Multi-approver workflows with timeout handling
- **Conditional Branching**: If/else logic based on runtime data
- **Loops**: Safe iterative execution with hard limits (max 1000 iterations)
- **Service Integration**: HTTP/gRPC calls with idempotency keys
- **Event-Driven**: Wait for external events with correlation
- **Execution Control**: Pause, resume, cancel running workflows
- **Step Retry**: Re-run individual failed steps

### Enterprise Grade
- **Structured Logging**: Comprehensive logging with assumptions, data scope, and legal basis tracking
- **Evidence Collection**: Automatic evidence collection and linking for audit trails
- **Authorization**: Integration with authz services for step-level permissions
- **Safety Limits**: Max depth, max iterations, timeouts, circuit breakers
- **REST API**: Full REST API for managing templates and executions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Runbook Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │  REST API    │───▶│  Engine Core │───▶│ DAG Executor│  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
│                              │                    │        │
│                              ▼                    ▼        │
│                      ┌──────────────┐    ┌─────────────┐  │
│                      │State Manager │    │  Executors  │  │
│                      └──────────────┘    └─────────────┘  │
│                              │                             │
│                              ▼                             │
│                      ┌──────────────┐                      │
│                      │   Storage    │                      │
│                      └──────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd runbooks/engine
npm install
npm run build
```

## Usage

### Basic Example

```typescript
import { RunbookEngine, RunbookDefinition } from '@intelgraph/runbook-engine';

// 1. Create engine
const engine = new RunbookEngine({
  maxConcurrentSteps: 5,
  defaultRetryPolicy: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  storageBackend: 'memory',
  detailedLogging: true,
});

// 2. Register standard executors (included)
// CallServiceExecutor, HumanApprovalExecutor, etc. are registered automatically

// 3. Register runbook
const runbook: RunbookDefinition = {
  id: 'my-runbook',
  name: 'My Runbook',
  version: '1.0.0',
  description: 'Example runbook with approval',
  steps: [
    {
      id: 'call-api',
      name: 'Call External API',
      type: 'call-service',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        url: 'https://api.example.com/process',
        method: 'POST',
        idempotencyKey: 'unique-key',
      },
      retryPolicy: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
    },
    {
      id: 'require-approval',
      name: 'Require Manager Approval',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: ['call-api'],
      config: {},
      retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 },
      approvalConfig: {
        approvers: ['manager1', 'manager2'],
        minApprovals: 1,
        timeoutMs: 3600000, // 1 hour
        timeoutAction: 'fail',
        prompt: 'Approve this action?',
      },
    },
  ],
  defaultRetryPolicy: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
};

engine.registerRunbook(runbook);

// 4. Execute runbook
const executionId = await engine.startRunbook(
  'my-runbook',
  {
    legalBasis: {
      authority: 'INVESTIGATION',
      classification: 'SENSITIVE',
      authorizedUsers: ['analyst-1', 'manager1', 'manager2'],
    },
    tenantId: 'my-tenant',
    initiatedBy: 'analyst-1',
    assumptions: ['Data is current'],
  },
  { inputData: 'value' }
);

// 5. Check status
const execution = await engine.getStatus(executionId);
console.log(execution.status);

// 6. Pause/resume if needed
await engine.pauseExecution(executionId, 'analyst-1');
await engine.resumeExecution(executionId, 'analyst-1');

// 7. Get logs and evidence
const logs = await engine.getLogs({ executionId });
const evidence = await engine.getEvidence(executionId);
```

### Standard Step Executors

The engine includes built-in executors for common patterns:

#### Call Service (HTTP/gRPC)
```typescript
{
  id: 'call-api',
  type: 'call-service',
  config: {
    url: 'https://api.example.com/process',
    method: 'POST',
    headers: { 'X-API-Key': 'secret' },
    idempotencyKey: 'unique-key-123',
  }
}
```

#### Human Approval
```typescript
{
  id: 'require-approval',
  type: 'human-approval',
  approvalConfig: {
    approvers: ['manager1', 'manager2'],
    minApprovals: 2,
    timeoutMs: 3600000, // 1 hour
    timeoutAction: 'fail',
    prompt: 'Approve deployment to production?',
  }
}
```

#### Conditional Branching
```typescript
{
  id: 'check-status',
  type: 'conditional',
  config: {
    condition: {
      field: 'result.status',
      operator: 'eq',
      value: 'success',
    },
    trueBranch: 'deploy-step',
    falseBranch: 'rollback-step',
  }
}
```

#### Loop Iteration
```typescript
{
  id: 'process-items',
  type: 'loop',
  config: {
    bodyStepId: 'process-single-item',
  },
  loopConfig: {
    maxIterations: 100,
    iterateOver: 'items', // Array field
  }
}
```

#### Wait for Event
```typescript
{
  id: 'wait-webhook',
  type: 'wait-for-event',
  config: {
    eventType: 'webhook.received',
    correlationId: 'order-123',
    timeoutMs: 300000, // 5 minutes
  }
}
```

### Implementing a Custom Executor

```typescript
import { StepExecutor, StepDefinition, StepIO, ExecutionContext, StepResult, ExecutionStatus } from '@intelgraph/runbook-engine';
import { v4 as uuidv4 } from 'uuid';

export class MyCustomExecutor implements StepExecutor {
  readonly type = 'custom:my-step';

  validate(step: StepDefinition): boolean {
    const { requiredParam } = step.config;
    if (!requiredParam) {
      throw new Error(`Missing required config: requiredParam`);
    }
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];

    try {
      // Your logic here
      const output = { result: 'success' };

      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info' as const,
        stepId: step.id,
        executionId: context.tenantId,
        message: 'Step completed successfully',
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.COMPLETED,
        output: { schema: {}, data: output },
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: ExecutionStatus.FAILED,
        error: error as Error,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    }
  }
}
```

## REST API

### Runbook Templates

#### List all runbooks
```http
GET /api/v1/runbooks
```

#### Get specific runbook
```http
GET /api/v1/runbooks/{runbookId}
```

### Executions

#### Start execution
```http
POST /api/v1/executions
Content-Type: application/json

{
  "runbookId": "my-runbook",
  "context": {
    "legalBasis": {
      "authority": "INVESTIGATION",
      "classification": "SENSITIVE",
      "authorizedUsers": ["analyst-1"]
    },
    "tenantId": "my-tenant",
    "initiatedBy": "analyst-1",
    "assumptions": ["Data is current"]
  },
  "input": {
    "key": "value"
  }
}
```

#### Get execution status
```http
GET /api/v1/executions/{executionId}
```

#### List executions for runbook
```http
GET /api/v1/executions?runbookId=my-runbook
```

### Execution Control

#### Pause execution
```http
POST /api/v1/executions/{executionId}/pause
Content-Type: application/json

{
  "userId": "analyst-1"
}
```

#### Resume execution
```http
POST /api/v1/executions/{executionId}/resume
Content-Type: application/json

{
  "userId": "analyst-1"
}
```

#### Cancel execution
```http
POST /api/v1/executions/{executionId}/cancel
Content-Type: application/json

{
  "userId": "analyst-1",
  "reason": "No longer needed"
}
```

#### Retry failed step
```http
POST /api/v1/executions/{executionId}/steps/{stepId}/retry
Content-Type: application/json

{
  "userId": "analyst-1"
}
```

#### Replay execution
```http
POST /api/v1/executions/{executionId}/replay
```

### Logs and Evidence

#### Get logs
```http
GET /api/v1/executions/{executionId}/logs?stepId=step1&level=info&limit=100
```

#### Get evidence
```http
GET /api/v1/executions/{executionId}/evidence
```

### Health and Metrics

#### Health check
```http
GET /api/v1/health
```

#### Readiness
```http
GET /health/ready
```

#### Liveness
```http
GET /health/live
```

#### Metrics
```http
GET /metrics
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

### Standalone Service

```bash
# Build
npm run build

# Set environment variables
export PORT=3000
export MAX_CONCURRENT_STEPS=10
export STORAGE_BACKEND=memory
export DETAILED_LOGGING=true

# Start service
node dist/service.js
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/service.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: runbook-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: runbook-engine
  template:
    metadata:
      labels:
        app: runbook-engine
    spec:
      containers:
      - name: engine
        image: intelgraph/runbook-engine:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: MAX_CONCURRENT_STEPS
          value: "10"
        - name: STORAGE_BACKEND
          value: "memory"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3000` |
| `MAX_CONCURRENT_STEPS` | Max parallel step execution | `5` |
| `DEFAULT_MAX_RETRIES` | Default retry attempts | `3` |
| `DEFAULT_INITIAL_DELAY_MS` | Initial retry delay | `1000` |
| `DEFAULT_MAX_DELAY_MS` | Max retry delay | `10000` |
| `DEFAULT_BACKOFF_MULTIPLIER` | Exponential backoff multiplier | `2` |
| `STORAGE_BACKEND` | Storage backend: `memory`, `postgres`, `redis` | `memory` |
| `DATABASE_URL` | Database connection string | - |
| `DETAILED_LOGGING` | Enable detailed logging | `false` |
| `ENABLE_CORS` | Enable CORS | `true` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |

## Type Safety

All runbook definitions, step inputs/outputs, and execution contexts are fully typed for compile-time safety.

## Logging

The engine provides structured logging with:

- **Assumptions**: Explicit assumptions made during execution
- **Data Scope**: Description of data being analyzed
- **Legal Basis**: Legal authority and classification
- **Evidence Links**: All logs can reference evidence IDs
- **Queryable**: Filter logs by step, level, time range

## Idempotency

The engine automatically detects duplicate executions with the same runbook ID and input. If a completed execution exists, it returns the existing execution ID instead of creating a duplicate.

## State Persistence

Supports multiple storage backends:
- **Memory**: In-memory storage (for testing and development)
- **PostgreSQL**: Production-ready persistence (coming soon)
- **Redis**: High-performance caching layer (coming soon)

## Safety and Limits

The engine enforces strict safety limits to prevent runaway executions:

- **Max Loop Iterations**: Hard cap at 1000 iterations
- **Max Execution Depth**: Prevent infinite recursion in nested runbooks
- **Timeouts**: Global and per-step timeouts
- **Concurrent Step Limit**: Configurable max parallel execution
- **Authorization Checks**: Step-level permission validation
- **Idempotency**: Prevent duplicate executions

## API Version

Current API version: `v1`

All API endpoints are versioned and backward compatible.

## License

Proprietary - IntelGraph Platform
