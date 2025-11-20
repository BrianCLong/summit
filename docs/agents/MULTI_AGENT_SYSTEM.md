# Multi-Agent AI Orchestration System

## Overview

The Multi-Agent AI Orchestration System is a comprehensive framework for building and deploying autonomous intelligent agents that can collaborate to solve complex intelligence analysis tasks. The system provides distributed task execution, LLM-powered reasoning, inter-agent communication, and advanced workflow orchestration capabilities.

## Architecture

### Core Components

1. **Agent Framework** (`@intelgraph/agent-framework`)
   - Base agent abstractions and interfaces
   - Agent lifecycle management
   - Inter-agent communication protocol
   - Agent registry and discovery
   - LLM integration layer

2. **Agent Orchestrator** (`@intelgraph/agent-orchestrator`)
   - Task queue and distribution
   - Priority-based scheduling
   - Resource allocation and limits
   - Workflow DAG execution engine

3. **Agent Runtime** (`services/agent-runtime`)
   - HTTP API for agent management
   - Real-time WebSocket updates
   - Metrics and monitoring
   - Policy enforcement

4. **Specialized Agents** (`agents/`)
   - Data Collection Agents (OSINT, scraping)
   - Analysis Agents (NLP, graph, sentiment)
   - Synthesis Agents (report generation)
   - Monitoring Agents (alerting, anomaly detection)

## Key Features

### 1. Agent Framework

#### Base Agent Class
All agents inherit from `BaseAgent` which provides:
- Lifecycle management (initialize, start, pause, resume, stop, terminate)
- Task execution with timeout and retry
- Inter-agent messaging
- Health monitoring
- Metrics collection
- Context and memory management

#### Agent Capabilities
Agents declare their capabilities:
- `OSINT_COLLECTION` - Open source intelligence gathering
- `WEB_SCRAPING` - Web data extraction
- `NLP_ANALYSIS` - Natural language processing
- `GRAPH_ANALYSIS` - Network and relationship analysis
- `SENTIMENT_ANALYSIS` - Sentiment and tone analysis
- `PATTERN_RECOGNITION` - Pattern detection in data
- `ANOMALY_DETECTION` - Outlier and anomaly identification
- `REPORT_GENERATION` - Automated report creation
- `SUMMARIZATION` - Content summarization
- `ALERTING` - Alert generation and notification
- `LLM_REASONING` - LLM-powered analysis

#### Agent States
- `IDLE` - Agent is initialized but not started
- `INITIALIZING` - Agent is starting up
- `READY` - Agent is ready to accept tasks
- `WORKING` - Agent is actively executing tasks
- `PAUSED` - Agent is temporarily paused
- `ERROR` - Agent encountered an error
- `TERMINATED` - Agent has been shut down

### 2. Inter-Agent Communication

The `MessageBus` provides pub/sub and direct messaging:

```typescript
// Direct messaging
await messageBus.sendDirect(fromAgentId, toAgentId, payload);

// Broadcasting to a topic
await messageBus.broadcast(fromAgentId, 'analysis:complete', payload);

// Query-response pattern
const response = await messageBus.query(fromAgentId, toAgentId, query);
```

Message types:
- `request` - Request another agent to perform an action
- `response` - Response to a request or query
- `broadcast` - One-to-many message
- `query` - Request expecting a response
- `notification` - Informational message
- `error` - Error notification

### 3. Agent Registry and Discovery

The `AgentRegistry` manages agent registration and discovery:

```typescript
// Register an agent
await registry.register(agentConfig, endpoint);

// Find agents by capability
const agents = await registry.findByCapability(AgentCapability.NLP_ANALYSIS);

// Find the best agent for a task
const bestAgent = await registry.findBest(
  AgentCapability.GRAPH_ANALYSIS,
  'success_rate' // or 'speed', 'load'
);

// Update agent state
await registry.updateState(agentId, AgentState.WORKING);

// Send heartbeat
await registry.heartbeat(agentId);
```

### 4. LLM Integration

Agents can leverage LLMs for reasoning:

```typescript
// Create LLM capability
const llmConfig = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20250101',
  temperature: 0.7,
  maxTokens: 4096,
};

const provider = LLMProviderFactory.create(llmConfig, logger);
const llm = new LLMAgentCapability(provider, systemPrompt);

// Use LLM for analysis
const response = await llm.ask('Analyze this intelligence data...');

// Streaming responses
for await (const chunk of llm.askStream('Generate a report...')) {
  process.stdout.write(chunk);
}
```

Supported providers:
- **Anthropic Claude** - Claude 3.5 Sonnet, Claude 3 Opus
- **OpenAI** - GPT-4, GPT-4 Turbo
- **Local** - Local LLM models (planned)

### 5. Task Queue and Scheduling

The `TaskQueue` manages task distribution:

```typescript
// Enqueue a task
const task: Task = {
  id: uuidv4(),
  type: 'nlp:analyze',
  priority: AgentPriority.HIGH,
  input: { text: '...' },
  dependencies: [],
  createdAt: new Date().toISOString(),
};

await taskQueue.enqueue(task);

// Register a task handler
taskQueue.registerHandler('nlp:analyze', async (task) => {
  // Execute task
  return result;
});

// Start processing
await taskQueue.startProcessing(concurrency);
```

The `Scheduler` intelligently assigns tasks to agents:

```typescript
// Schedule a task
const decision = await scheduler.schedule(task);
// Returns: { task, agentId, reason, estimatedDuration }

// Batch scheduling
const decisions = await scheduler.scheduleBatch(tasks);

// Reschedule failed task
await scheduler.reschedule(task, failureReason, delayMs);
```

Scheduling strategies:
- `round-robin` - Distribute evenly across agents
- `least-loaded` - Assign to agent with fewest tasks
- `fastest` - Assign to agent with best average execution time
- `best-fit` - Multi-factor scoring (success rate, load, speed, health)

### 6. Workflow DAG Execution

The `WorkflowEngine` executes complex workflows:

```typescript
// Define a workflow
const workflow: Workflow = {
  id: 'intel-analysis-workflow',
  name: 'Intelligence Analysis Workflow',
  version: '1.0.0',
  tasks: [
    {
      id: 'collect',
      agentType: 'osint:collect',
      input: { target: 'entity-123' },
      dependencies: [],
    },
    {
      id: 'analyze',
      agentType: 'nlp:analyze',
      input: {},
      dependencies: ['collect'],
    },
    {
      id: 'report',
      agentType: 'report:generate',
      input: { format: 'markdown' },
      dependencies: ['analyze'],
      condition: 'results.analyze.confidence > 0.8',
    },
  ],
};

// Register workflow
await workflowEngine.registerWorkflow(workflow);

// Execute workflow
const execution = await workflowEngine.executeWorkflow(workflow.id, inputs);

// Monitor execution
workflowEngine.on('workflow:task:completed', ({ execution, task }) => {
  console.log(`Task ${task.id} completed`);
});

// Cancel execution
await workflowEngine.cancelExecution(execution.id);
```

Features:
- **DAG Validation** - Ensures no circular dependencies
- **Topological Sorting** - Optimal execution order
- **Conditional Execution** - Tasks can have conditions
- **Dependency Management** - Automatic output passing
- **Error Handling** - Workflow fails if any task fails
- **State Persistence** - Execution state stored in Redis

## Agent Types

### Data Collection Agent

Capabilities:
- OSINT collection from public sources
- Web scraping with LLM-guided extraction
- API integration for external data sources

Example usage:
```typescript
const agent = new DataCollectionAgent(config, logger);
await agent.initialize();
await agent.start();

const task: Task = {
  type: 'osint:collect',
  input: {
    target: 'entity-name',
    sources: ['social_media', 'public_records'],
    depth: 2,
  },
};

const result = await agent.executeTask(task);
```

### Analysis Agent

Capabilities:
- NLP analysis (entity extraction, keyword extraction)
- Graph analysis (centrality, community detection)
- Sentiment analysis
- Pattern detection
- Anomaly detection

Example usage:
```typescript
const agent = new AnalysisAgent(config, logger);

const task: Task = {
  type: 'graph:analyze',
  input: {
    nodes: [...],
    edges: [...],
    algorithm: 'centrality',
  },
};

const result = await agent.executeTask(task);
```

### Synthesis Agent

Capabilities:
- Report generation from multiple sources
- Content summarization
- Data synthesis and correlation

Example usage:
```typescript
const agent = new SynthesisAgent(config, logger);

const task: Task = {
  type: 'report:generate',
  input: {
    title: 'Intelligence Report',
    data: [...],
    format: 'markdown',
    classification: 'UNCLASSIFIED',
  },
};

const report = await agent.executeTask(task);
```

## Monitoring and Observability

### Agent Metrics

Each agent tracks:
- `tasksCompleted` - Number of successfully completed tasks
- `tasksFailed` - Number of failed tasks
- `averageExecutionTime` - Average task execution time (ms)
- `totalExecutionTime` - Total time spent executing tasks
- `apiCallsCount` - Number of API calls made
- `apiCostUSD` - Estimated API costs in USD
- `healthStatus` - Current health status (healthy/degraded/unhealthy)
- `lastHealthCheck` - Timestamp of last health check

### Health Checks

Agents perform periodic health checks:
```typescript
const healthy = await agent.healthCheck();
const metrics = agent.getMetrics();
```

The registry monitors agent heartbeats:
```typescript
// Start monitoring (checks for stale agents)
registry.startMonitoring();

// Get registry statistics
const stats = await registry.getStats();
// Returns: { total, byState, byHealth, byType }
```

### Cost Monitoring

LLM usage is automatically tracked:
```typescript
// Metrics include API costs
const metrics = agent.getMetrics();
console.log(`Total API cost: $${metrics.apiCostUSD.toFixed(4)}`);
```

## Human-in-the-Loop

Tasks can require human review:

```typescript
const task: Task = {
  id: uuidv4(),
  type: 'report:generate',
  input: { ... },
  humanReviewRequired: true,
  humanReviewStatus: 'pending',
};

// Task will pause for human approval
// Update review status
task.humanReviewStatus = 'approved'; // or 'rejected'
```

## Configuration

### Agent Configuration

```typescript
const agentConfig: AgentConfig = {
  id: 'analysis-agent-1',
  name: 'Analysis Agent',
  type: 'analysis',
  version: '1.0.0',
  capabilities: [
    AgentCapability.NLP_ANALYSIS,
    AgentCapability.SENTIMENT_ANALYSIS,
  ],
  priority: AgentPriority.NORMAL,
  resources: {
    maxConcurrentTasks: 5,
    maxMemoryMB: 2048,
    timeout: 300000, // 5 minutes
  },
  llmConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20250101',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are an expert analyst...',
  },
};
```

### Orchestrator Configuration

```typescript
// Task Queue
const taskQueueConfig: TaskQueueConfig = {
  redisUrl: 'redis://localhost:6379',
  queueName: 'agent-tasks',
  concurrency: 10,
  limiter: {
    max: 100, // Max 100 tasks
    duration: 60000, // per minute
  },
};

// Scheduler
const schedulerConfig: SchedulerConfig = {
  maxRetries: 3,
  retryDelay: 5000,
  loadBalancingStrategy: 'best-fit',
  enableAdaptive: true,
};

// Workflow Engine
const workflowConfig: WorkflowEngineConfig = {
  redisUrl: 'redis://localhost:6379',
  maxConcurrentWorkflows: 50,
};
```

## API Reference

### Agent Runtime API

#### Start Runbook Execution
```http
POST /runbooks
Content-Type: application/json

{
  "name": "intel-collection",
  "version": "1.0.0",
  "inputs": {
    "target": "entity-123"
  }
}
```

#### Get Execution Status
```http
GET /runbooks/:executionId
```

#### List Executions
```http
GET /runbooks?status=running
```

#### Replay Execution
```http
POST /runbooks/replay
Content-Type: application/json

{
  "sourceId": "execution-id",
  "inputs": {}
}
```

#### WebSocket Real-time Updates
```javascript
const ws = new WebSocket('ws://localhost:4012/ws');

ws.send(JSON.stringify({
  type: 'subscribe',
  executionId: 'execution-id'
}));

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Execution update:', update);
});
```

#### Metrics
```http
GET /metrics
```

Returns Prometheus-compatible metrics.

## Deployment

### Docker Deployment

```dockerfile
# Agent Runtime
FROM node:18-alpine
WORKDIR /app
COPY services/agent-runtime .
RUN npm install
CMD ["npm", "start"]
```

### Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# API
PORT=4012
NODE_ENV=production

# Policy Enforcement
POLICY_DRY_RUN=false

# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-runtime
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-runtime
  template:
    metadata:
      labels:
        app: agent-runtime
    spec:
      containers:
      - name: agent-runtime
        image: intelgraph/agent-runtime:latest
        ports:
        - containerPort: 4012
        env:
        - name: REDIS_URL
          value: redis://redis:6379
        - name: NODE_ENV
          value: production
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Best Practices

### 1. Agent Design
- Keep agents focused on specific capabilities
- Implement proper error handling and retries
- Use LLMs judiciously (they're expensive)
- Monitor and log all agent activities

### 2. Task Design
- Break complex operations into smaller tasks
- Use dependencies to enforce ordering
- Set appropriate timeouts
- Include retry logic for transient failures

### 3. Workflow Design
- Validate DAG structure before execution
- Use conditional execution for branching logic
- Pass data between tasks efficiently
- Handle errors gracefully

### 4. Monitoring
- Track agent health and metrics
- Monitor queue depths and processing times
- Set up alerts for failures
- Review API costs regularly

### 5. Security
- Use policy enforcement for sensitive operations
- Implement authentication and authorization
- Validate all inputs
- Audit all agent activities

## Examples

See complete examples in:
- `examples/agents/simple-workflow.ts` - Basic workflow
- `examples/agents/intel-pipeline.ts` - Intelligence collection pipeline
- `examples/agents/collaborative-analysis.ts` - Multi-agent collaboration

## Troubleshooting

### Agent not starting
- Check Redis connectivity
- Verify agent configuration
- Review logs for initialization errors

### Tasks not being processed
- Check queue status (`TaskQueue.getStats()`)
- Verify task handlers are registered
- Check agent availability in registry

### Workflow execution stalled
- Check for circular dependencies
- Verify all tasks can be scheduled
- Review task execution logs

### High API costs
- Monitor token usage per agent
- Optimize prompt templates
- Consider caching frequent queries
- Use smaller models where appropriate

## Future Enhancements

- [ ] Local LLM support (Ollama, LlamaCPP)
- [ ] Advanced consensus algorithms
- [ ] Federated agent learning
- [] Visual workflow builder UI
- [ ] Agent configuration templates
- [ ] Automated agent scaling
- [ ] Multi-tenancy support
- [ ] Agent marketplace

## Contributing

See `CONTRIBUTING.md` for development guidelines.

## License

MIT License - see `LICENSE` file for details.
