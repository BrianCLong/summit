# Contributing to IntelGraph

Welcome! We're excited to have you contribute to Summit/IntelGraph. This guide will help you get started.

## 📚 Developer Resources

Before you start, check out these comprehensive guides:

### Getting Started
- 🚀 **[Developer Onboarding](docs/DEVELOPER_ONBOARDING.md)** - Get productive in 30 minutes
- 📖 **[CLAUDE.md](CLAUDE.md)** - Complete development reference guide
- 🔧 **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Solutions to common issues
- ⚡ **[Quick Reference](docs/QUICK_REFERENCE.md)** - Commands and patterns cheat sheet

### Code Quality & Review
- 👀 **[Code Review Guidelines](docs/CODE_REVIEW_GUIDELINES.md)** - Review standards and best practices
- 📋 **[Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md)** - Comprehensive PR checklist

### Workflows & Processes
- 🔄 **[Contribution Workflows](docs/CONTRIBUTION_WORKFLOWS.md)** - Visual workflow diagrams
- 🏗️ **[Architecture](docs/ARCHITECTURE.md)** - System design and structure

### Development Tools
- 💻 **[VS Code Setup](.vscode/README.md)** - Recommended extensions and settings
- 🧪 **Testing Guidelines** - See below for comprehensive testing guide

### Quick Health Check
Run this script to verify your development environment:
```bash
./scripts/dev-check.sh
```

---

## Prerequisites

- Node 20 LTS, pnpm 9 (corepack)
- Docker (Compose) for local services

## Setup

- corepack enable && corepack prepare pnpm@9.12.3 --activate
- make bootstrap

## Common Tasks

- Typecheck: `make typecheck`
- Lint: `make lint`
- Test: `make test`
- E2E (smoke): `make e2e`
- Build all: `make build`
- Codegen (GraphQL): `make codegen`
- Bring up services: `make up` / `make down`

## Branch & PR

- Keep changes scoped; run `scripts/pr_guard.sh` before PR
- CI must be green; merge queue enforces required checks

## Troubleshooting

- Run `scripts/green_build.sh` to self-heal and build
- Run `node scripts/audit_workspaces.mjs --strict` for hard audit

## Testing Guidelines

### Overview

We maintain a comprehensive test suite with high coverage requirements to ensure code quality and reliability. All code changes should include appropriate tests.

### Test Types

#### 1. Unit Tests

Unit tests focus on testing individual functions, classes, and modules in isolation.

**Location:** `__tests__` directories next to source files
**Pattern:** `*.test.ts`, `*.test.tsx`

**Example:**
```typescript
// server/src/middleware/__tests__/auth.test.ts
import { ensureAuthenticated } from '../auth';
import { requestFactory, responseFactory, nextFactory } from '../../../tests/factories';

describe('ensureAuthenticated', () => {
  it('should authenticate a valid token', async () => {
    const req = requestFactory({ headers: { authorization: 'Bearer token' } });
    const res = responseFactory();
    const next = nextFactory();

    await ensureAuthenticated(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
```

**Best Practices:**
- Test one thing per test case
- Use descriptive test names: "should X when Y"
- Mock external dependencies
- Use test factories for consistent data
- Aim for 85%+ coverage for critical paths

#### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

**Location:** `tests/integration/`
**Pattern:** `*.integration.test.ts`

**Example:**
```typescript
// tests/integration/auth.integration.test.ts
describe('Authentication Flow', () => {
  it('should complete full login workflow', async () => {
    const user = await login(email, password);
    expect(user).toBeDefined();
    expect(user.token).toBeDefined();
  });
});
```

**Best Practices:**
- Test realistic workflows
- Use actual database connections (test DB)
- Clean up test data after each test
- Test error scenarios
- Verify side effects

#### 3. E2E Tests

End-to-end tests validate complete user flows in a browser environment.

**Location:** `tests/e2e/`
**Pattern:** `*.spec.ts`
**Tool:** Playwright

**Example:**
```typescript
// tests/e2e/login-logout.spec.ts
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

**Best Practices:**
- Test critical user journeys
- Test across different browsers
- Use data-testid attributes
- Handle async operations properly
- Take screenshots on failure

### Test Factories

Use test factories to generate consistent test data:

```typescript
import {
  userFactory,
  entityFactory,
  investigationFactory,
  graphFactory,
} from '@tests/factories';

// Create a test user
const user = userFactory({ role: 'admin' });

// Create a test entity
const entity = entityFactory({ type: 'person' });

// Create a test graph
const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });
```

**Available Factories:**
- `userFactory` - Create test users
- `entityFactory` - Create graph entities
- `relationshipFactory` - Create graph relationships
- `investigationFactory` - Create investigations
- `graphFactory` - Create complete graphs
- `requestFactory` - Create HTTP requests
- `responseFactory` - Create HTTP responses
- `contextFactory` - Create GraphQL contexts

### Running Tests

```bash
# Run all tests
pnpm run test

# Run unit tests only
pnpm run test:unit

# Run integration tests
pnpm run test:integration

# Run E2E tests
pnpm run test:e2e

# Run with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run tests for specific file
pnpm run test -- path/to/test.test.ts
```

### Coverage Requirements

**Minimum Coverage Thresholds:**
- Global: 80%
- Critical paths (middleware, resolvers): 85%

**View Coverage Reports:**
```bash
pnpm run test:coverage
open coverage/lcov-report/index.html
```

**Coverage is tracked for:**
- Lines
- Statements
- Functions
- Branches

### Writing Good Tests

#### DO:
- ✅ Write tests before or alongside code (TDD/BDD)
- ✅ Test edge cases and error scenarios
- ✅ Use descriptive test names
- ✅ Keep tests isolated and independent
- ✅ Mock external dependencies
- ✅ Clean up after tests
- ✅ Use test factories for consistency
- ✅ Test async code properly (async/await)

#### DON'T:
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Share state between tests
- ❌ Test third-party library code
- ❌ Skip cleanup
- ❌ Use hardcoded IDs or timestamps
- ❌ Test everything in one large test

### Test Organization

```
project/
├── server/
│   └── src/
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── __tests__/
│       │       └── auth.test.ts
│       └── graphql/
│           └── resolvers/
│               ├── index.ts
│               └── __tests__/
│                   └── index.test.ts
├── tests/
│   ├── factories/           # Test data factories
│   │   ├── userFactory.ts
│   │   └── entityFactory.ts
│   ├── integration/         # Integration tests
│   │   ├── auth.integration.test.ts
│   │   └── graphql.integration.test.ts
│   └── e2e/                # E2E tests
│       ├── login-logout.spec.ts
│       └── graph-visualization.spec.ts
└── jest.config.cjs
```

### Mocking

**Mock modules:**
```typescript
jest.mock('../services/AuthService');
```

**Mock functions:**
```typescript
const mockFn = jest.fn().mockReturnValue('value');
const mockAsyncFn = jest.fn().mockResolvedValue({ data: 'value' });
```

**Mock timers:**
```typescript
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();
```

### Debugging Tests

```bash
# Run with verbose output
pnpm run test -- --verbose

# Run specific test
pnpm run test -- -t "test name"

# Debug in VS Code
# Add breakpoint and run "Jest: Debug Test" from command palette

# Show console logs
pnpm run test -- --silent=false
```

### CI/CD Integration

Tests run automatically in CI/CD:
- On every push to main/develop
- On every pull request
- Coverage reports are generated
- PRs are blocked if coverage drops below 80%

**GitHub Actions Workflow:** `.github/workflows/test-coverage.yml`

### Performance

**Test Performance Guidelines:**
- Unit tests: < 100ms each
- Integration tests: < 5s each
- E2E tests: < 30s each

**Optimize slow tests:**
- Use `beforeAll` instead of `beforeEach` where possible
- Mock expensive operations
- Use test.concurrent for parallel execution
- Reduce database operations

### Common Patterns

**Testing middleware:**
```typescript
const req = requestFactory({ headers: { 'x-tenant-id': 'test' } });
const res = responseFactory();
const next = nextFactory();

middleware(req, res, next);

expect(next).toHaveBeenCalled();
```

**Testing resolvers:**
```typescript
const context = authenticatedContextFactory();
const result = await resolver(parent, args, context);

expect(result).toBeDefined();
```

**Testing async errors:**
```typescript
await expect(asyncFunction()).rejects.toThrow('Error message');
```

### Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- Internal test factories: `tests/factories/`

### Getting Help

- Check existing tests for examples
- Ask in #engineering Slack channel
- Review test coverage reports
- Consult the testing best practices doc
