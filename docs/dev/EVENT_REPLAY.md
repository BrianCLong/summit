# Event Replay Runner

The Event Replay Runner is a deterministic tool for re-processing historical events through the system's event handlers and regenerating provenance trails. This is useful for:

- Auditing and verification
- Regression testing
- generating deterministic datasets for analysis

## Features

- **Deterministic Execution**: Mocks time (`Date.now()`) and randomness (`Math.random`) to ensure bit-for-bit identical output for the same seed and input.
- **In-Memory Execution**: Runs without a real database connection, simulating ledger operations in memory.
- **Provenance Validation**: Verifies that the sequence of events produces a valid hash chain in the provenance ledger.

## Usage

### 1. Prepare Input Data

Create a JSONL file (newline-delimited JSON) containing the sequence of events to replay.

```json
{"type": "ORDER_CREATED", "timestamp": "2023-01-01T10:00:00Z", "payload": {...}, "actor": "user_1", "tenantId": "tenant_A"}
{"type": "PAYMENT_RECEIVED", "timestamp": "2023-01-01T10:05:00Z", "payload": {...}, "actor": "system", "tenantId": "tenant_A"}
```

### 2. Run Replay

Use the `replayEvents` function in a script or test:

```typescript
import { replayEvents } from "server/src/replay/run-events";

const result = await replayEvents("path/to/events.jsonl", {
  seed: 12345,
  startTime: 1672531200000, // Optional start timestamp
});

console.log(`Processed ${result.processedCount} events`);
console.log(`Generated ${result.rows.length} ledger entries`);
```

### 3. Verification

The runner returns the state of the simulated ledger (`result.rows`). You can assert against this state to verify:

- Correct number of entries
- Correct `actionType` and `resourceType` sequences
- Valid hash chaining (`previous_hash` matches `current_hash` of previous entry)

## Architecture

- **`run-events.ts`**: Main entry point. Sets up mocks, reads input stream, and iterates through events.
- **`handlers.ts`**: Maps event types to `provenanceLedger.appendEntry` calls.
- **`MockPool`**: Simulates a PostgreSQL connection pool, intercepting `INSERT` and `SELECT` queries for the provenance ledger.

## Testing

The replay runner is tested in `server/src/replay/__tests__/run-events.test.ts`, ensuring determinism and correct handling of sample event flows.
