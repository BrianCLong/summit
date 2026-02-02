# @intelgraph/orchestrator-store

PostgreSQL-backed orchestrator store for IntelGraph Summit platform. Provides persistent storage for Maestro autonomic loops, agents, experiments, and coordination tasks.

## Installation

```bash
npm install @intelgraph/orchestrator-store
```

## Usage

```javascript
import { OrchestratorPostgresStore } from "@intelgraph/orchestrator-store";
import { Pool } from "pg";

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const orchestratorStore = new OrchestratorPostgresStore({ pool: dbPool });

// Initialize the store (creates tables if they don't exist)
await orchestratorStore.initialize();

// Use in your services
const loops = await orchestratorStore.getLoops();
const agents = await orchestratorStore.getAgents();
const experiments = await orchestratorStore.getExperiments();
```

## Features

- **Persistent Storage**: Store orchestrator state, loops, agents, and experiments in PostgreSQL
- **Tenant Isolation**: Multi-tenant support with proper data segregation
- **Audit Logging**: Comprehensive audit trail for all orchestrator operations
- **Coordination Support**: Task and channel management for multi-agent coordination
- **Consensus Proposals**: Voting-based decision making framework with deadline enforcement
- **Performance Optimized**: Indexes and query optimization for high-throughput operations

## API

### `new OrchestratorPostgresStore(config)`

Creates a new orchestrator store instance.

- `config.pool`: A PostgreSQL connection pool instance

### `initialize()`

Sets up the required database tables and indexes.

### `getLoops()`

Returns a promise resolving to an array of all configured autonomic loops.

### `getLoopById(id)`

Returns a promise resolving to a specific loop by ID, or null if not found.

### `updateLoopStatus(id, status)`

Updates the status of a loop. Returns a promise resolving to true if the update was successful.

### `getAgents()`

Returns a promise resolving to an array of all registered agents.

### `getAgentById(id)`

Returns a promise resolving to a specific agent by ID, or null if not found.

### `updateAgent(id, updates, actor)`

Updates an agent with the provided changes. Returns a promise resolving to the updated agent object.

### `getExperiments()`

Returns a promise resolving to an array of all experiments.

### `createExperiment(experiment, actor)`

Creates a new experiment. Returns a promise resolving to the created experiment object.

### `getPlaybooks()`

Returns a promise resolving to an array of all playbooks.

### `createCoordinationTask(task, actor)`

Creates a new coordination task. Returns a promise resolving to the created task object.

### `getCoordinationTaskById(id)`

Returns a promise resolving to a specific coordination task by ID, or null if not found.

### `updateCoordinationTaskStatus(id, status)`

Updates the status of a coordination task. Returns a promise resolving to true if successful.

### `createCoordinationChannel(topic, participantAgentIds, actor)`

Creates a new coordination channel. Returns a promise resolving to the created channel object.

### `getCoordinationChannelById(id)`

Returns a promise resolving to a specific coordination channel by ID, or null if not found.

### `initiateConsensus(coordinatorId, topic, proposal, voterAgentIds, deadlineHours, actor)`

Starts a consensus process with the specified proposal. Returns a promise resolving to the consensus proposal object.

### `getConsensusProposalById(id)`

Returns a promise resolving to a specific consensus proposal by ID, or null if not found.

### `recordVote(proposalId, agentId, vote)`

Records a vote in the specified consensus proposal. Returns a promise resolving to true if successful.

### `getAuditLog([limit])`

Returns a promise resolving to an array of audit log entries, most recent first.

### `logAudit(actor, action, resource, details, [status])`

Logs an audit entry. Returns a promise that resolves when the log entry has been recorded.

## License

BUSL-1.1
