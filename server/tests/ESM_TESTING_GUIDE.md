# ESM Testing Guide for Jest

**Version**: 1.0
**Last Updated**: 2026-01-10
**Status**: Active

## Overview

This guide documents the standard pattern for writing Jest tests in an ESM (ECMAScript Modules) environment. The server uses `"type": "module"` in `package.json`, which requires specific patterns for mocking and test setup.

## Key Requirements

### 1. Import `jest` from `@jest/globals`

All test files MUST import `jest` and other test utilities from `@jest/globals`:

```typescript
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
```

**Why?** In ESM mode, `jest` is not automatically available as a global. Attempting to use `jest.mock()` without importing will result in:

```
ReferenceError: jest is not defined
```

### 2. Use `jest.unstable_mockModule()` for ESM Mocking

Standard `jest.mock()` does not work reliably with ESM. Use `jest.unstable_mockModule()` instead:

```typescript
// ESM-compatible mocking
jest.unstable_mockModule("../path/to/module.js", () => ({
  exportedFunction: jest.fn(),
  ExportedClass: jest.fn(),
}));
```

### 3. Use Dynamic Imports After Mocks

Mocks MUST be registered BEFORE importing the module under test. Use dynamic `await import()`:

```typescript
// Register mocks first
jest.unstable_mockModule("../../../src/config/database.js", () => ({
  getPostgresPool: jest.fn(),
}));

jest.unstable_mockModule("../../../src/middleware/auth.js", () => ({
  ensureAuthenticated: (req, res, next) => {
    req.user = { id: "test-user", tenantId: "test-tenant" };
    next();
  },
}));

// THEN import the modules (dynamic import)
const { default: request } = await import("supertest");
const { default: express } = await import("express");
const { default: myRouter } = await import("../../../src/routes/myRoute.js");
```

### 4. Mock Classes with Static Methods

When mocking classes with static methods, define the class within the mock factory:

```typescript
jest.unstable_mockModule("../../../src/middleware/tenantValidator.js", () => {
  class MockTenantValidator {
    static validateTenantAccess(context, requestedTenantId) {
      const userTenantId = context.user?.tenantId;
      if (userTenantId !== requestedTenantId) {
        const error = new Error("Cross-tenant access denied");
        error.extensions = { code: "CROSS_TENANT_ACCESS_DENIED" };
        throw error;
      }
      return { tenantId: requestedTenantId, user: context.user };
    }
  }
  return { TenantValidator: MockTenantValidator };
});
```

### 5. Mock Default Exports

For modules with default exports, use `__esModule: true`:

```typescript
jest.unstable_mockModule("../../../src/services/PricingEngine.js", () => ({
  __esModule: true,
  default: {
    getEffectivePlan: jest.fn().mockResolvedValue({
      plan: { limits: { "llm.tokens": { unitPrice: 0.001 } } },
    }),
  },
}));
```

## Complete Example

Here's a complete test file demonstrating all patterns:

```typescript
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock variables (declared before mocks)
const mockQuery = jest.fn();
const mockRelease = jest.fn();

// Register all mocks BEFORE importing modules
jest.unstable_mockModule("../../../src/config/database.js", () => ({
  getPostgresPool: () => ({
    connect: jest.fn(async () => ({
      query: mockQuery,
      release: mockRelease.mockResolvedValue(undefined),
    })),
  }),
}));

jest.unstable_mockModule("../../../src/middleware/auth.js", () => ({
  ensureAuthenticated: (req, _res, next) => {
    const tenant = req.headers["x-tenant-id"] || "tenant-123";
    req.user = { id: "user-1", tenantId: tenant, roles: ["ADMIN"] };
    next();
  },
}));

// Dynamic imports AFTER mocks
const { default: request } = await import("supertest");
const { default: express } = await import("express");
const { default: myRouter } = await import("../../../src/routes/myRoute.js");

// Create test app
const app = express();
app.use(express.json());
app.use("/api/resource", myRouter);

describe("GET /api/resource", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  it("returns data successfully", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: "Test" }] });

    const res = await request(app).get("/api/resource").set("x-tenant-id", "tenant-123");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
});
```

## Running Tests

Always use the standardized test commands which include `NODE_OPTIONS`:

```bash
# Unit tests (recommended)
pnpm test:unit

# All tests
pnpm test

# Specific test file
pnpm test:unit --testPathPattern="mytest"

# With open handle detection (for debugging hangs)
pnpm test:unit --testPathPattern="mytest" --detectOpenHandles
```

## Troubleshooting

### "jest is not defined"

**Cause**: Missing import from `@jest/globals`

**Fix**: Add at the top of the file:

```typescript
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
```

### "Module does not provide an export named 'X'"

**Cause**: ESM export mismatch or mock not properly structured

**Fix**: Ensure the mock returns the exact export shape expected:

```typescript
// If the module exports: export { foo, bar }
jest.unstable_mockModule("./module.js", () => ({
  foo: jest.fn(),
  bar: jest.fn(),
}));

// If the module exports: export default class Foo {}
jest.unstable_mockModule("./module.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));
```

### Mock Not Being Applied

**Cause**: Module imported before mock was registered

**Fix**: Ensure `jest.unstable_mockModule()` is called BEFORE any `import` statements for modules that depend on the mocked module. Use dynamic imports:

```typescript
// BAD - import before mock
import { myFunction } from "./module.js";
jest.unstable_mockModule("./dependency.js", () => ({})); // Too late!

// GOOD - mock before import
jest.unstable_mockModule("./dependency.js", () => ({}));
const { myFunction } = await import("./module.js"); // Now it uses the mock
```

### Test Hangs (Timeout)

**Cause**: Open handles (DB connections, timers, etc.) not cleaned up

**Fix**:

1. Run with `--detectOpenHandles` to identify the source
2. Ensure all async operations complete or are mocked
3. Use proper cleanup in `afterEach`/`afterAll`:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await cleanup();
});
```

## Related Documentation

- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [ts-jest ESM Configuration](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support)
- [AUTH_TESTING_GUIDE.md](./AUTH_TESTING_GUIDE.md) - Authentication-specific testing patterns
