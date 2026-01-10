# Deterministic Test Chunking

## Overview

To maintain CI throughput within the 30-minute budget, tests are split into deterministic shards. This ensures parallel execution without race conditions or complex setup.

## Implementation

We use Jest's built-in Sharding feature (`--shard`).

```bash
jest --shard=1/2
jest --shard=2/2
```

## How it works

1.  **Shard 1/2**: Runs the first half of the tests (deterministically sorted by path).
2.  **Shard 2/2**: Runs the second half.

## Debugging Shards

If a test fails in a specific shard, you can reproduce it locally:

```bash
# Run Shard 1 of Unit Tests
pnpm test:unit -- --shard=1/2

# Run Shard 2 of Integration Tests
pnpm test:integration -- --shard=2/2
```

## Scaling

If tests become too slow, we can increase the shard count in `.github/workflows/ci.yml`:

```yaml
    strategy:
      matrix:
        test-suite: [unit, integration]
        shard: [1/4, 2/4, 3/4, 4/4]
```

And update the timeout budget accordingly.
