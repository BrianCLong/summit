# Playwright E2E Tests

This directory contains End-to-End tests for the Summit platform using [Playwright](https://playwright.dev).

## Directory Structure

- `fixtures/`: Test data and fixtures (auth, page objects).
- `page-objects/`: Page Object Model implementation.
- `tests/`: Test specifications.
- `utils/`: Helper functions.

## Prerequisites

- Node.js 18+
- pnpm

## Running Tests

### Locally

1.  Start the application stack (e.g., `make up` or `npm run dev`).
2.  Run tests:

```bash
# Run all tests
npx playwright test

# Run a specific test file
npx playwright test e2e/tests/agent-session.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui
```

### CI/CD

Tests run automatically on Pull Requests (Smoke suite) and Nightly (Full suite) via GitHub Actions.

## Writing New Tests

1.  Create a new Page Object in `page-objects/` if needed.
2.  Use `fixtures/auth.fixture.ts` to access authenticated pages.
3.  Write test spec in `tests/` following the Given-When-Then pattern.

## Debugging

- Use `await page.pause()` to inspect the browser state.
- Check screenshots and videos in `playwright-report/` after a failure.
