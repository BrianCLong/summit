# Runbook Engine

DAG-based workflow orchestration engine for IntelGraph. Executes runbooks as directed acyclic graphs with typed inputs/outputs, retry policies, and comprehensive logging.

## Features

### Core Execution
- **DAG Execution**: Execute workflows as directed acyclic graphs with automatic dependency resolution
- **Retry Logic**: Configurable retry policies with exponential backoff
- **State Management**: Persistent state tracking with support for memory and database backends
- **Idempotency**: Automatic duplicate detection to prevent redundant executions
- **Replay**: Re-run completed executions for debugging and verification

### Control Flow
- **Conditional Branching**: If/else logic based on runtime data
- **Loops**: For-each, while, and count loops with safety limits
- **Parallel Execution**: Automatic parallelization of independent steps

### Human-in-the-Loop
- **Approval Steps**: Require human approval for sensitive operations
- **Timeout Handling**: Configurable timeouts for approval requests
- **Multi-Approver**: Support for multiple approvers with quorum requirements

### Event-Driven
- **Wait for Events**: Pause execution until external events occur
- **Event Correlation**: Match events by correlation ID and filters
- **Timeout Support**: Configurable event wait timeouts

### Service Integration
- **Generic Service Calls**: Call external services via HTTP/gRPC
- **Idempotency Keys**: Safe retries with idempotency guarantees
- **Timeout and Error Handling**: Comprehensive error handling

### Safety & Security
- **Rate Limiting**: Per-tenant rate limits to prevent abuse
- **Depth Limits**: Maximum nesting depth for control flow
- **Resource Limits**: Limits on steps, iterations, and execution time
- **Authorization**: Integration with OPA/authz service for step-level permissions
- **Tenant Isolation**: Strict tenant resource isolation

### Observability
- **Structured Logging**: Comprehensive logging with assumptions, data scope, and legal basis tracking
- **Evidence Collection**: Automatic evidence collection and linking for audit trails
- **Execution Statistics**: Real-time progress tracking and metrics

### Control Operations
- **Pause/Resume**: Pause and resume long-running executions
- **Cancel**: Cancel executions with reason tracking
- **Progress Tracking**: Real-time execution statistics

### API
- **REST API**: Full REST API for managing executions
- **Admin Operations**: Pause, resume, cancel, and monitor executions
- **Approval Management**: Submit and track approvals

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
import { RunbookEngine, RunbookDefinition, StepExecutor } from '@intelgraph/runbook-engine';

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

// 2. Register step executors
engine.registerExecutor(new MyCustomExecutor());

// 3. Register runbook
const runbook: RunbookDefinition = {
  id: 'my-runbook',
  name: 'My Runbook',
  version: '1.0.0',
  description: 'Example runbook',
  steps: [
    {
      id: 'step1',
      name: 'First Step',
      type: 'custom:my-step',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: engine.config.defaultRetryPolicy,
    },
  ],
  defaultRetryPolicy: engine.config.defaultRetryPolicy,
};

engine.registerRunbook(runbook);

// 4. Execute runbook
const executionId = await engine.startRunbook(
  'my-runbook',
  {
    legalBasis: {
      authority: 'INVESTIGATION',
      classification: 'SENSITIVE',
      authorizedUsers: ['analyst-1'],
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

// 6. Get logs
const logs = await engine.getLogs({ executionId });

// 7. Get evidence
const evidence = await engine.getEvidence(executionId);
```

### Implementing a Step Executor

```typescript
import { StepExecutor, StepDefinition, StepIO, ExecutionContext, StepResult, ExecutionStatus } from '@intelgraph/runbook-engine';

export class MyCustomExecutor implements StepExecutor {
  readonly type = 'custom:my-step';

  validate(step: StepDefinition): boolean {
    // Validate step configuration
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();

    // Your logic here
    const output = { result: 'success' };

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: { schema: {}, data: output },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence: [],
      logs: [],
    };
  }
}
```

## REST API

### Start Runbook Execution

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

### Get Execution Status

```http
GET /api/v1/executions/{executionId}
```

### Get Logs

```http
GET /api/v1/executions/{executionId}/logs?stepId=step1&level=info&limit=100
```

### Get Evidence

```http
GET /api/v1/executions/{executionId}/evidence
```

### Replay Execution

```http
POST /api/v1/executions/{executionId}/replay
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

Currently supports:
- **Memory**: In-memory storage (for testing)
- **PostgreSQL**: Coming soon
- **Redis**: Coming soon

## API Version

Current API version: `v1`

All API endpoints are versioned and backward compatible.
