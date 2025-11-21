# Maestro Orchestrator Persistence

## Overview

The Maestro Orchestrator utilizes a durable PostgreSQL-backed storage layer to ensure reliability, crash recovery, and auditability of all agentic workflows. This persistence layer replaces the legacy in-memory/JSON-file approaches.

## Architecture

The persistence layer consists of three core tables residing in the primary PostgreSQL database:

1.  **`runs`**: Represents a high-level execution of a pipeline or agent command.
2.  **`tasks`**: Represents individual units of work (agent tasks) within a run.
3.  **`events`**: An append-only log of state changes and significant occurrences (Outbox pattern).

## Schema

### Runs Table

Stores workflow execution state.

| Column          | Type        | Description                                      |
| :-------------- | :---------- | :----------------------------------------------- |
| `id`            | UUID        | Unique identifier for the run.                   |
| `pipeline_id`   | TEXT        | Identifier of the pipeline/repo being executed.  |
| `status`        | TEXT        | `queued`, `running`, `succeeded`, `failed`, etc. |
| `input_params`  | JSONB       | serialized input context.                        |
| `executor_id`   | TEXT        | User or Actor ID who initiated the run.          |
| `tenant_id`     | TEXT        | Multi-tenant isolation key.                      |

### Tasks Table

Stores individual task state and supports idempotency.

| Column            | Type        | Description                                      |
| :---------------- | :---------- | :----------------------------------------------- |
| `id`              | UUID        | Unique identifier for the task.                  |
| `run_id`          | UUID        | FK to `runs`.                                    |
| `type`            | TEXT        | Task kind (e.g., `plan`, `implement`).           |
| `status`          | TEXT        | `pending`, `running`, `completed`, `failed`.     |
| `idempotency_key` | TEXT        | Unique key to prevent duplicate task execution.  |
| `tenant_id`       | TEXT        | Multi-tenant isolation key.                      |

### Events Table

Audit trail and event sourcing support.

| Column      | Type        | Description                                      |
| :---------- | :---------- | :----------------------------------------------- |
| `id`        | UUID        | Unique event ID.                                 |
| `run_id`    | UUID        | FK to `runs`.                                    |
| `task_id`   | UUID        | FK to `tasks` (optional).                        |
| `type`      | TEXT        | Event type (e.g., `TASK_COMPLETED`).             |
| `payload`   | JSONB       | Event data.                                      |

## Implementation

The Data Access Layer (DAL) is implemented in `server/src/maestro/runs/`:

-   `runs-repo.ts`: Manages `runs` table.
-   `tasks-repo.ts`: Manages `tasks` table.
-   `events-repo.ts`: Manages `events` table.

The `MaestroOrchestrator` (`server/orchestrator/maestro.ts`) integrates these repositories to ensure every task enqueueing and completion is recorded transactionally (or at least durably) before or alongside queue operations.

## Crash Recovery

On startup, the Orchestrator can (future work) query the `runs` and `tasks` tables to identify `running` tasks that may have been interrupted by a crash. These can be re-queued or marked as failed depending on the policy.

## Migration

Database migrations are managed via `server/db/migrations/postgres/`.
See `2025-10-01_maestro_durable_store.sql` for the initial schema creation.
