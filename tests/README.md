# IntelGraph Test Suite

This directory contains the comprehensive test suite for the IntelGraph platform.

## Directory Structure

```
tests/
├── factories/           # Test data factories
│   ├── userFactory.ts
│   ├── entityFactory.ts
│   ├── relationshipFactory.ts
│   ├── investigationFactory.ts
│   ├── graphFactory.ts
│   ├── requestFactory.ts
│   └── contextFactory.ts
├── integration/         # Integration tests
│   ├── auth.integration.test.ts
│   ├── graphql.integration.test.ts
│   ├── graph-analysis.integration.test.ts
│   └── data-import-export.integration.test.ts
└── e2e/                # End-to-end tests
    ├── login-logout.spec.ts
    ├── graph-visualization.spec.ts
    └── data-querying.spec.ts
```

## Test Factories

Test factories provide consistent, reusable test data generation. Import and use them in your tests:

```typescript
import {
  userFactory,
  entityFactory,
  investigationFactory,
  graphFactory,
} from '../tests/factories';

// Create test data
const user = userFactory({ role: 'admin' });
const entity = entityFactory({ type: 'person' });
const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });
```

### Available Factories

- **userFactory**: Generate test users with various roles and permissions
- **entityFactory**: Create graph entities (person, organization, IP, domain, etc.)
- **relationshipFactory**: Create graph relationships between entities
- **investigationFactory**: Generate investigation test data
- **graphFactory**: Create complete graph structures with nodes and relationships
- **requestFactory/responseFactory**: Mock HTTP requests and responses
- **contextFactory**: Create GraphQL execution contexts

## Integration Tests

Integration tests verify that multiple components work together correctly. They use real database connections and test realistic workflows.

### Running Integration Tests

```bash
pnpm run test:integration
```

### Writing Integration Tests

```typescript
import { authenticatedContextFactory } from '../tests/factories/contextFactory';
import { graphFactory } from '../tests/factories/graphFactory';

describe('Graph Analysis Integration', () => {
  it('should find shortest path between nodes', async () => {
    const graph = graphFactory({ nodeCount: 10 });
    // Test graph analysis logic
  });
});
```

## E2E Tests

End-to-end tests validate complete user flows using Playwright.

### Running E2E Tests

```bash
pnpm run test:e2e
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## Test Coverage

We maintain high test coverage standards:

- **Global minimum**: 80%
- **Critical paths**: 85% (middleware, resolvers, core services)

### View Coverage

```bash
pnpm run test:coverage
open coverage/lcov-report/index.html
```

## GraphQL Schema Testing

The platform includes comprehensive GraphQL schema validation tests to ensure API contract integrity and backward compatibility. See `tests/unit/graphql_schema.test.ts` for the full test suite.

### What We Test

1. **Schema Validity**: Ensure schema is valid GraphQL
2. **Type Definitions**: All types are properly defined with correct fields
3. **Field Types**: Fields have correct types and nullability
4. **Arguments**: Queries and mutations have correct arguments with proper defaults
5. **Enums**: Enum values are properly defined and follow conventions
6. **Input Types**: Input type validation for mutations
7. **Security**: No sensitive information exposed in schema
8. **Performance**: Pagination support and reasonable limits
9. **Backward Compatibility**: Breaking changes are caught early
10. **Type Relationships**: Consistent use of ID types and foreign keys

### Example Schema Tests

```typescript
// Test field types
it('should have id field with ID! type', () => {
  const type = schema.getType('Runbook');
  expect(type.getFields().id.type.toString()).toBe('ID!');
});

// Test enum values
it('should have all expected enum values', () => {
  const runStateEnum = schema.getType('RunState');
  const values = runStateEnum.getValues().map(v => v.name);
  expect(values).toContain('QUEUED');
  expect(values).toContain('RUNNING');
});

// Test argument validation
it('should have limit argument with default value', () => {
  const queryType = schema.getType('Query');
  const runbooksField = queryType.getFields().runbooks;
  const limitArg = runbooksField.args.find(arg => arg.name === 'limit');
  expect(limitArg.defaultValue).toBe(50);
});

// Test backward compatibility
it('should not remove required fields (breaking change)', () => {
  const type = schema.getType('Runbook');
  const requiredFields = ['id', 'name', 'version'];
  requiredFields.forEach(field => {
    expect(type.getFields()[field]).toBeDefined();
  });
});
```

### Running Schema Tests

```bash
# Run schema tests
pnpm test tests/unit/graphql_schema.test.ts

# Watch mode
jest --watch tests/unit/graphql_schema.test.ts
```

## E2E Testing Patterns

E2E tests use robust selector patterns and waiting strategies to handle dynamic content and ensure reliability.

### Robust Selector Patterns

Always use multiple selector fallbacks:

```typescript
// Multiple selector strategies
const statusElement = page.locator(
  '[data-testid="run-status"], .run-status, #run-status'
);

// Flexible text matching
const headerElement = page.locator(`text=/.*${header}.*/i`);

// Combining selectors for nested elements
const runIdInEntry = runEntry.locator(
  '[data-testid*="run-id"], .run-id, [class*="id"]'
);
```

### Waiting Strategies

```typescript
// Wait for visibility with timeout
await expect(statusElement).toBeVisible({ timeout: 10000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for custom condition
await page.waitForFunction(
  () => {
    const element = document.querySelector('.status');
    return element?.textContent?.includes('SUCCESS');
  },
  { timeout: 30000 }
);
```

### Testing Dynamic Lists

```typescript
// Find table/list
const listContainer = page.locator('[data-testid="run-history-table"]');
await expect(listContainer).toBeVisible();

// Check entries
const entries = page.locator('[data-testid="run-entry"]');
const count = await entries.count();
expect(count).toBeGreaterThan(0);

// Validate each entry
for (let i = 0; i < Math.min(count, 5); i++) {
  const entry = entries.nth(i);
  await expect(entry.locator('.run-id')).toBeVisible();
  await expect(entry.locator('.status')).toBeVisible();
}
```

### Testing Interactive Features

```typescript
// Pagination
const nextButton = page.locator('button:has-text("Next")');
if (await nextButton.count() > 0) {
  await nextButton.click();
  await page.waitForLoadState('networkidle');
}

// Search/Filter
const searchInput = page.locator('input[type="search"]');
await searchInput.fill('query');
await page.waitForTimeout(500); // Debounce

// Sorting
const sortableHeader = page.locator('th[role="button"]').first();
await sortableHeader.click();
await expect(page.locator('[aria-sort]')).toBeVisible();
```

### Handling State-Dependent Content

```typescript
// Check status and conditionally test features
const statusText = await statusElement.textContent();

if (statusText?.includes('FAILED')) {
  // Verify error details are shown
  const errorElement = page.locator('.error-message');
  await expect(errorElement).toBeVisible();
} else if (statusText?.includes('SUCCEEDED')) {
  // Verify results are shown
  const resultsElement = page.locator('.run-results');
  await expect(resultsElement).toBeVisible();
}

// Empty state handling
if (runCount === 0) {
  const emptyState = page.locator('.empty-state');
  await expect(emptyState).toBeVisible();
  expect(await emptyState.textContent()).toMatch(/no runs|empty/i);
}
```

## Best Practices

### DO:
- ✅ Use test factories for consistent data
- ✅ Write isolated, independent tests
- ✅ Test edge cases and error scenarios
- ✅ Mock external dependencies
- ✅ Clean up after tests
- ✅ Use descriptive test names
- ✅ Test backward compatibility for GraphQL schemas
- ✅ Use multiple selector strategies in E2E tests
- ✅ Add proper wait conditions for dynamic content
- ✅ Test security implications (no sensitive data exposure)
- ✅ Validate performance considerations (pagination, limits)

### DON'T:
- ❌ Share state between tests
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Use hardcoded IDs or timestamps
- ❌ Skip test cleanup
- ❌ Use single selector strategies in E2E tests
- ❌ Rely on fixed timeouts (use waitFor instead)
- ❌ Make breaking schema changes without updating tests
- ❌ Skip testing null/undefined edge cases

## Common Commands

```bash
# Run all tests
pnpm run test

# Run unit tests
pnpm run test:unit

# Run integration tests
pnpm run test:integration

# Run E2E tests
pnpm run test:e2e

# Run with coverage
pnpm run test:coverage

# Watch mode
pnpm run test:watch

# Debug mode
pnpm run test:debug
```

## CI/CD

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Nightly builds

Coverage reports are generated and uploaded to Codecov. PRs are blocked if coverage drops below the threshold.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full testing guidelines

## Getting Help

- Check existing tests for examples
- Review the testing guidelines in CONTRIBUTING.md
- Ask in #engineering Slack channel
