# Testing Guidelines

We maintain a comprehensive test suite with high coverage requirements to ensure code quality and reliability. All code changes should include appropriate tests.

## Test Types

### 1. Unit Tests

Unit tests focus on testing individual functions, classes, and modules in isolation.

- **Location:** `__tests__` directories next to source files
- **Pattern:** `*.test.ts`, `*.test.tsx`

**Example:**

```typescript
// server/src/middleware/__tests__/auth.test.ts
import { ensureAuthenticated } from "../auth";
import { requestFactory, responseFactory, nextFactory } from "../../../tests/factories";

describe("ensureAuthenticated", () => {
  it("should authenticate a valid token", async () => {
    const req = requestFactory({ headers: { authorization: "Bearer token" } });
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

### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

- **Location:** `tests/integration/`
- **Pattern:** `*.integration.test.ts`

**Example:**

```typescript
// tests/integration/auth.integration.test.ts
describe("Authentication Flow", () => {
  it("should complete full login workflow", async () => {
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

### 3. E2E Tests

End-to-end tests validate complete user flows in a browser environment.

- **Location:** `tests/e2e/`
- **Pattern:** `*.spec.ts`
- **Tool:** Playwright

**Example:**

```typescript
// tests/e2e/login-logout.spec.ts
import { test, expect } from "@playwright/test";

test("should login successfully", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## Test Factories

Use test factories to generate consistent test data:

```typescript
import { userFactory, entityFactory, investigationFactory, graphFactory } from "@tests/factories";

// Create a test user
const user = userFactory({ role: "admin" });

// Create a test entity
const entity = entityFactory({ type: "person" });
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

## Mocking

**Mock modules:**

```typescript
jest.mock("../services/AuthService");
```

**Mock functions:**

```typescript
const mockFn = jest.fn().mockReturnValue("value");
const mockAsyncFn = jest.fn().mockResolvedValue({ data: "value" });
```

## Running Tests

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
```

## Coverage Requirements

- **Global**: 80%
- **Critical paths**: 85%

PRs are blocked if coverage drops below the threshold.
