# Testing Guide

This document outlines the testing strategy and practices for Summit.

## Testing Layers

We follow the testing pyramid:

1.  **Unit Tests** (`npm run test:unit`)
2.  **Integration Tests** (`npm run test:integration`)
3.  **End-to-End (E2E) Tests** (`npm run test:e2e`)

## Unit Tests

- **Scope**: Individual functions, classes, and utilities.
- **Tools**: Jest
- **Location**: `tests/` directories alongside code or in `__tests__`.
- **Mocking**: Extensive mocking of external dependencies (DB, API).

**Example:**

```typescript
import { sum } from "./math";

test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});
```

To run unit tests:

```bash
cd server
npm run test:unit
```

## Integration Tests

- **Scope**: API endpoints, Database interactions.
- **Tools**: Jest, Supertest
- **Location**: `server/tests/integration`
- **Setup**: Requires a running (or mocked) database environment.

**Example:**

```typescript
import request from "supertest";
import app from "../src/app";

describe("GET /health", () => {
  it("responds with json", async () => {
    const response = await request(app).get("/health").expect("Content-Type", /json/).expect(200);

    expect(response.body.status).toBe("ok");
  });
});
```

To run integration tests:

```bash
cd server
npm run test:integration
```

## End-to-End (E2E) Tests

- **Scope**: Full user journeys (Frontend + Backend + DB).
- **Tools**: Playwright
- **Location**: `e2e/` folder in the root.

**Running E2E Tests:**

1. Ensure the full stack is running (`make up`).
2. Run Playwright:
   ```bash
   npm run test:e2e
   ```

## Smoke Tests

A quick verification suite to check system health.

```bash
make smoke
```

## Best Practices

1.  **Write tests for every feature.** PRs should include tests.
2.  **Mock external services.** Don't hit real APIs in unit tests.
3.  **Use factories.** Use helper functions to generate test data.
4.  **Clean up.** Ensure tests don't leave dirty data in the DB (use transactions or teardown scripts).
5.  **Test edge cases.** Don't just test the happy path.

## Continuous Integration

Tests are automatically run on GitHub Actions for every Pull Request.

- `unit-tests`: Runs on every push.
- `e2e-tests`: Runs on PRs to main.
