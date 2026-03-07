# Connector Replay Simulator

The Connector Replay Simulator is a tool for testing the idempotency and resilience of receipt ingestion logic without requiring a full database or queue infrastructure.

## Usage

The tool is a CLI script located at `tools/replay-receipt.ts`. It accepts a receipt JSON file and simulation parameters.

```bash
npx tsx tools/replay-receipt.ts --input <path-to-receipt.json> [options]
```

### Options

- `--input`, `-i` (required): Path to the JSON receipt file.
- `--times`, `-n` (optional): Number of times to replay the receipt (default: 1).
- `--seed`, `-s` (optional): Seed for deterministic pseudo-random behavior (default: 0).

## Output

The tool outputs a JSON summary of the simulation run:

```json
{
  "times": 5,
  "persistedCount": 1,
  "dedupedCount": 4,
  "errors": []
}
```

## Simulation Logic

The simulator maintains an in-memory "database" of persisted receipt IDs for the duration of the run.

1.  On the first encounter of a receipt ID, it "persists" it (increments `persistedCount`).
2.  On subsequent encounters, it detects a duplicate and increments `dedupedCount`.
3.  The `--seed` argument ensures that any random jitter or simulated network failures (if enabled) are deterministic across runs.
