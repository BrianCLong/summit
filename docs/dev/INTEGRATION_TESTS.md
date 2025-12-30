# Integration Tests

This repository includes optional integration tests that spin up real dependencies (e.g., PostgreSQL) using [Testcontainers](https://testcontainers.com/).

## Prerequisites

- Docker must be running on your machine.

## Running Integration Tests

Integration tests are skipped by default to keep the standard test suite fast and dependency-free.

To run them, set the `INTEGRATION_TESTS` environment variable to `1` and use the integration config:

```bash
INTEGRATION_TESTS=1 npx jest -c jest.integration.config.cjs
```

## CI Configuration

These tests are configured to run in a separate, optional CI job (or on a nightly schedule) to avoid slowing down PR builds.
