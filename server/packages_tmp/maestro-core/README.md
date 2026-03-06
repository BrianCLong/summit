# @intelgraph/maestro-core

> Durable workflow orchestration engine for IntelGraph.

Maestro Core is a robust DAG (Directed Acyclic Graph) execution engine designed for intelligence analysis workflows. It provides built-in support for retries, compensations, and crash-safe state persistence using PostgreSQL.

## Features

- **DAG Orchestration**: Execute complex dependency graphs with automatic parallelization.
- **Durable Persistence**: State, events, and task executions are transactionally saved to PostgreSQL.
- **Crash Recovery**: Automatically resumes active runs from the last successful step upon engine restart.
- **Outbox Pattern**: Reliable at-least-once event delivery to external message brokers.
- **Observability**: First-class OpenTelemetry integration for tracing and metrics.
- **Extensible Plugins**: Easy-to-implement plugin system for custom task types.

## Installation

```bash
pnpm add @intelgraph/maestro-core
```

## Quick Start

### 1. Initialize Postgres Store

```typescript
import { Pool } from "pg";
import { PostgresStateStore } from "@intelgraph/maestro-core";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const stateStore = new PostgresStateStore(pool);
```

### 2. Configure the Engine

```typescript
import { MaestroEngine } from "@intelgraph/maestro-core";

const engine = new MaestroEngine(
  stateStore,
  artifactStore, // S3 or Local
  policyEngine // OPA or Basic
);

// Resume any active runs from before a crash
await engine.recover();
```

### 3. Background Outbox Processing

To ensure events are reliably emitted, start the `OutboxProcessor` in your worker process:

```typescript
import { OutboxProcessor } from "@intelgraph/maestro-core";

const outbox = new OutboxProcessor(pool, {
  pollIntervalMs: 5000,
  maxRetries: 5,
  batchSize: 10,
});

outbox.start();
```

## Database Migrations

Maestro Core requires specific tables for durable state. Migrations are located in the `migrations/` directory of the package.

- `001_initial_schema.sql`: Basic workflow tracking.
- `002_durable_store.sql`: Events, outbox, and idempotency enhancements.

## License

MIT © IntelGraph Team
