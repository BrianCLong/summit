# Agentic Mesh - Getting Started Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-11-21

## Overview

The Agentic Mesh is a secure, auditable, ultra-resilient multi-LLM, multi-agent fabric designed for production intelligence and product organizations.

## Quick Start

### Prerequisites

- Node.js >= 18.18
- pnpm >= 9.12.0
- Docker (for local services)

### Installation

```bash
# Install dependencies
pnpm install

# Build the SDK
cd packages/mesh-sdk && pnpm build
```

### Basic Usage

```typescript
import {
  PlannerAgent,
  CoderAgent,
  CriticAgent,
  AgentFactory,
} from '@intelgraph/mesh-sdk';

// Register agents with the factory
AgentFactory.register('planner', PlannerAgent);
AgentFactory.register('coder', CoderAgent);
AgentFactory.register('critic', CriticAgent);

// Create an agent instance
const planner = AgentFactory.create('planner');
console.log(planner.getFullDescriptor());
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       AGENTIC MESH                               │
├─────────────────────────────────────────────────────────────────┤
│  mesh-orchestrator  →  routing-gateway  →  policy-enforcer      │
│         ↓                    ↓                   ↓               │
│  agent-registry      tool-registry       provenance-service     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL    │    Redis    │    Neo4j    │    S3/Minio        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agents

Agents are the primary workers in the mesh. Each agent:
- Has a specific role (planner, coder, critic, etc.)
- Declares capabilities
- Specifies model preferences
- Handles tasks autonomously

#### Creating a Custom Agent

```typescript
import { BaseAgent, type AgentServices, type TaskInput, type TaskOutput } from '@intelgraph/mesh-sdk';

class MyCustomAgent extends BaseAgent {
  getDescriptor() {
    return {
      name: 'my-custom-agent',
      version: '1.0.0',
      role: 'custom',
      riskTier: 'low',
      capabilities: ['my-capability'],
      requiredTools: [],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
      },
    };
  }

  async onTaskReceived(
    input: TaskInput<{ prompt: string }>,
    services: AgentServices
  ): Promise<TaskOutput<{ response: string }>> {
    const { task, payload } = input;

    // Use the model service
    const response = await services.model.complete(payload.prompt);

    // Log provenance
    await services.provenance.record({
      type: 'model_call',
      taskId: task.id,
      agentId: this.getId(),
      payload: {
        type: 'model_call',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        promptHash: 'xxx',
        responseHash: 'yyy',
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        latencyMs: response.latencyMs,
      },
      traceContext: { traceId: task.id, spanId: crypto.randomUUID() },
    });

    return this.success(task.id, { response: response.content });
  }
}
```

### 2. Tools

Tools provide agents with capabilities to interact with external systems.

```typescript
import type { ToolDescriptor } from '@intelgraph/mesh-sdk';

const gitTool: ToolDescriptor = {
  id: crypto.randomUUID(),
  name: 'git',
  version: '1.0.0',
  description: 'Git operations (diff, branch, commit)',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['diff', 'branch', 'commit'] },
      args: { type: 'object' },
    },
    required: ['action'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      output: { type: 'string' },
    },
  },
  riskTier: 'medium',
  rateLimit: 60,
  requiredRoles: ['developer'],
  status: 'active',
};
```

### 3. Policies

Policies define rules for what actions are allowed in the mesh.

```yaml
# policies/mesh/custom-policy.yaml
policies:
  - id: CUSTOM-001
    name: My Custom Policy
    description: Example policy
    version: "1.0.0"
    enabled: true
    priority: 50
    conditions:
      - field: action
        operator: equals
        value: tool_invoke
      - field: resource.attributes.dangerous
        operator: equals
        value: true
    effect:
      action: escalate_to_human
      reason: Dangerous tool requires human approval
    audit:
      level: full
      retentionDays: 365
```

### 4. Provenance

Every action in the mesh is recorded for auditability.

```typescript
import { InMemoryProvenanceStore, ProvenanceAPI } from '@intelgraph/services/provenance-service';

const store = new InMemoryProvenanceStore();
const api = new ProvenanceAPI(store);

// Record an event
const recordId = await api.createRecord({
  type: 'task_created',
  taskId: 'task-123',
  payload: {
    type: 'task_created',
    taskType: 'code_review',
    inputSummary: 'Review PR #456',
    priority: 1,
  },
  traceContext: {
    traceId: 'trace-abc',
    spanId: 'span-def',
  },
});

// Query provenance chain
const chain = await api.getTaskProvenance('task-123');
console.log(chain.summary);
```

## Task Flows

### Default Flow

```
Task Submitted → Route → Policy Check → Agent Invoke → Complete
```

### Code Review Flow

```
Task Submitted → Route → Policy Check → Coder Agent → Critic Review → Complete
```

### High-Risk Flow

```
Task Submitted → Route → Policy Check → Agent Invoke → Red Team Review → Human Approval → Complete
```

## Running the Services

### Development Mode

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start individual services
cd services/mesh-orchestrator && pnpm dev
cd services/routing-gateway && pnpm dev
cd services/policy-enforcer && pnpm dev
cd services/provenance-service && pnpm dev
```

### Service Endpoints

| Service | Port | Endpoint |
|---------|------|----------|
| Mesh Orchestrator | 5000 | POST /api/v1/tasks |
| Routing Gateway | 5001 | POST /api/v1/route/task |
| Policy Enforcer | 5002 | POST /api/v1/evaluate |
| Provenance Service | 5003 | POST /api/v1/provenance |

## Example Workflows

### 1. Code Refactoring

```typescript
// Submit a code refactoring task
const response = await fetch('http://localhost:5000/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'code_refactor',
    input: {
      specification: 'Extract the authentication logic into a separate service',
      targetFiles: ['src/api/auth.ts', 'src/api/users.ts'],
    },
    priority: 1,
  }),
});

const { taskId } = await response.json();

// Poll for completion
const task = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`);
```

### 2. Incident Investigation

```typescript
const response = await fetch('http://localhost:5000/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'incident_investigation',
    input: {
      description: 'API latency spike at 14:00 UTC',
      logs: ['service-a', 'service-b'],
      timeRange: { start: '2025-11-21T13:50:00Z', end: '2025-11-21T14:30:00Z' },
    },
    priority: 2,
  }),
});
```

## Monitoring & Observability

### Metrics

All services expose Prometheus metrics at `/metrics`:

```bash
curl http://localhost:5000/metrics
```

Key metrics:
- `mesh_tasks_total` - Total tasks by type and status
- `mesh_agent_invocations_total` - Agent invocation counts
- `mesh_model_calls_total` - Model call counts by provider
- `mesh_model_latency_seconds` - Model call latency distribution
- `mesh_policy_decisions_total` - Policy decision counts

### Logging

All services use structured JSON logging:

```json
{
  "timestamp": "2025-11-21T10:00:00.000Z",
  "level": "INFO",
  "message": "Task completed",
  "context": {
    "service": "mesh-orchestrator",
    "taskId": "abc-123",
    "agentId": "def-456",
    "durationMs": 1234
  }
}
```

### Tracing

Distributed tracing is available via OpenTelemetry:

```typescript
import { createLogger } from '@intelgraph/mesh-observability';

const logger = createLogger('my-service');
const childLogger = logger.child({ traceId: 'abc-123', spanId: 'def-456' });
childLogger.info('Processing task');
```

## Security Best Practices

1. **Always use policies** - Define and enforce policies for all sensitive operations
2. **Enable full audit logging** - For restricted data and high-risk operations
3. **Use critic agents** - For code generation and analysis tasks
4. **Review provenance** - Regularly audit the provenance chain for anomalies
5. **Set budgets** - Define token and cost limits per task

## Next Steps

1. Read the [Architecture Document](./00-architecture.md)
2. Review the [Policy Documentation](./policies.md)
3. Explore the [SDK Reference](../../packages/mesh-sdk/README.md)
4. Check out the [Example Workflows](../../examples/)

## Support

- GitHub Issues: [summit/issues](https://github.com/BrianCLong/summit/issues)
- Documentation: [docs/agentic-mesh/](.)
