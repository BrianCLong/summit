# Hermetic Test Principles

## Objective

Summit server tests must execute deterministically in CI by isolating environment state, enforcing
stable runtime defaults, and avoiding reliance on external services without explicit mocks.

## Environment Standards

- **Timezone**: All tests run with `TZ=UTC` to avoid locale and daylight-saving drift.
- **Node Environment**: `NODE_ENV=test` is enforced during test execution.
- **CI Consistency**: CI runs set `CI=true` and may enable test retries via
  `JEST_RETRY_TIMES=2` for known flaky surfaces.

## Isolation Guarantees

- Test setup restores `process.env` after every test to prevent leak-through.
- Timers are reset to real timers between tests; pending timers are cleared.
- Shared resources should be registered with `global.testCleanup` helpers to ensure cleanup.

## Hermetic Guidance

- Mock external APIs, databases, and queues unless explicitly running an integration test.
- Prefer event-driven waits (`global.testUtils.waitFor`) instead of timing-based assertions.
- Use `global.testUtils.retryWithBackoff` for retryable operations in tests that reach external
  infrastructure.

## CI Expectations

- CI workflows pin Node via `.nvmrc` and enforce deterministic env variables.
- Failed tests may retry (max 2) to reduce transient flake, with logs preserved.
