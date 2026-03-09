# Test Command

Run the test suites for the Summit platform. Supports unit, integration, and E2E tests.

## Instructions

### Quick Test (Unit Tests Only)
```bash
pnpm test:jest
```

### Full Test Suite
```bash
pnpm test
```

### Specific Test Types

**Integration Tests:**
```bash
pnpm test:integration
```

**E2E Tests (Playwright):**
```bash
pnpm e2e
```

**Smoke Tests (Golden Path):**
```bash
pnpm smoke
```

### Running Specific Tests

**By file pattern:**
```bash
pnpm test:jest -- --testPathPattern="EntityService"
```

**By test name:**
```bash
pnpm test:jest -- --testNamePattern="should create entity"
```

**Specific package:**
```bash
pnpm --filter @intelgraph/api test
```

### Watch Mode (Development)
```bash
pnpm test:jest -- --watch
```

### Coverage Report
```bash
pnpm test:coverage
```

## Test Conventions

1. **Naming**: Use descriptive test names that explain the behavior
2. **Structure**: Arrange-Act-Assert pattern
3. **Isolation**: Each test should be independent
4. **No focused tests**: Never commit `.only()` or `.skip()`

## Troubleshooting

**Clear Jest cache if tests behave unexpectedly:**
```bash
jest --clearCache
```

**Run with verbose output:**
```bash
pnpm test:jest -- --verbose
```

## Success Criteria

- All tests pass (green)
- No skipped or focused tests
- Coverage thresholds met (if configured)
