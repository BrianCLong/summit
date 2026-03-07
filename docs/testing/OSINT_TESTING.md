# OSINT Module Testing Documentation

This directory contains End-to-End (E2E) tests for the Open Source Intelligence (OSINT) modules of the platform, specifically focusing on the reporting and entity management workflows which are the primary outputs of OSINT activities.

## Test Suite Structure

- **`e2e/osint/reports.spec.ts`**: Main test suite covering:
  - OSINT Report Generation (HTML).
  - Visual Regression Testing (Snapshots).
  - Performance Benchmarking (Response time).
  - Concurrent/Parallel Execution.
- **`e2e/fixtures/osint-fixtures.ts`**: Reusable Playwright fixtures for:
  - Mocking external APIs (Wikipedia, RSS feeds).
  - Helper functions for Entity creation.

## Running Tests

To run the OSINT test suite specifically:

```bash
npx playwright test e2e/osint
```

To run with UI mode for debugging:

```bash
npx playwright test e2e/osint --ui
```

## Mocking Strategy

Since OSINT services rely heavily on external APIs (Twitter, Reddit, Whois, etc.), we use Playwright's network interception to mock these calls where applicable (if the frontend calls them directly).

For backend service calls, the current tests focus on the **outputs** (Reports, Entities) rather than mocking the internal Node.js `fetch` calls, as that requires a different layer of integration testing (e.g., Jest with MSW). The E2E tests verify that the system correctly generates artifacts given a simulated input.

## Visual Regression

Screenshots are stored in `e2e/osint/reports.spec.ts-snapshots/`. To update snapshots after a valid UI change:

```bash
npx playwright test e2e/osint --update-snapshots
```

## CI/CD Integration

The workflow `.github/workflows/e2e-osint.yml` automatically runs these tests on Pull Requests affecting OSINT-related files. It targets a coverage of key user flows.
