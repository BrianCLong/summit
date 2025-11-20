# End-to-End Testing Guide for Summit/IntelGraph

> **Last Updated**: 2025-11-20
> **Purpose**: Comprehensive guide for writing, running, and maintaining E2E tests

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Organization](#test-organization)
4. [Writing Tests](#writing-tests)
5. [Authentication](#authentication)
6. [Test Fixtures](#test-fixtures)
7. [Visual Regression Testing](#visual-regression-testing)
8. [Running Tests](#running-tests)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Topics](#advanced-topics)

---

## Overview

Summit uses **Playwright** for end-to-end testing, providing:

- ✅ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ✅ Parallel execution with sharding
- ✅ Visual regression testing
- ✅ Accessibility testing
- ✅ Performance monitoring
- ✅ Mobile and responsive testing
- ✅ Network interception and mocking
- ✅ Authentication state management

### Key Principles

1. **Golden Path First**: Always maintain the critical user journey (Investigation → Entities → Relationships → Copilot → Results)
2. **Reliable & Fast**: Tests should be deterministic and run quickly
3. **Maintainable**: Use fixtures and utilities to reduce code duplication
4. **Comprehensive**: Cover happy paths, edge cases, and error scenarios
5. **CI-First**: Tests must pass in CI before merging

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install --with-deps
```

### Running Tests Locally

```bash
# Run all E2E tests
pnpm e2e

# Run specific test file
pnpm exec playwright test tests/e2e/dashboard-comprehensive.spec.ts

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run tests with debugging
pnpm exec playwright test --debug

# Run tests in specific browser
pnpm exec playwright test --project=chromium-desktop

# Run tests and update screenshots
pnpm exec playwright test --update-snapshots
```

### Running with UI Mode

```bash
# Open Playwright UI for interactive testing
pnpm exec playwright test --ui
```

---

## Test Organization

```
tests/e2e/
├── fixtures/
│   └── index.ts                    # Centralized test fixtures
├── utils/
│   └── auth-helpers.ts             # Authentication utilities
├── .auth/                          # Saved authentication states
│   ├── admin.json
│   ├── analyst.json
│   ├── viewer.json
│   └── operator.json
├── __screenshots__/                # Visual regression baselines
├── playwright.config.ts            # Playwright configuration
├── global-setup.ts                 # Global test setup
├── global-teardown.ts              # Global test cleanup
│
├── dashboard-comprehensive.spec.ts # Dashboard tests
├── visual-regression.spec.ts       # Visual regression tests
├── smoke.spec.ts                   # Critical path smoke tests
├── accessibility.spec.ts           # Accessibility tests
└── [feature].spec.ts               # Feature-specific tests
```

### Test Categories

1. **Smoke Tests** (`smoke.spec.ts`): Critical golden path validation
2. **Feature Tests**: Comprehensive feature coverage
3. **Visual Regression** (`visual-regression.spec.ts`): UI consistency checks
4. **Accessibility** (`accessibility.spec.ts`): WCAG compliance
5. **Performance**: Load time and responsiveness benchmarks

---

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { investigationFixtures, copilotFixtures } from './fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform expected action', async ({ page }) => {
    // Arrange
    await investigationFixtures.goToInvestigation(page, 'demo-investigation-001');

    // Act
    await copilotFixtures.openCopilot(page);

    // Assert
    await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test (optional)
  });
});
```

### Using Test Fixtures

Summit provides comprehensive fixtures for common operations:

```typescript
import {
  investigationFixtures,
  entityFixtures,
  relationshipFixtures,
  copilotFixtures,
  dashboardFixtures,
  graphFixtures,
  waitUtils,
  authFixtures,
} from './fixtures';

test('create investigation with entities', async ({ page }) => {
  // Create investigation
  const { investigationId } = await investigationFixtures.createInvestigation(page, {
    name: 'Test Investigation',
    description: 'Test description',
  });

  // Add entity
  await entityFixtures.createEntity(page, {
    name: 'Test Person',
    type: 'Person',
    properties: { role: 'Analyst' },
  });

  // Add relationship
  await relationshipFixtures.createRelationship(page, {
    sourceEntityId: 'entity-1',
    targetEntityId: 'entity-2',
    type: 'works_with',
  });

  // Verify graph updated
  await waitUtils.waitForGraph(page);
});
```

### Data-Driven Testing

```typescript
const testCases = [
  { entityType: 'Person', expectedIcon: 'person-icon' },
  { entityType: 'Organization', expectedIcon: 'org-icon' },
  { entityType: 'Location', expectedIcon: 'location-icon' },
];

for (const testCase of testCases) {
  test(`should show correct icon for ${testCase.entityType}`, async ({ page }) => {
    await entityFixtures.createEntity(page, {
      name: `Test ${testCase.entityType}`,
      type: testCase.entityType,
    });

    const icon = page.locator(`[data-testid="entity-icon"]`);
    await expect(icon).toHaveClass(new RegExp(testCase.expectedIcon));
  });
}
```

---

## Authentication

### Setting Up Authentication

Authentication is handled via setup projects that run before tests:

```typescript
// server/tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';
import { loginAsRole, saveAuthState } from '../../../tests/e2e/utils/auth-helpers';

setup('authenticate as analyst', async ({ page, context }) => {
  await loginAsRole(page, 'analyst');
  await saveAuthState(context, 'analyst');
});
```

### Using Authenticated Sessions

```typescript
// Use default authenticated session (analyst)
test('should access protected route', async ({ page }) => {
  await page.goto('/investigations');
  // Already authenticated as analyst
});

// Use specific role
import { test, expect } from './utils/auth-helpers';

test('admin only feature', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.locator('h1')).toContainText('Admin');
});
```

### Testing Different Roles

```typescript
test.describe('Role-based access', () => {
  test('admin can access admin panel', async ({ page }) => {
    await authFixtures.loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Admin Panel');
  });

  test('viewer cannot create investigations', async ({ page }) => {
    await authFixtures.loginAs(page, 'viewer');
    await page.goto('/investigations');

    const createButton = page.locator('[data-testid="create-investigation-button"]');
    await expect(createButton).toBeDisabled();
  });

  test('analyst can create investigations', async ({ page }) => {
    await authFixtures.loginAs(page, 'analyst');
    await page.goto('/investigations');

    const createButton = page.locator('[data-testid="create-investigation-button"]');
    await expect(createButton).toBeEnabled();
  });
});
```

---

## Test Fixtures

### Available Fixtures

#### Investigation Fixtures

```typescript
// Create investigation
const { investigationId } = await investigationFixtures.createInvestigation(page, {
  name: 'My Investigation',
  description: 'Description',
  classification: 'UNCLASSIFIED',
});

// Navigate to investigation
await investigationFixtures.goToInvestigation(page, investigationId);

// Use demo investigation
const demoId = investigationFixtures.demoInvestigation.id;
```

#### Entity Fixtures

```typescript
// Create entity
await entityFixtures.createEntity(page, {
  name: 'Alice Chen',
  type: 'Person',
  properties: { role: 'Manager' },
});

// Select entity
await entityFixtures.selectEntity(page, 'entity-id');

// Available entity types
const types = entityFixtures.types; // ['Person', 'Organization', ...]
```

#### Copilot Fixtures

```typescript
// Open copilot
await copilotFixtures.openCopilot(page);

// Ask question
const response = await copilotFixtures.askQuestion(
  page,
  'What connects Alice to Bob?',
);

// Verify citations
await copilotFixtures.verifyResponseCitations(page, ['alice-001', 'bob-002']);

// Verify why paths
await copilotFixtures.verifyWhyPaths(page, ['edge-1', 'edge-2']);
```

#### Graph Fixtures

```typescript
// Change layout
await graphFixtures.changeLayout(page, 'force');

// Zoom
await graphFixtures.zoom(page, 'in');

// Filter
await graphFixtures.filterByType(page, 'Person');

// Search
await graphFixtures.searchEntity(page, 'Alice');
```

---

## Visual Regression Testing

### Taking Screenshots

```typescript
test('dashboard appearance', async ({ page }) => {
  await page.goto('/dashboard');

  // Take screenshot and compare with baseline
  await expect(page).toHaveScreenshot('dashboard.png', {
    threshold: 0.2, // 20% difference tolerance
    maxDiffPixels: 100,
  });
});
```

### Masking Dynamic Content

```typescript
test('investigation graph', async ({ page }) => {
  await page.goto('/investigations/demo-001');

  // Mask timestamps and other dynamic elements
  await expect(page).toHaveScreenshot('graph.png', {
    mask: [
      page.locator('[data-testid*="timestamp"]'),
      page.locator('[data-testid*="activity-feed"]'),
    ],
  });
});
```

### Updating Baselines

```bash
# Update all screenshots
pnpm exec playwright test --update-snapshots

# Update specific test screenshots
pnpm exec playwright test visual-regression.spec.ts --update-snapshots
```

### Visual Testing Best Practices

1. **Hide Dynamic Content**: Mask timestamps, activity feeds, real-time data
2. **Use Consistent Data**: Use demo/fixture data for predictable results
3. **Disable Animations**: Set `animations: 'disabled'` in config
4. **Test Multiple Viewports**: Cover mobile, tablet, and desktop
5. **Review Changes**: Always review visual diffs before updating baselines

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm e2e

# Run specific test file
pnpm exec playwright test dashboard-comprehensive.spec.ts

# Run tests matching pattern
pnpm exec playwright test -g "dashboard"

# Run in headed mode
pnpm exec playwright test --headed

# Run with specific browser
pnpm exec playwright test --project=chromium-desktop

# Run with debugging
pnpm exec playwright test --debug

# Run and show report
pnpm exec playwright test && pnpm exec playwright show-report
```

### Watch Mode

```bash
# Run tests in watch mode (reruns on file changes)
pnpm exec playwright test --watch
```

### Debugging Tests

```bash
# Open Playwright Inspector
pnpm exec playwright test --debug

# Pause on failure
pnpm exec playwright test --pause-on-failure

# Run with verbose logging
DEBUG=pw:api pnpm exec playwright test
```

### Viewing Test Reports

```bash
# Open HTML report
pnpm exec playwright show-report

# Generate and open report
pnpm exec playwright test --reporter=html && pnpm exec playwright show-report
```

---

## CI/CD Integration

### GitHub Actions Workflow

E2E tests run in CI with parallelization and sharding:

```yaml
# .github/workflows/ci.yml
e2e-tests:
  name: E2E Tests (Shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
  strategy:
    matrix:
      shardIndex: [1, 2, 3, 4]
      shardTotal: [4]
  steps:
    - name: Run E2E tests
      run: |
        cd tests/e2e
        pnpm exec playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

### Parallelization

Tests are automatically parallelized based on environment:

- **Local**: Uses 50% of CPU cores
- **CI**: Configurable via `E2E_WORKERS` environment variable
- **Sharding**: Distributes tests across multiple machines

### Environment Variables

```bash
# CI environment
CI=true                    # Enables CI-specific behavior
E2E_WORKERS=4              # Number of parallel workers
SHARD_INDEX=1              # Current shard (1-based)
SHARD_TOTAL=4              # Total number of shards

# Authentication
E2E_ADMIN_PASSWORD=xxx     # Admin test user password
E2E_ANALYST_PASSWORD=xxx   # Analyst test user password

# Application URLs
BASE_URL=http://localhost:3000

# Test configuration
E2E_AUTH_REQUIRED=true     # Require authentication
SEED_TEST_DATA=true        # Seed test data via API
```

---

## Best Practices

### 1. Use Data Test IDs

Always use `data-testid` attributes for selectors:

```typescript
// ✅ Good
await page.click('[data-testid="create-investigation-button"]');

// ❌ Bad
await page.click('button.btn-primary');
```

### 2. Wait for Stability

Wait for elements to be ready before interacting:

```typescript
// ✅ Good
await expect(page.locator('[data-testid="graph"]')).toBeVisible();
await page.click('[data-testid="entity"]');

// ❌ Bad
await page.click('[data-testid="entity"]'); // May not be ready
```

### 3. Use Page Object Model

Encapsulate page logic in fixtures:

```typescript
// ✅ Good
await investigationFixtures.createInvestigation(page, { name: 'Test' });

// ❌ Bad
await page.click('[data-testid="create-button"]');
await page.fill('[data-testid="name"]', 'Test');
await page.click('[data-testid="submit"]');
```

### 4. Avoid Hard-Coded Waits

Use Playwright's auto-waiting instead of `waitForTimeout`:

```typescript
// ✅ Good
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ❌ Bad
await page.waitForTimeout(3000);
```

### 5. Clean Up After Tests

Ensure tests clean up resources:

```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data if necessary
  await page.evaluate(() => localStorage.clear());
});
```

### 6. Test Error Scenarios

Don't just test happy paths:

```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Mock API error
  await page.route('**/api/investigations', (route) =>
    route.fulfill({ status: 500 }),
  );

  await page.goto('/investigations');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```

### 7. Use Meaningful Test Names

```typescript
// ✅ Good
test('should display validation error when investigation name is empty', async ({
  page,
}) => {});

// ❌ Bad
test('test1', async ({ page }) => {});
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await someLongOperation();
});
```

#### Flaky Tests

```typescript
// Use retry logic
test('potentially flaky', async ({ page }) => {
  test.info().annotations.push({ type: 'issue', description: 'Flaky test' });

  await expect(async () => {
    await page.reload();
    await expect(page.locator('[data-testid="data"]')).toBeVisible();
  }).toPass({ timeout: 10000 });
});
```

#### Authentication Issues

```bash
# Clear saved auth states and re-authenticate
rm -rf tests/e2e/.auth/*.json

# Re-run auth setup
pnpm exec playwright test server/tests/e2e/auth.setup.ts
```

#### Screenshot Diffs

```bash
# View visual diffs
pnpm exec playwright show-report

# Update baselines if changes are expected
pnpm exec playwright test --update-snapshots
```

### Debug Mode

```bash
# Run with Playwright Inspector
pnpm exec playwright test --debug

# Run with browser console logs
pnpm exec playwright test --headed --trace on
```

### Verbose Logging

```bash
# Enable debug logging
DEBUG=pw:api pnpm exec playwright test

# Enable all Playwright debug logs
DEBUG=pw:* pnpm exec playwright test
```

---

## Advanced Topics

### Network Interception

```typescript
test('should handle offline mode', async ({ page }) => {
  // Go offline
  await page.context().setOffline(true);

  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();

  // Go back online
  await page.context().setOffline(false);
});
```

### Mocking API Responses

```typescript
test('should display mocked data', async ({ page }) => {
  await page.route('**/api/investigations', (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        investigations: [{ id: '1', name: 'Mock Investigation' }],
      }),
    }),
  );

  await page.goto('/investigations');
  await expect(page.locator('text=Mock Investigation')).toBeVisible();
});
```

### Performance Testing

```typescript
import { perfUtils } from './fixtures';

test('dashboard performance', async ({ page }) => {
  const { loadTime } = await perfUtils.measurePageLoad(page, '/dashboard');

  expect(loadTime).toBeLessThan(3000); // Load in < 3s

  console.log(`Dashboard loaded in ${loadTime}ms`);
});
```

### Accessibility Testing

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('dashboard accessibility', async ({ page }) => {
  await page.goto('/dashboard');

  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

### Mobile Testing

```typescript
test('mobile dashboard', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/dashboard');

  // Verify mobile-specific UI
  const mobileMenu = page.locator('[data-testid="mobile-menu"]');
  await expect(mobileMenu).toBeVisible();
});
```

### Custom Fixtures

```typescript
// Define custom fixture
import { test as base } from '@playwright/test';

type MyFixtures = {
  customHelper: string;
};

export const test = base.extend<MyFixtures>({
  customHelper: async ({}, use) => {
    const helper = 'custom value';
    await use(helper);
  },
});

// Use in tests
test('using custom fixture', async ({ page, customHelper }) => {
  console.log(customHelper); // 'custom value'
});
```

---

## Quick Reference

### Common Commands

```bash
# Run all tests
pnpm e2e

# Run specific test
pnpm exec playwright test dashboard.spec.ts

# Run in UI mode
pnpm exec playwright test --ui

# Debug tests
pnpm exec playwright test --debug

# Update snapshots
pnpm exec playwright test --update-snapshots

# Show report
pnpm exec playwright show-report

# Run with specific browser
pnpm exec playwright test --project=chromium

# Run tests matching pattern
pnpm exec playwright test -g "dashboard"
```

### Useful Locators

```typescript
// By test ID (preferred)
page.locator('[data-testid="button"]');

// By text
page.locator('text=Sign In');

// By role
page.getByRole('button', { name: 'Submit' });

// By label
page.getByLabel('Email');

// By placeholder
page.getByPlaceholder('Enter email');

// Chaining
page.locator('[data-testid="form"]').locator('button');
```

### Common Assertions

```typescript
// Visibility
await expect(page.locator('[data-testid="element"]')).toBeVisible();
await expect(page.locator('[data-testid="element"]')).toBeHidden();

// Text content
await expect(page.locator('h1')).toContainText('Dashboard');
await expect(page.locator('h1')).toHaveText('Dashboard');

// Attributes
await expect(page.locator('button')).toBeEnabled();
await expect(page.locator('button')).toBeDisabled();
await expect(page.locator('input')).toHaveValue('test');

// Count
await expect(page.locator('.item')).toHaveCount(5);

// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/investigations\/\d+/);

// Screenshots
await expect(page).toHaveScreenshot('page.png');
```

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Fixtures](/tests/e2e/fixtures/index.ts)
- [Auth Helpers](/tests/e2e/utils/auth-helpers.ts)
- [CI Configuration](/.github/workflows/ci.yml)
- [Golden Path Tests](/e2e/client/golden-path.spec.ts)

---

## Contributing

When adding new E2E tests:

1. ✅ Use existing fixtures when possible
2. ✅ Add new fixtures for reusable functionality
3. ✅ Follow naming conventions (`feature-name.spec.ts`)
4. ✅ Include test descriptions in `test.describe` blocks
5. ✅ Add `data-testid` attributes to new UI elements
6. ✅ Ensure tests pass locally before committing
7. ✅ Update this documentation if adding new patterns

---

**Last Updated**: 2025-11-20
**Maintained By**: Engineering Team
