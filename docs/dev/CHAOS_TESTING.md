# Chaos Testing Harness

This repository ships a deterministic chaos harness that can be used to inject
faults into ingestion and queue-like pathways without relying on flaky timing
or non-deterministic failures.

## What the harness provides

- **Seeded fault injector** (`test/utils/faultInjector.ts`) that maps a
  user-provided seed and a named scenario to a stable sequence of injected
  errors.
- **Scenario coverage**:
  - `transient-timeout`: injects a single timeout-style failure and then
    recovers, allowing retry logic to proceed.
  - `permanent-failure`: injects a hard failure on every call so that stable
    error codes and provenance logging can be validated.
- **Provenance flagging** via `CHAOS_PROVENANCE_LOGS=true` to emit breadcrumb
  entries when chaos is enabled.

## How to run the chaos tests

From the repository root:

```bash
# Run only the chaos ingestion harness tests (ESM-friendly)
NODE_OPTIONS=--experimental-vm-modules \
  npm test -- --runTestsByPath tests/ingest/chaosHarness.test.ts
```

The tests are fully deterministic; re-running with the same seed and scenario
will produce the same fault schedule every time.

## Extending scenarios

1. Add a new scenario label to `test/utils/faultInjector.ts`.
2. Encode any deterministic scheduling logic required for that scenario.
3. Add a focused test case demonstrating the expected behavior and the
   resulting metrics/error codes.
