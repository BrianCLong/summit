# Contributing to Summit (IntelGraph)

> **⚠️ IMPORTANT:** This document is being superseded by the **[Developer Enablement Pack](planning/enablement-pack/README.md)**.
> Please refer to that directory for the authoritative "Golden Path" on onboarding, workflows, and architecture.

## Prerequisites & Setup

Please follow the **[Onboarding & Quickstart Guide](planning/enablement-pack/onboarding-quickstart.md)**.

### Golden path for local development

1. **Tooling:** Node.js 18.18+, pnpm 9+, Python 3.11+, and Docker Desktop (for optional local services).
2. **Install:** `pnpm install --frozen-lockfile` (runs `husky install` via `prepare`). If hooks were skipped, run `pnpm exec husky install` once.
3. **Develop:** `pnpm dev` starts the API and web client together. Use `make up` when you want the Dockerized dependencies.
4. **Quick validation:** `pnpm run check:local` (lint + typecheck + a fast Jest sweep) keeps feedback quick without running Playwright or integration suites.
5. **Opt-in heavy checks:** `pnpm run test:e2e` (Playwright) and `pnpm run test:integration` are now manual/CI-only so local commits stay fast.

### Git hooks (lightweight by default)

- **Pre-commit:** runs secret scanning (custom + gitleaks when installed) and `lint-staged` on **staged files only**. Type-checking and screenshot generation were removed from the hook to avoid blocking commits.
- **Pre-push:** keeps `scripts/pr_guard.sh` for safety and runs the new `test:quick` script; failures are soft on feature branches and strict on protected branches.
- **Recommended before PRs:** `pnpm run check:local` plus any relevant integration/E2E commands for the area you changed.

## Common Development Tasks

See **[Daily Developer Workflows](planning/enablement-pack/daily-dev-workflows.md)**.

> **Note:** Check out the [Examples Directory](examples/) for plugins and custom pipelines.

## Branch & Pull Request Workflow
## Mergefix / Express 5 Changes (Fast Path)

This section defines **coding rules, commit conventions, and the minimal gate** for any PR that touches the Express 5 migration or related merge conflict work. Use it for PRs labeled `mergefix`.

### Coding Rules (must)

1. **One global error handler** at the end of the middleware chain. No router-level error handlers.
2. **Async handlers `throw`**; never call `next(err)` from an `async` function.
3. **Structured errors** only:
   ```json
   { "error": { "code": "BAD_REQUEST", "message": "Human-readable text" } }
   ```
4. **Order**: routes → 404 → error handler.
5. **Return after responding** (avoid `"headers already sent"`).
6. **Validation**: validators may `throw` `{ statusCode, code, message }`; do not `next(err)`.
7. **Streaming**: use `await pipeline(stream, res)`; let rejections bubble to the global error handler.
8. **Tests**: Supertest must `await`; assert JSON errors; 404 is JSON.

### Commit Message Convention

Use the `mergefix` type + scope:

- `mergefix(express5): centralize error handler`
- `mergefix(router): drop next(err) in async handlers`
- `mergefix(build): adjust Vite 7 config`
- `mergefix(tests): update Supertest for JSON errors`

If a commit is a pure conflict resolution, prefer the prefix `mergefix(express5):` and keep the diff tightly scoped.

> Add formatting-only or mass-rename SHAs to `.git-blame-ignore-revs`.

### Minimal Local Gate (must pass before pushing)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test -- --ci
pnpm -r build
pnpm playwright install --with-deps
pnpm e2e
pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand
curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa && ./opa test policies/ -v
pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
```

Or with `make`:

```bash
make ci-check contracts policy-sim
```

### Conflict-Resolution Tips

- Enable `git rerere` once:

  ```bash
  git config --global rerere.enabled true
  git config --global rerere.autoUpdate true
  git config --global rerere.log true
  ```

- Detect duplicates before opening your PR:

  ```bash
  git log --oneline --cherry origin/main...HEAD
  ```

### PR Checklist

- [ ] No `next(err)` in async handlers
- [ ] Single global error handler (after 404)
- [ ] JSON error shape consistent
- [ ] Tests updated for Express 5 semantics
- [ ] Contracts + policy sim pass
- [ ] SBOM + provenance generated and verified

## Testing Guidelines

See **[Testing Guidelines](planning/enablement-pack/testing-guidelines.md)** for detailed patterns, factories, and mocking strategies.

## AI Agent Collaboration

See **[AI Agent Guidelines](planning/enablement-pack/ai-agent-guidelines.md)**.

## Merge Rules & CI Gates

See **[Merge Rules & CI Gates](planning/enablement-pack/merge-rules-and-ci-gates.md)** for:
*   Branching Strategy
*   Pull Request Expectations
*   CI Gates
*   Fast Path / Mergefix instructions
Unit tests focus on testing individual functions, classes, and modules in isolation.

**Location:** `__tests__` directories next to source files **Pattern:** `*.test.ts`, `*.test.tsx`

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

**Location:** `tests/integration/` **Pattern:** `*.integration.test.ts`

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

**Location:** `tests/e2e/` **Pattern:** `*.spec.ts` **Tool:** Playwright

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
import { userFactory, entityFactory, investigationFactory, graphFactory } from '@tests/factories';

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

## Mergefix / Express 5 Changes (Fast Path)

This section defines **coding rules, commit conventions, and the minimal gate** for any PR that
touches the Express 5 migration or related merge conflict work. Use it for PRs labeled `mergefix`.

### Coding Rules (must)

1. **One global error handler** at the end of the middleware chain. No router-level error handlers.
2. **Async handlers `throw`**; never call `next(err)` from an `async` function.
3. **Structured errors** only:

   ```json
   { "error": { "code": "BAD_REQUEST", "message": "Human-readable text" } }
   ```

4. **Order**: routes → 404 → error handler.
5. **Return after responding** (avoid `"headers already sent"`).
6. **Validation**: validators may `throw` `{ statusCode, code, message }`; do not `next(err)`.
7. **Streaming**: use `await pipeline(stream, res)`; let rejections bubble to the global error
   handler.
8. **Tests**: Supertest must `await`; assert JSON errors; 404 is JSON.

### Commit Message Convention

Use the `mergefix` type + scope:

- `mergefix(express5): centralize error handler`
- `mergefix(router): drop next(err) in async handlers`
- `mergefix(build): adjust Vite 7 config`
- `mergefix(tests): update Supertest for JSON errors`

If a commit is a pure conflict resolution, prefer the prefix `mergefix(express5):` and keep the diff
tightly scoped.

> Add formatting-only or mass-rename SHAs to `.git-blame-ignore-revs`.

### Minimal Local Gate (must pass before pushing)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test -- --ci
pnpm -r build
pnpm playwright install --with-deps
pnpm e2e
pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand
curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa && ./opa test policies/ -v
pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
```

Or with `make`:

```bash
make ci-check contracts policy-sim
```

### Conflict-Resolution Tips

- Enable `git rerere` once:

  ```bash
  git config --global rerere.enabled true
  git config --global rerere.autoUpdate true
  git config --global rerere.log true
  ```

- Detect duplicates before opening your PR:

  ```bash
  git log --oneline --cherry origin/main...HEAD
  ```

### PR Checklist

- [ ] No `next(err)` in async handlers
- [ ] Single global error handler (after 404)
- [ ] JSON error shape consistent
- [ ] Tests updated for Express 5 semantics
- [ ] Contracts + policy sim pass
- [ ] SBOM + provenance generated and verified

## Strict CI Enforcement & Code Quality

We enforce strict TypeScript checks (`strict: true`, `noImplicitAny`) and ESLint rules (`no-explicit-any`, `no-unused-vars`).

### Zero Tolerance

- All PRs must pass `npm run typecheck` and `npm run lint` with **zero errors and zero warnings**.
- CI will fail fast on the first error.

### Legacy Code Exemption

To support gradual migration, existing files with errors are grandfathered via:
- `.eslint-legacy-files.json`: Files exempt from strict ESLint rules.
- `tsconfig.strict.json` exclude list: Files exempt from strict type checking.

**New code must not be added to these exemption lists.**
If you modify a legacy file, aim to fix the errors and remove it from the exemption list.
