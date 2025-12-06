# @intelgraph/strands-agents

> Strands Agents SDK integration for IntelGraph - AI-powered graph intelligence with type-safe tools

This package provides a comprehensive integration of the [Strands Agents TypeScript SDK](https://github.com/strands-agents/sdk-typescript) with the IntelGraph intelligence analysis platform.

## Features

- **Type-safe Graph Tools**: Neo4j operations with Zod validation
- **Pre-configured Agents**: Investigation, Entity Resolution, and Analyst agents
- **Graph-backed Memory**: Persistent, queryable agent memory stored in Neo4j
- **Streaming Support**: Real-time response streaming for interactive UIs
- **Governance Integration**: Risk classification and policy enforcement via agent-gateway

## Installation

```bash
pnpm add @intelgraph/strands-agents
```

### Peer Dependencies

```bash
# For Amazon Bedrock
pnpm add @aws-sdk/client-bedrock-runtime

# For Anthropic
pnpm add @anthropic-ai/sdk

# For OpenAI
pnpm add openai
```

## Quick Start

```typescript
import {
  createInvestigationAgent,
  createAnalystAgent,
  createGraphMemory,
  createAllTools,
} from '@intelgraph/strands-agents';
import neo4j from 'neo4j-driver';

// Initialize Neo4j connection
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// Create an investigation agent
const investigator = createInvestigationAgent({
  driver,
  modelProvider: 'bedrock',
  auditLog: (action, details) => console.log(`[AUDIT] ${action}`, details),
});

// Run an investigation task
const result = await investigator.investigate({
  investigationId: 'inv-123',
  task: 'Identify key influencers and their communication patterns',
});

console.log(result.message);
console.log('Findings:', result.findings);
console.log('Hypotheses:', result.hypotheses);
```

## Tools

### Graph Tools

| Tool | Description | Risk Tier |
|------|-------------|-----------|
| `execute_cypher` | Execute Cypher queries | SUPERVISED |
| `find_path` | Find paths between entities | AUTONOMOUS |
| `get_neighbors` | Get connected entities | AUTONOMOUS |
| `get_subgraph` | Extract local subgraph | AUTONOMOUS |
| `get_graph_stats` | Get graph statistics | AUTONOMOUS |

### Entity Tools

| Tool | Description | Risk Tier |
|------|-------------|-----------|
| `search_entities` | Search entities by name | AUTONOMOUS |
| `get_entity` | Get entity details | AUTONOMOUS |
| `create_entity` | Create new entity | SUPERVISED |
| `find_similar_entities` | Find duplicates | AUTONOMOUS |
| `resolve_entity` | Resolve name to entity | SUPERVISED |

### Investigation Tools

| Tool | Description | Risk Tier |
|------|-------------|-----------|
| `get_investigation` | Get investigation details | AUTONOMOUS |
| `create_hypothesis` | Create hypothesis | SUPERVISED |
| `update_hypothesis` | Update hypothesis status | SUPERVISED |
| `add_finding` | Add finding | SUPERVISED |
| `link_entities_to_investigation` | Link entities | SUPERVISED |
| `get_timeline` | Get event timeline | AUTONOMOUS |

### Analysis Tools

| Tool | Description | Risk Tier |
|------|-------------|-----------|
| `detect_patterns` | Find graph patterns | AUTONOMOUS |
| `analyze_centrality` | Calculate centrality | AUTONOMOUS |
| `detect_anomalies` | Find anomalies | AUTONOMOUS |
| `compare_entities` | Compare entities | AUTONOMOUS |

## Agents

### Investigation Agent

For multi-step investigation workflows:

```typescript
const investigator = createInvestigationAgent({
  driver,
  modelProvider: 'bedrock',
  maxIterations: 15,
});

const result = await investigator.investigate({
  investigationId: 'inv-123',
  task: 'Analyze the network structure and identify key players',
  context: 'Focus on financial transactions from last quarter',
});
```

### Entity Resolution Agent

For deduplication and identity resolution:

```typescript
const resolver = createEntityResolutionAgent({
  driver,
  autoMergeThreshold: 0.95,
});

// Find duplicates
const duplicates = await resolver.findDuplicates({
  entityIds: ['entity-1', 'entity-2'],
});

// Scan entire investigation
const results = await resolver.scanInvestigation('inv-123');
```

### Analyst Agent

For ad-hoc analytical questions:

```typescript
const analyst = createAnalystAgent({ driver });

const analysis = await analyst.analyze({
  question: 'Who are the most influential entities?',
  investigationId: 'inv-123',
  depth: 'standard',
});

// Quick analysis shorthand
const answer = await analyst.quickAnalyze(
  'What patterns exist between these entities?',
  'inv-123'
);
```

## Memory System

Graph-backed persistent memory:

```typescript
const memory = createGraphMemory({
  driver,
  agentId: 'investigation-agent',
});

// Store a fact
await memory.remember({
  type: 'FACT',
  content: 'Entity A is connected to Entity B through Organization C',
  importance: 0.8,
});

// Recall relevant memories
const memories = await memory.recall({
  query: 'Entity A connections',
  minImportance: 0.5,
  limit: 10,
});

// Get conversation context
const context = await memory.getContext();
```

## Governance

Policy enforcement via agent-gateway:

```typescript
import { createGovernanceMiddleware } from '@intelgraph/strands-agents';

const governance = createGovernanceMiddleware({
  tenantId: 'tenant-123',
  defaultRiskTolerance: 'SUPERVISED',
});

// Wrap tools with governance
const governedTools = governance.wrapTools(allTools, {
  userId: 'user-456',
});

// Check policy before execution
const check = await governance.checkPolicy('create_entity', {
  userId: 'user-456',
});

if (!check.allowed) {
  console.log('Blocked:', check.reason);
}
```

## Streaming

Real-time response streaming:

```typescript
for await (const event of investigator.investigateStream({
  investigationId: 'inv-123',
  task: 'Analyze the network',
})) {
  if (event.type === 'text') {
    process.stdout.write(event.data);
  } else if (event.type === 'tool_use') {
    console.log('Using tool:', event.tool);
  }
}
```

## Integration with Strands SDK

When the Strands SDK is available:

```typescript
import { Agent } from '@strands-agents/sdk';
import { createAllTools } from '@intelgraph/strands-agents';

const { allTools } = createAllTools({ driver });

const agent = new Agent({
  systemPrompt: 'You are an intelligence analyst.',
  tools: allTools,
  modelProvider: 'bedrock',
});

const result = await agent.invoke('Analyze the network structure');
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Architecture

```
@intelgraph/strands-agents/
├── tools/
│   ├── graph-tools.ts      # Neo4j graph operations
│   ├── entity-tools.ts     # Entity CRUD operations
│   ├── investigation-tools.ts  # Investigation workflows
│   └── analysis-tools.ts   # Pattern detection & analytics
├── agents/
│   ├── investigation-agent.ts  # Multi-step investigation
│   ├── entity-resolution-agent.ts  # Deduplication
│   ├── analyst-agent.ts    # Ad-hoc analysis
│   └── prompts.ts          # System prompts
├── memory/
│   └── graph-memory.ts     # Graph-backed memory
├── governance/
│   └── index.ts            # Policy enforcement
└── types.ts                # Shared type definitions
```

## License

MIT

## See Also

- [Strands Agents SDK](https://github.com/strands-agents/sdk-typescript)
- [IntelGraph Documentation](../../../docs/ARCHITECTURE.md)
- [Agent Gateway](../../services/agent-gateway/README.md)
