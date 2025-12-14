# Maestro Architecture

Maestro is the central orchestration engine for Summit, responsible for managing complex workflows (Runs) composed of Tasks. It provides the "nervous system" connecting AI Agents, Graph operations, and external services.

## Core Concepts

### 1. Template (`MaestroTemplate`)
A versioned blueprint for a workflow. It defines the:
- **Spec**: A DAG of nodes (tasks, subflows, decisions).
- **Inputs/Outputs**: JSON schemas.
- **Metadata**: Capabilities, cost estimates.

### 2. Run (`MaestroRun`)
An instance of a Template execution.
- Scoped to a `TenantId`.
- Has a `status` (pending, running, succeeded, failed).
- Persisted in Postgres.

### 3. Task (`MaestroTask`)
An atomic unit of work within a Run.
- **Kind**: `llm_call`, `rag_query`, `graph_job`, `agent_call`, etc.
- **State Machine**: pending -> ready -> queued -> running -> succeeded/failed.
- **Dependencies**: Can wait for other tasks to complete.
- **Retries**: Configurable backoff strategies.

### 4. Agent (`MaestroAgent`)
A higher-level abstraction. An Agent is essentially a named, discoverable Template with specific configuration.
- Agents can call other Agents (via `agent_call` task).
- This forms the "Agent Mesh".

## Architecture

### Engine (`server/src/maestro/engine.ts`)
The core logic that:
1. **Compiles** a Template Spec into a set of Tasks.
2. **Schedules** ready tasks to the Queue.
3. **Executes** tasks via registered Handlers.
4. **Manages** state transitions and dependency resolution.

### Queue (BullMQ)
We use BullMQ (Redis) to:
- Buffer tasks.
- Handle retries and backoff.
- Distribute work to workers (currently in-process, scalable to external workers).

### Persistence (Postgres)
All state is durable.
- `maestro_templates`
- `maestro_runs`
- `maestro_tasks`
- `maestro_agents`

### DSL (`server/src/maestro/dsl.ts`)
A JSON-based format to describe the workflow graph.
```json
{
  "nodes": [
    { "id": "step1", "kind": "task", "ref": "llm_call" },
    { "id": "step2", "kind": "task", "ref": "graph_job" }
  ],
  "edges": [
    { "from": "step1", "to": "step2" }
  ]
}
```

## Integrations

- **LLM**: via `llm_call` handler.
- **RAG**: via `rag_query` handler.
- **Graph**: via `graph_job` handler.
- **Agents**: via `agent_call` (recursive runs).

## Security
- **Tenancy**: All data is strictly isolated by `tenant_id`.
- **Policy**: `PolicyService` gates creation and execution.
