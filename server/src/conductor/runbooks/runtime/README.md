# Runbook Runtime System

A comprehensive DAG-based runbook execution engine with pause/resume/cancel capabilities, audit logging, and pluggable step executors.

## Overview

The Runbook Runtime System provides a robust framework for executing complex, multi-step operational procedures with:

- **DAG-based execution**: Steps are organized as a Directed Acyclic Graph for dependency management
- **Parallel execution**: Independent steps execute concurrently for optimal performance
- **Control actions**: Pause, resume, and cancel executions in real-time
- **Audit logging**: Hash-chained logs for tamper-evident audit trails
- **Pluggable executors**: Extensible step executor architecture
- **Retry with backoff**: Configurable retry policies with exponential backoff
- **Legal basis tracking**: GDPR-compliant legal basis and data license tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  POST /runtime/runbooks/:id/execute                             │
│  GET  /runtime/executions/:id                                   │
│  POST /runtime/executions/:id/control (PAUSE/RESUME/CANCEL)     │
│  GET  /runtime/executions/:id/logs                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Runtime Engine                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Definition  │  │   State     │  │   Executor Registry     │ │
│  │ Repository  │  │   Manager   │  │ ┌─────┐ ┌─────┐ ┌─────┐ │ │
│  └─────────────┘  └─────────────┘  │ │INGE │ │GRAPH│ │MINE │ │ │
│                                     │ │ ST  │ │LOOK │ │PATT │ │ │
│                                     │ └─────┘ └─────┘ └─────┘ │ │
│                                     └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Persistence Layer                             │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Execution Repository│  │ Execution Log Repository        │  │
│  │ (Redis/In-Memory)   │  │ (Hash-chained audit logs)       │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Starting an Execution

```typescript
import {
  RunbookRuntimeEngine,
  InMemoryRunbookDefinitionRepository,
  RunbookStateManager,
  InMemoryRunbookExecutionRepository,
  InMemoryRunbookExecutionLogRepository,
  createExecutorRegistry,
  RapidAttributionRunbook,
} from './runtime';
import { LegalBasis, DataLicense } from './dags/types';

// Initialize components
const executionRepo = new InMemoryRunbookExecutionRepository();
const logRepo = new InMemoryRunbookExecutionLogRepository();
const stateManager = new RunbookStateManager(executionRepo, logRepo);
const definitionRepo = new InMemoryRunbookDefinitionRepository();
const executorRegistry = createExecutorRegistry();

// Register runbooks
definitionRepo.register(RapidAttributionRunbook);

// Create runtime engine
const engine = new RunbookRuntimeEngine(
  definitionRepo,
  stateManager,
  executorRegistry
);

// Start execution
const execution = await engine.startExecution(
  'rapid_attribution_cti',
  {
    indicators: ['192.168.1.1', 'malicious.com', 'abc123hash'],
    caseId: 'CASE-2024-001',
  },
  {
    startedBy: 'analyst@example.com',
    tenantId: 'cti-team',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
  }
);

console.log('Execution started:', execution.executionId);
```

### Controlling Executions

```typescript
// Pause a running execution
await engine.controlExecution(executionId, 'PAUSE', 'admin');

// Resume a paused execution
await engine.controlExecution(executionId, 'RESUME', 'admin');

// Cancel an execution
await engine.controlExecution(executionId, 'CANCEL', 'admin');
```

### Getting Execution Status

```typescript
const execution = await engine.getExecution(executionId);

console.log('Status:', execution.status);
console.log('Steps:', execution.steps.map(s => `${s.stepId}: ${s.status}`));
console.log('KPIs:', execution.kpis);
```

## API Endpoints

### Execute Runbook
```
POST /runtime/runbooks/:runbookId/execute

Body:
{
  "input": {
    "indicators": ["192.168.1.1", "malicious.com"]
  },
  "legalBasis": "legitimate_interests",
  "dataLicenses": ["internal_use_only"],
  "authorityIds": ["auth-123"]
}

Response:
{
  "success": true,
  "executionId": "exec-abc123",
  "status": "PENDING"
}
```

### Get Execution Status
```
GET /runtime/executions/:executionId

Response:
{
  "success": true,
  "execution": {
    "executionId": "exec-abc123",
    "status": "RUNNING",
    "steps": [
      { "stepId": "step1", "status": "SUCCEEDED" },
      { "stepId": "step2", "status": "RUNNING" },
      { "stepId": "step3", "status": "PENDING" }
    ],
    "kpis": { "indicatorCount": 5 }
  }
}
```

### Control Execution
```
POST /runtime/executions/:executionId/control

Body:
{
  "action": "PAUSE" | "RESUME" | "CANCEL"
}

Response:
{
  "success": true,
  "executionId": "exec-abc123",
  "status": "PAUSED"
}
```

### Get Execution Logs
```
GET /runtime/executions/:executionId/logs

Response:
{
  "success": true,
  "logs": [
    {
      "logId": "log-1",
      "eventType": "EXECUTION_STARTED",
      "timestamp": "2024-01-15T10:00:00Z",
      "hash": "abc123..."
    }
  ]
}
```

## Runbook Definition

### Structure

```typescript
interface RunbookDefinition {
  id: string;                          // Unique identifier
  name: string;                        // Human-readable name
  version: string;                     // Semantic version
  purpose: string;                     // Description of purpose
  legalBasisRequired?: LegalBasis[];   // Required legal bases
  dataLicensesRequired?: DataLicense[];// Required data licenses
  assumptions?: string[];              // Documented assumptions
  kpis?: string[];                     // Key performance indicators
  steps: RunbookStepDefinition[];      // DAG of steps
  benchmarks?: {
    totalMs: number;
    perStepMs: Record<string, number>;
  };
  metadata?: Record<string, unknown>;
}
```

### Step Definition

```typescript
interface RunbookStepDefinition {
  id: string;                          // Unique step ID
  name: string;                        // Human-readable name
  description?: string;                // Step description
  actionType: RunbookActionType;       // Executor type
  dependsOn?: string[];                // Parent step IDs
  config: Record<string, unknown>;     // Step configuration
  retryPolicy?: {
    maxAttempts: number;
    backoffSeconds: number;
    backoffMultiplier?: number;
    maxBackoffSeconds?: number;
  };
  timeoutMs?: number;                  // Step timeout
  skipOnFailure?: boolean;             // Continue on failure
}
```

## Rapid Attribution (CTI) Runbook

The included Rapid Attribution runbook implements a 4-step workflow for cyber threat intelligence attribution:

```
┌──────────────────┐
│  Ingest          │
│  Indicators      │
│  (INGEST)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Resolve         │
│  Infrastructure  │
│  (LOOKUP_GRAPH)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Pattern Miner   │
│  Match Campaigns │
│  (PATTERN_MINER) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Report          │
│  (GENERATE_REPORT│
└──────────────────┘
```

### Usage

```typescript
const execution = await engine.startExecution(
  'rapid_attribution_cti',
  {
    indicators: [
      '192.168.1.100',
      'malicious-domain.com',
      'a1b2c3d4e5f6hash',
    ],
    caseId: 'CASE-2024-001',
    source: 'SOC Alert',
  },
  {
    startedBy: 'cti-analyst',
    tenantId: 'cti-team',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
  }
);
```

### Output

The runbook produces:
- **Attribution Report**: Confidence-scored attribution to threat actors
- **Campaign Matches**: Ranked list of matching campaigns
- **Evidence Chain**: Cryptographically signed evidence
- **Residual Unknowns**: Documented gaps in attribution

## Creating Custom Runbooks

### 1. Define the Runbook

```typescript
const myRunbook: RunbookDefinition = {
  id: 'my-custom-runbook',
  name: 'My Custom Runbook',
  version: '1.0.0',
  purpose: 'Custom workflow for X',
  steps: [
    {
      id: 'step1',
      name: 'First Step',
      actionType: 'CUSTOM',
      dependsOn: [],
      config: { functionName: 'myCustomFunction' },
    },
    {
      id: 'step2',
      name: 'Second Step',
      actionType: 'TRANSFORM',
      dependsOn: ['step1'],
      config: { transformType: 'extract' },
    },
  ],
};
```

### 2. Register Custom Executors

```typescript
import { CustomStepExecutor, StepExecutorContext, StepExecutorResult } from './runtime';

const customExecutor = new CustomStepExecutor();

customExecutor.registerFunction('myCustomFunction', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  // Custom logic here
  return {
    success: true,
    output: { result: 'custom output' },
  };
});

registry.register(customExecutor);
```

### 3. Register and Execute

```typescript
definitionRepo.register(myRunbook);

const execution = await engine.startExecution('my-custom-runbook', { input: 'data' }, {
  startedBy: 'user',
  tenantId: 'tenant',
});
```

## Step Executors

### Built-in Executors

| Action Type | Description |
|-------------|-------------|
| `INGEST` | Indicator ingestion and normalization |
| `LOOKUP_GRAPH` | Graph database infrastructure lookups |
| `PATTERN_MINER` | Campaign and TTP pattern matching |
| `GENERATE_REPORT` | Attribution report generation |
| `ENRICH_INTEL` | Intelligence enrichment |
| `VALIDATE` | Data validation |
| `TRANSFORM` | Data transformation |
| `NOTIFY` | Notification sending |
| `CUSTOM` | Custom function execution |

### Creating Custom Executors

```typescript
import { BaseStepExecutor, StepExecutorContext, StepExecutorResult, RunbookActionType } from './runtime';

class MyExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'CUSTOM';

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    const inputValue = this.getInput<string>(ctx, 'myInput', 'default');
    const prevOutput = this.findPreviousOutput<any>(ctx, 'previousKey');

    // Your logic here

    return this.success({
      result: 'output',
    }, {
      kpis: { processed: 1 },
      evidence: [this.createEvidence('my-type', data)],
    });
  }
}
```

## Audit Logging

All execution events are logged with hash-chain integrity:

```typescript
interface RunbookExecutionLogEntry {
  logId: string;
  executionId: string;
  timestamp: string;
  actorId: string;
  eventType: RunbookLogEventType;
  stepId?: string;
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
}
```

### Event Types

- `EXECUTION_STARTED`
- `EXECUTION_STATUS_CHANGED`
- `STEP_STARTED`
- `STEP_SUCCEEDED`
- `STEP_FAILED`
- `STEP_SKIPPED`
- `EXECUTION_PAUSED`
- `EXECUTION_RESUMED`
- `EXECUTION_CANCELLED`
- `EXECUTION_COMPLETED`
- `EXECUTION_FAILED`

### Verifying Chain Integrity

```typescript
const verification = await logRepo.verifyChain(executionId);
if (!verification.valid) {
  console.error('Chain tampered:', verification.error);
}
```

## Configuration

### Runtime Engine Config

```typescript
interface RuntimeEngineConfig {
  defaultTimeoutMs?: number;    // Default step timeout (5 minutes)
  maxParallelSteps?: number;    // Max concurrent steps (10)
  pollIntervalMs?: number;      // State polling interval (100ms)
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `NODE_ENV` | Environment (test uses in-memory) | `development` |

## Testing

```bash
# Run runtime tests
cd server
npm test -- --testPathPattern=runtime.test
```

## Best Practices

1. **Always specify legal basis**: Track data processing legality
2. **Use appropriate timeouts**: Set realistic timeouts per step
3. **Configure retries**: Use exponential backoff for transient failures
4. **Monitor KPIs**: Track execution metrics for optimization
5. **Verify audit logs**: Regularly verify chain integrity
6. **Handle unknowns**: Document and investigate residual unknowns

## License

MIT License - See LICENSE file for details.
