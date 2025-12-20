# Playwright E2E Testing Guide

## Overview

This directory contains End-to-End (E2E) tests for the Summit platform using Playwright. These tests ensure critical user workflows are functioning correctly from the user's perspective.

## Structure

- **`e2e/tests/`**: Contains the test specifications (`.spec.ts`).
- **`e2e/support/pages/`**: Page Object Models (POM) representing pages and components.
- **`playwright.config.ts`**: Configuration for Playwright.

## Running Tests

### Prerequisites

Ensure the development environment is running:

```bash
make up
```

### Run All Tests

```bash
pnpm test:e2e
```

### Run Specific Test

```bash
pnpm test:e2e e2e/tests/agent-lifecycle.spec.ts
```

### UI Mode (Interactive)

```bash
npx playwright test --ui
```

## Writing Tests

### Page Object Model

We strictly follow the Page Object Model pattern. Each page or significant component should have a corresponding class in `e2e/support/pages/`.

Example:

```typescript
// e2e/support/pages/my-feature.page.ts
export class MyFeaturePage extends BasePage {
  constructor(page: Page) {
    super(page);
    // locators
  }

  async performAction() {
    // action
  }
}
```

### Mocking

To ensure determinism and speed, we mock backend API calls where appropriate, especially for complex or long-running operations like AI agent execution. Use `page.route()` to intercept and mock network requests.

### Best Practices

- **Isolation**: Each test should be independent. Use `test.beforeEach` to set up state.
- **Selectors**: Prefer user-facing selectors like `getByRole` or `getByText`. Use `data-testid` as a fallback.
- **Assertions**: Use web-first assertions (e.g., `await expect(locator).toBeVisible()`).

## Maintenance

- **Flaky Tests**: If a test is flaky, investigate if it's due to timing (use `await expect` auto-retries) or state leakage.
- **Visual Regression**: Screenshots are stored in `tests/e2e/__snapshots__`. Update them with `--update-snapshots` if intentional UI changes occur.
