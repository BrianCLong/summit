# @intelgraph/mesh-sdk

Core SDK for the Agentic Mesh - a secure, auditable, multi-LLM, multi-agent fabric.

## Installation

```bash
pnpm add @intelgraph/mesh-sdk
```

## Quick Start

```typescript
import {
  PlannerAgent,
  CoderAgent,
  CriticAgent,
  AgentFactory,
  createDefaultToolRegistry,
} from '@intelgraph/mesh-sdk';

// Register agents
AgentFactory.register('planner', PlannerAgent);
AgentFactory.register('coder', CoderAgent);
AgentFactory.register('critic', CriticAgent);

// Create an agent
const coder = AgentFactory.create('coder');
console.log(coder.getFullDescriptor());

// Get available tools
const tools = createDefaultToolRegistry();
console.log(tools.list());
```

## Features

### Agents

The SDK includes 8 production-ready agents:

| Agent | Role | Description |
|-------|------|-------------|
| `PlannerAgent` | planner | Task decomposition and workflow coordination |
| `CoderAgent` | coder | Code generation, refactoring, and review |
| `CriticAgent` | critic | Quality assessment and safety review |
| `ResearchAgent` | researcher | Information gathering and synthesis |
| `PolicyGuardianAgent` | policy_guardian | Policy enforcement with built-in rules |
| `ProvenanceAuditorAgent` | provenance_auditor | Audit trail verification |
| `RedTeamAgent` | red_teamer | Security vulnerability probing |
| `JudgeAgent` | judge | Final output scoring and approval |

### Creating Custom Agents

```typescript
import { BaseAgent, type AgentServices, type TaskInput, type TaskOutput } from '@intelgraph/mesh-sdk';

class MyAgent extends BaseAgent {
  getDescriptor() {
    return {
      name: 'my-agent',
      version: '1.0.0',
      role: 'custom',
      riskTier: 'low',
      capabilities: ['my-capability'],
      requiredTools: [],
    };
  }

  async onTaskReceived(
    input: TaskInput<{ prompt: string }>,
    services: AgentServices
  ): Promise<TaskOutput<{ response: string }>> {
    const response = await services.model.complete(input.payload.prompt);
    return this.success(input.task.id, { response: response.content });
  }
}
```

### Tools

Built-in tools for agent operations:

| Tool | Risk | Description |
|------|------|-------------|
| `GitTool` | medium | Git operations (diff, commit, branch) |
| `FileReadTool` | low | Read files from filesystem |
| `FileWriteTool` | medium | Write files to filesystem |
| `HttpFetchTool` | high | HTTP requests (with allowlist) |
| `GraphQueryTool` | medium | Neo4j/Cypher queries |
| `SearchTool` | low | Code and document search |
| `ShellTool` | high | Sandboxed shell commands |

```typescript
import { createDefaultToolRegistry, defineTool } from '@intelgraph/mesh-sdk';

// Use built-in tools
const registry = createDefaultToolRegistry();
const gitTool = registry.get('git');

// Create custom tools
const myTool = defineTool('my-tool')
  .version('1.0.0')
  .description('My custom tool')
  .inputSchema({ type: 'object', properties: { input: { type: 'string' } } })
  .outputSchema({ type: 'object', properties: { output: { type: 'string' } } })
  .riskTier('low')
  .build();
```

### Type System

The SDK provides comprehensive TypeScript types:

```typescript
import type {
  AgentDescriptor,
  ToolDescriptor,
  TaskInput,
  TaskOutput,
  PolicyContext,
  PolicyDecision,
  ProvenanceRecord,
  RoutingContext,
  RoutingDecision,
} from '@intelgraph/mesh-sdk';
```

## Agent Lifecycle

Agents support lifecycle hooks:

```typescript
class MyAgent extends BaseAgent {
  // Called when agent joins the mesh
  async onRegister(services: AgentServices) {
    services.logger.info('Agent registered');
  }

  // Main task handler
  async onTaskReceived(input: TaskInput, services: AgentServices) {
    // Handle task
  }

  // Called when a spawned subtask completes
  async onSubtaskResult(subtaskId: string, result: TaskOutput, services: AgentServices) {
    // Handle subtask result
  }

  // Called on errors
  async onError(error: TaskError, input: TaskInput, services: AgentServices) {
    // Handle error, return true to continue
    return false;
  }

  // Called when agent is retired
  async onRetire(services: AgentServices) {
    // Cleanup
  }
}
```

## Services Interface

Agents receive services for mesh operations:

```typescript
interface AgentServices {
  provenance: ProvenanceClient;  // Audit trail logging
  tools: ToolClient;             // Tool invocation
  model: ModelClient;            // LLM calls
  mesh: MeshClient;              // Spawn subtasks
  metrics: MetricsClient;        // Emit metrics
  logger: Logger;                // Structured logging
}
```

## Building

```bash
cd packages/mesh-sdk
pnpm build
```

## Testing

```bash
pnpm test
```

## License

MIT
