# E2E Testing Suite

End-to-end testing framework for Summit/IntelGraph using Playwright.

## Quick Start

```bash
# Install Playwright browsers
pnpm exec playwright install --with-deps

# Run all E2E tests
pnpm e2e

# Run with UI mode
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test dashboard-comprehensive.spec.ts

# Debug tests
pnpm exec playwright test --debug
```

## Test Structure

```
tests/e2e/
├── fixtures/           # Reusable test utilities
├── utils/              # Helper functions
├── .auth/              # Saved authentication states
├── __screenshots__/    # Visual regression baselines
├── *.spec.ts           # Test files
└── playwright.config.ts
```

## Writing Tests

### Basic Example

```typescript
import { test, expect } from '@playwright/test';
import { investigationFixtures } from './fixtures';

test('should load investigation', async ({ page }) => {
  await investigationFixtures.goToInvestigation(
    page,
    'demo-investigation-001',
  );
  await expect(page.locator('[data-testid="cytoscape-graph"]')).toBeVisible();
});
```

### Using Fixtures

```typescript
import {
  dashboardFixtures,
  copilotFixtures,
  entityFixtures,
  waitUtils,
} from './fixtures';

test('complete workflow', async ({ page }) => {
  // Navigate to dashboard
  await dashboardFixtures.goToDashboard(page);

  // Create entity
  await entityFixtures.createEntity(page, {
    name: 'Test Entity',
    type: 'Person',
  });

  // Ask copilot question
  await copilotFixtures.openCopilot(page);
  const response = await copilotFixtures.askQuestion(
    page,
    'What connections exist?',
  );

  // Verify response
  expect(response).toContain('Test Entity');
});
```

## Available Fixtures

### Investigation Fixtures

```typescript
// Create investigation
const { investigationId } = await investigationFixtures.createInvestigation(page, {
  name: 'My Investigation',
});

// Navigate to investigation
await investigationFixtures.goToInvestigation(page, investigationId);

// Use demo investigation
const demoId = investigationFixtures.demoInvestigation.id;
```

### Entity & Relationship Fixtures

```typescript
// Create entity
await entityFixtures.createEntity(page, {
  name: 'Alice',
  type: 'Person',
});

// Create relationship
await relationshipFixtures.createRelationship(page, {
  sourceEntityId: 'entity-1',
  targetEntityId: 'entity-2',
  type: 'works_with',
});
```

### Copilot Fixtures

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
```

### Graph Fixtures

```typescript
// Change layout
await graphFixtures.changeLayout(page, 'force');

// Zoom
await graphFixtures.zoom(page, 'in');

// Filter by type
await graphFixtures.filterByType(page, 'Person');
```

### Authentication Fixtures

```typescript
// Login as specific role
await authFixtures.loginAs(page, 'admin');
await authFixtures.loginAs(page, 'analyst');
await authFixtures.loginAs(page, 'viewer');

// Logout
await authFixtures.logout(page);
```

## Authentication

Tests use pre-authenticated sessions for speed. Auth states are saved in `.auth/` directory.

### Re-authenticate

```bash
# Clear auth states
rm -rf tests/e2e/.auth/*.json

# Re-run auth setup
pnpm exec playwright test server/tests/e2e/auth.setup.ts
```

### Test with Different Roles

```typescript
import { test } from './utils/auth-helpers';

// Use role-specific pages
test('admin feature', async ({ adminPage }) => {
  await adminPage.goto('/admin');
});

test('analyst feature', async ({ analystPage }) => {
  await analystPage.goto('/investigations');
});
```

## Visual Regression Testing

### Take Screenshots

```typescript
test('dashboard appearance', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

### Update Baselines

```bash
# Update all screenshots
pnpm exec playwright test --update-snapshots

# Update specific test
pnpm exec playwright test visual-regression.spec.ts --update-snapshots
```

## Debugging

```bash
# Run with Playwright Inspector
pnpm exec playwright test --debug

# Run in headed mode
pnpm exec playwright test --headed

# Enable verbose logging
DEBUG=pw:api pnpm exec playwright test

# Pause on failure
pnpm exec playwright test --pause-on-failure
```

## CI/CD

Tests run in CI with parallelization:

```yaml
# 4-way sharding for faster execution
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]
```

### Environment Variables

```bash
CI=true                # Enable CI mode
E2E_WORKERS=4          # Parallel workers
SHARD_INDEX=1          # Shard number
SHARD_TOTAL=4          # Total shards
BASE_URL=http://localhost:3000
```

## Best Practices

### ✅ DO

- Use `data-testid` for selectors
- Use fixtures for common operations
- Wait for elements to be ready
- Test error scenarios
- Clean up after tests
- Use meaningful test names

### ❌ DON'T

- Use CSS class selectors
- Use hard-coded `waitForTimeout`
- Leave `.only()` in committed code
- Skip tests without good reason
- Commit without running tests locally

## Common Commands

```bash
# Run all tests
pnpm e2e

# Run specific file
pnpm exec playwright test dashboard.spec.ts

# Run tests matching pattern
pnpm exec playwright test -g "dashboard"

# Run in specific browser
pnpm exec playwright test --project=chromium-desktop

# Run with trace
pnpm exec playwright test --trace on

# Show report
pnpm exec playwright show-report

# Run in watch mode
pnpm exec playwright test --watch
```

## Test Categories

- **Smoke Tests**: Critical golden path (`smoke.spec.ts`)
- **Feature Tests**: Comprehensive coverage (`dashboard-comprehensive.spec.ts`)
- **Visual Tests**: UI consistency (`visual-regression.spec.ts`)
- **Accessibility**: WCAG compliance (`accessibility.spec.ts`)
- **Performance**: Load times and responsiveness

## Troubleshooting

### Tests Failing Locally

1. Ensure services are running: `make up`
2. Clear auth states: `rm -rf .auth/*.json`
3. Re-run auth setup
4. Check logs: `make logs`

### Flaky Tests

1. Check for race conditions
2. Use Playwright's auto-waiting
3. Avoid `waitForTimeout`
4. Use `toPass()` for retry logic

### Screenshot Diffs

1. Review changes: `pnpm exec playwright show-report`
2. Update baselines if correct: `pnpm exec playwright test --update-snapshots`
3. Mask dynamic content

## Resources

- 📖 [Full E2E Testing Guide](../../docs/E2E_TESTING.md)
- 🔧 [Fixtures Source](./fixtures/index.ts)
- 🔐 [Auth Helpers](./utils/auth-helpers.ts)
- 🎭 [Playwright Docs](https://playwright.dev/)
- 🏃 [CI Configuration](../../.github/workflows/ci.yml)

## Support

For questions or issues:
1. Check the [full documentation](../../docs/E2E_TESTING.md)
2. Review existing test examples
3. Ask the team in #engineering
4. Open an issue with test failure logs
