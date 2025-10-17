# Testing Strategy

The Liquid Nano pilot enforces strict automated quality gates to guarantee >80% coverage across unit, integration, and e2e layers.

## Tooling

- **Jest** (ts-jest ESM) for unit/integration tests.
- **Custom Jest Matchers** – `toBeIsoTimestamp` ensures timestamp integrity.
- **Coverage Thresholds** – 90% lines/statements, 85% functions, 80% branches.

## Test Suites

| Suite         | Scope                                                    |
| ------------- | -------------------------------------------------------- |
| Unit          | Runtime primitives (metrics registry, config loader).    |
| Integration   | HTTP bridge ingest path, plugin orchestration.           |
| E2E           | Example apps emitting telemetry and validating persistence.

Run the suites with:

```bash
npm run --workspace @summit/liquid-nano test:coverage
```

CI executes `npm run lint`, `npm run typecheck`, and `npm run test:coverage` to prevent regressions.

## Manual Validation

- Execute `examples/edge/http-bridge-demo.mjs` to send sample payloads against a running instance.
- Review generated coverage reports under `packages/liquid-nano/coverage/lcov-report/index.html`.
- Inspect diagnostics snapshots using `scripts/tests/print-diagnostics.mjs`.
