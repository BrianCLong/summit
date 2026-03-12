# API Standard Types

The **API Standard Types** documentation details the core GraphQL operations, inputs, and enumerations governing the API interfaces across Summit's subsystems, including runbook orchestration, job scheduling, and system management.

These data types are defined centrally within the `api-schemas/v1/graphql-schema-v1.graphql` registry.

## Common Object Types

### `Runbook`

A declarative template representing a composable graph of tasks.

| Field | Type | Description |
|---|---|---|
| `id` | `ID!` | Unique runbook identifier. |
| `name` | `String!` | Human-readable name. |
| `version` | `String!` | Semantic version of the runbook schema. |
| `dag` | `JSON!` | Directed Acyclic Graph defining the task layout and dependencies. |
| `createdAt` | `DateTime!` | UTC timestamp of template creation. |

### `Run`

An instantiated execution instance of a `Runbook`.

| Field | Type | Description |
|---|---|---|
| `id` | `ID!` | Unique run identifier. |
| `runbookId` | `ID!` | Identifier of the parent template. |
| `tenantId` | `String!` | Scoped execution context or tenant owner. |
| `state` | `RunState!` | Current execution lifecycle status. |
| `createdAt` | `DateTime!` | UTC timestamp of run initialization. |
| `updatedAt` | `DateTime!` | UTC timestamp of last status or artifact change. |

## Enumerations

### `RunState`

Represents the deterministic state transitions of an execution `Run`.

| Value | Description |
|---|---|
| `QUEUED` | Run has been submitted and is awaiting a worker lease. |
| `LEASED` | A worker has claimed the run but execution has not formally begun. |
| `RUNNING` | Run tasks are currently executing. |
| `SUCCEEDED` | The run and all dependencies completed successfully. |
| `FAILED` | One or more non-recoverable errors occurred during execution. |
| `TIMED_OUT` | Execution exceeded the maximum allowed duration. |
| `ABORTED` | Execution was explicitly terminated via API or system intervention. |

## Operations

### Queries

#### `runbooks`
Fetches a paginated list of available `Runbook` templates.
*   **Arguments**:
    *   `limit` (`Int = 50`): Maximum results to return.
    *   `after` (`ID`): Cursor for pagination.
*   **Returns**: `[Runbook!]!`

#### `run`
Retrieves a single execution instance.
*   **Arguments**:
    *   `id` (`ID!`): Target `Run` identifier.
*   **Returns**: `Run`

### Mutations

#### `launchRun`
Instantiates and queues a new execution of a `Runbook`.
*   **Arguments**:
    *   `input` (`LaunchRunInput!`): Contains the `runbookId`, `tenantId`, and optional `params` (JSON).
*   **Returns**: `Run!`

#### `abortRun`
Terminates an active or queued `Run`. If the run is already in a terminal state, this is a no-op.
*   **Arguments**:
    *   `id` (`ID!`): Target `Run` identifier.
*   **Returns**: `Run!` (Returns the aborted or terminal run).
