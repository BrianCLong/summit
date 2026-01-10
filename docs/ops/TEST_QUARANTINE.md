# Test Quarantine & CI Operator Guide

This document explains how to handle flaky tests, run the canonical test suite, and manage the quarantine system.

## Canonical Test Commands

The repository uses `pnpm` and `npm` scripts for testing. The primary test runner for the backend (`server/`) is **Jest**.

### Running Tests Locally

To run all server unit tests:
```bash
pnpm test:server
# OR
cd server && npm test
```

To run a specific test file:
```bash
cd server
npm test -- tests/path/to/test.ts
```

### Running the Quarantine Job

Quarantined tests are skipped in the main `npm test` run but executed in a separate CI job. To run them locally:

```bash
cd server
npm run test:quarantine
```

## Quarantine System

The quarantine system allows us to disable flaky tests in the main gate without deleting them. These tests are tracked and run separately to gather data on their failure rate.

### Quarantine List

The list is located at: `server/tests/quarantine/list.json`

Format:
```json
{
  "tests": [
    {
      "id": "Full Test Name › should do something",
      "reason": "Brief explanation of failure (e.g., Timeout, Race Condition)",
      "owner": "@team/alias",
      "addedAt": "YYYY-MM-DD",
      "expiresAt": "YYYY-MM-DD",
      "issue": "https://github.com/intelgraph/platform/issues/123"
    }
  ]
}
```

### Adding a Test to Quarantine

1.  Create a GitHub Issue describing the flake.
2.  Add an entry to `server/tests/quarantine/list.json` with the issue link and expiration date (max 30 days).
3.  The test name (`id`) must match exactly what Jest reports.

### Removing a Test from Quarantine

1.  Fix the root cause of the flake.
2.  Verify the fix locally by running the test multiple times (e.g., `npm test -- --repeat=10 path/to/test.ts`).
3.  Remove the entry from `server/tests/quarantine/list.json`.

## Common Failure Modes & Fixes

### Duplicate Metrics (prom-client)
**Symptom:** `Error: A metric with the name '...' has already been registered.`
**Fix:** Ensure `tests/setup/jest.setup.cjs` mocks `prom-client` correctly, or use `register.clear()` in `afterEach`.

### Open Handles / Timeouts
**Symptom:** `Jest did not exit one second after the test run has completed.`
**Fix:** Ensure all server instances, Redis clients, and database pools are closed in `afterAll` or `globalTeardown`. Use the `harness/index.ts` helpers.

### ESM / Module Resolution
**Symptom:** `SyntaxError: Cannot use import statement outside a module` or `Error [ERR_REQUIRE_ESM]`.
**Fix:** Ensure the file is using valid ESM syntax (import/export) if it's a `.ts` file, or CommonJS if required by legacy code. Check `jest.config.ts` for `transformIgnorePatterns`.

### Network Calls in Unit Tests
**Symptom:** `Nock: No match for request` or connection errors to localhost.
**Fix:** Unit tests must be hermetic. Mock `ioredis`, `pg`, and external APIs using the harness mocks.
