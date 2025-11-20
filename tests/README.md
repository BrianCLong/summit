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

## Best Practices

### DO:
- ✅ Use test factories for consistent data
- ✅ Write isolated, independent tests
- ✅ Test edge cases and error scenarios
- ✅ Mock external dependencies
- ✅ Clean up after tests
- ✅ Use descriptive test names

### DON'T:
- ❌ Share state between tests
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Use hardcoded IDs or timestamps
- ❌ Skip test cleanup

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
