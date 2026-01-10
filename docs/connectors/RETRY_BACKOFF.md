# Retry & Backoff Policy Library

This module provides deterministic retry classification and backoff utilities for connectors. It is additive and does not change runtime behavior until wired into a connector.

## Key concepts

- **Deterministic jitter**: seeded PRNG ensures stable schedules for tests and replay.
- **Exponential backoff**: configurable base delay, factor, jitter ratio, and max delay.
- **Retry classification**: treats HTTP 429 and 5xx responses, transient network errors, and timeout messages as retryable.

## API surface

### `createDeterministicBackoff(plan?: BackoffPlanOptions)`

Returns a function that produces `{ attempt, delays }` snapshots as attempts advance. Options:

- `baseDelayMs` (default: `200`)
- `factor` (default: `2`)
- `maxDelayMs` (default: `30000`)
- `jitterRatio` (default: `0.3`, range `0-1`)
- `seed` (default: `'retry-seed'`)

Use `previewDelays(count, plan)` to inspect a deterministic sequence without mutating shared state.

### `createRetryPolicy(options?: RetryPolicyOptions)`

Builds a retry helper with:

- `maxAttempts` (default: `5`)
- `maxElapsedMs` (default: `60000`)
- `backoff` (for seeding/tuning backoff)

It exposes `shouldRetry(error, attempt, elapsedMs)` which returns a `RetryDecision` with `retry`, `delayMs`, and a machine-readable `reason`.

### `isRetryableError(error)`

Classifies errors as retryable when they contain:

- HTTP status `429` or any `5xx`
- Network error codes `ETIMEDOUT`, `ECONNRESET`, `ECONNABORTED`, `EAI_AGAIN`
- Messages containing `timeout`/`timed out`

## Usage example

```ts
import { createRetryPolicy } from "../../server/src/connectors/retry/policy.js";

const policy = createRetryPolicy({
  maxAttempts: 4,
  maxElapsedMs: 20_000,
  backoff: { baseDelayMs: 250, jitterRatio: 0.25, seed: "ci-fixed" },
});

const decision = policy.shouldRetry({ status: 429 }, 1, 0);
// { retry: true, delayMs: 257, reason: 'retryable' }
```

## Determinism & testing

- All jitter uses a seeded PRNG; the same seed yields identical sequences.
- Decisions capture machine-readable reasons to support harness assertions.
- The library is side-effect-free and does not wire into connectors by default.

## Non-goals

- No changes to connector implementations.
- No workflow/CI wiring in this PR.
