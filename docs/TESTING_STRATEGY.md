# Summit/IntelGraph Testing Strategy

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Owner**: Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Pyramid](#test-pyramid)
4. [Coverage Requirements](#coverage-requirements)
5. [Test Types](#test-types)
6. [Testing Patterns](#testing-patterns)
7. [Test Templates](#test-templates)
8. [Golden Path Testing](#golden-path-testing)
9. [Continuous Integration](#continuous-integration)
10. [Best Practices](#best-practices)

---

## Overview

This document defines the comprehensive testing strategy for the Summit/IntelGraph platform. Our testing approach ensures:

- **Production Readiness**: Every commit maintains production quality
- **Golden Path Protection**: Critical user workflows are always functional
- **Fast Feedback**: Tests run quickly and provide actionable feedback
- **High Coverage**: 80%+ code coverage across the codebase
- **Confidence**: Deployments happen with minimal risk

### Testing Goals

1. **Prevent Regressions**: Catch bugs before they reach production
2. **Enable Refactoring**: Confidently improve code structure
3. **Document Behavior**: Tests serve as living documentation
4. **Performance Validation**: Ensure system meets SLAs
5. **Security Assurance**: Validate security controls

---

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Fast Feedback**: Unit tests run in milliseconds, integration tests in seconds
3. **Isolation**: Tests should not depend on each other or external state
4. **Determinism**: Tests produce the same result every time
5. **Clarity**: Test names and assertions clearly communicate intent

### Test-Driven Development (TDD)

We encourage TDD for new features:

```
Red → Green → Refactor
```

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Testing Pyramid

```
       /\
      /E2E\        ← Few (5-10%)
     /------\
    /  INT   \     ← Some (20-30%)
   /----------\
  /   UNIT     \   ← Many (60-75%)
 /--------------\
```

- **Unit Tests (60-75%)**: Fast, isolated, test single units
- **Integration Tests (20-30%)**: Test component interactions
- **E2E Tests (5-10%)**: Test complete user workflows

---

## Coverage Requirements

### Coverage Thresholds

All packages must meet these minimum coverage thresholds:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Statements** | 80% | Percentage of statements executed |
| **Branches** | 75% | Percentage of conditional branches tested |
| **Functions** | 80% | Percentage of functions called |
| **Lines** | 80% | Percentage of lines executed |

### Critical Paths

Golden path workflows require **90%+ coverage**:

- Investigation creation and management
- Entity and relationship CRUD operations
- Graph queries and analytics
- Copilot interactions
- Authentication and authorization

### Exemptions

The following are exempt from coverage requirements:

- Generated code (GraphQL types, Prisma client)
- Configuration files
- Type definitions (`.d.ts`)
- Migration scripts
- Demo/seed data

### Coverage Configuration

Coverage is configured in `jest.coverage.config.cjs`:

```javascript
module.exports = {
  ...require('./jest.config.cjs'),
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/src/**/*.{ts,tsx,js,jsx}',
    'services/*/src/**/*.{ts,tsx,js,jsx}',
    'packages/*/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
};
```

---

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions/classes in isolation

**Characteristics**:
- Fast (< 100ms per test)
- No external dependencies (databases, APIs, file system)
- Use mocks/stubs for dependencies
- Test edge cases and error conditions

**Example Use Cases**:
- Utility functions
- Business logic
- Validators
- Transformers

**Location**: Co-located with source code
- `src/__tests__/`
- `src/**/*.test.ts`

### 2. Integration Tests

**Purpose**: Test interactions between components

**Characteristics**:
- Slower (< 5s per test)
- May use test databases or in-memory alternatives
- Test real integrations (GraphQL → Service → Database)
- Validate data flow

**Example Use Cases**:
- GraphQL resolver → Service → Repository
- Database operations (PostgreSQL + Neo4j dual-write)
- Message queue producers/consumers
- External API integrations

**Location**:
- `tests/integration/`
- `src/**/*.integration.test.ts`

### 3. End-to-End (E2E) Tests

**Purpose**: Test complete user workflows

**Characteristics**:
- Slowest (< 30s per test)
- Use real browser (Playwright)
- Test against running application
- Simulate user interactions

**Example Use Cases**:
- Golden path workflow
- Authentication flows
- Complex UI interactions
- Critical business processes

**Location**:
- `e2e/`
- `tests/e2e/`

### 4. Smoke Tests

**Purpose**: Verify system health and critical paths

**Characteristics**:
- Quick health checks (< 2 minutes total)
- Run after deployment
- Validate golden path
- Test against production-like environment

**Example Use Cases**:
- Service health endpoints
- Database connectivity
- GraphQL schema validation
- Critical API endpoints

**Location**:
- `scripts/smoke-test.js`

### 5. Performance Tests

**Purpose**: Validate system performance and scalability

**Characteristics**:
- Measure response times
- Test under load
- Identify bottlenecks
- Validate SLA compliance

**Example Use Cases**:
- GraphQL query performance
- Database query optimization
- Batch operation throughput
- Concurrent user simulation

**Location**:
- `tests/performance/`
- `tests/load/`

### 6. Security Tests

**Purpose**: Validate security controls and identify vulnerabilities

**Characteristics**:
- Test authentication/authorization
- Validate input sanitization
- Check for common vulnerabilities
- Test security policies

**Example Use Cases**:
- RBAC/ABAC enforcement
- SQL injection prevention
- XSS prevention
- CSRF protection

**Location**:
- `tests/security/`
- `tests/e2e/security/`

---

## Testing Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

Structure tests in three phases:

```typescript
describe('EntityService', () => {
  it('should create entity with valid data', async () => {
    // Arrange: Setup test data and mocks
    const entityData = {
      tenantId: 'tenant-123',
      kind: 'Person',
      props: { name: 'John Doe' },
    };
    const mockRepo = createMockEntityRepo();

    // Act: Execute the operation
    const result = await entityService.create(entityData, 'user-456');

    // Assert: Verify the outcome
    expect(result).toHaveProperty('id');
    expect(result.kind).toBe('Person');
    expect(mockRepo.create).toHaveBeenCalledWith(entityData, 'user-456');
  });
});
```

### Pattern 2: Given-When-Then (BDD)

Use descriptive test names for behavior-driven tests:

```typescript
describe('Investigation Workflow', () => {
  describe('Given an authenticated user', () => {
    describe('When creating a new investigation', () => {
      it('Then should create investigation with default status', async () => {
        // Test implementation
      });

      it('Then should emit investigation.created event', async () => {
        // Test implementation
      });
    });
  });
});
```

### Pattern 3: Test Factories

Use factories for creating test data:

```typescript
// tests/factories/entityFactory.ts
export const createMockEntity = (overrides = {}) => ({
  id: 'entity-' + Math.random().toString(36).substr(2, 9),
  tenantId: 'tenant-123',
  kind: 'Person',
  labels: ['Individual'],
  props: { name: 'Test User' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Usage in tests
const entity = createMockEntity({ kind: 'Organization' });
```

### Pattern 4: Mock Services

Create reusable mocks for common services:

```typescript
// tests/mocks/services.ts
export const createMockServices = () => ({
  entityRepo: {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  neo4jService: {
    runQuery: jest.fn(),
    createNode: jest.fn(),
  },
  auditService: {
    log: jest.fn(),
  },
});

// Usage in tests
const services = createMockServices();
services.entityRepo.findById.mockResolvedValue(mockEntity);
```

### Pattern 5: Snapshot Testing

Use snapshots for complex data structures:

```typescript
it('should generate correct GraphQL schema', () => {
  const schema = buildSchema();
  expect(schema).toMatchSnapshot();
});
```

### Pattern 6: Parameterized Tests

Test multiple scenarios with test.each:

```typescript
describe('Input Validation', () => {
  test.each([
    ['', 'Name is required'],
    ['a', 'Name must be at least 2 characters'],
    ['a'.repeat(256), 'Name must be less than 255 characters'],
  ])('should validate name "%s" with error "%s"', (name, expectedError) => {
    const result = validateName(name);
    expect(result.error).toBe(expectedError);
  });
});
```

---

## Test Templates

### Template 1: GraphQL Resolver Test

See: `docs/test-templates/graphql-resolver.test.ts`

```typescript
/**
 * GraphQL Resolver Test Template
 *
 * Use this template for testing GraphQL resolvers with proper mocking
 * of context, services, and database operations.
 */

import { jest } from '@jest/globals';
import type { GraphQLContext } from '../types';

describe('EntityResolver', () => {
  let mockContext: GraphQLContext;
  let mockServices: any;

  beforeEach(() => {
    // Setup mocks
    mockServices = {
      entityRepo: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditService: {
        log: jest.fn(),
      },
    };

    mockContext = {
      user: { id: 'user-123', tenantId: 'tenant-456' },
      services: mockServices,
      logger: console,
      authorize: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.entity', () => {
    it('should fetch entity by id', async () => {
      // Arrange
      const mockEntity = {
        id: 'entity-789',
        tenantId: 'tenant-456',
        kind: 'Person',
        props: { name: 'John Doe' },
      };
      mockServices.entityRepo.findById.mockResolvedValue(mockEntity);

      // Act
      const result = await resolvers.Query.entity(
        null,
        { id: 'entity-789' },
        mockContext,
      );

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockContext.authorize).toHaveBeenCalledWith('entity:read');
      expect(mockServices.entityRepo.findById).toHaveBeenCalledWith(
        'entity-789',
        'tenant-456',
      );
    });

    it('should throw error when entity not found', async () => {
      // Arrange
      mockServices.entityRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resolvers.Query.entity(null, { id: 'nonexistent' }, mockContext),
      ).rejects.toThrow('Entity not found');
    });

    it('should enforce authorization', async () => {
      // Arrange
      mockContext.authorize.mockRejectedValue(
        new Error('Unauthorized'),
      );

      // Act & Assert
      await expect(
        resolvers.Query.entity(null, { id: 'entity-789' }, mockContext),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Mutation.createEntity', () => {
    it('should create entity with valid input', async () => {
      // Arrange
      const input = {
        kind: 'Person',
        props: { name: 'Jane Smith', email: 'jane@example.com' },
      };
      const mockCreatedEntity = {
        id: 'entity-new',
        tenantId: 'tenant-456',
        ...input,
        createdAt: new Date(),
      };
      mockServices.entityRepo.create.mockResolvedValue(mockCreatedEntity);

      // Act
      const result = await resolvers.Mutation.createEntity(
        null,
        { input },
        mockContext,
      );

      // Assert
      expect(result).toEqual(mockCreatedEntity);
      expect(mockContext.authorize).toHaveBeenCalledWith('entity:create');
      expect(mockServices.auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'entity.created',
          entityId: mockCreatedEntity.id,
        }),
      );
    });

    it('should validate input', async () => {
      // Arrange
      const invalidInput = { kind: '', props: {} };

      // Act & Assert
      await expect(
        resolvers.Mutation.createEntity(
          null,
          { input: invalidInput },
          mockContext,
        ),
      ).rejects.toThrow('Validation error');
    });
  });
});
```

### Template 2: Neo4j Graph Operations Test

See: `docs/test-templates/neo4j-operations.test.ts`

### Template 3: Narrative Simulation Engine Test

See: `docs/test-templates/narrative-engine.test.ts`

### Template 4: AI/ML Pipeline Test

See: `docs/test-templates/ai-ml-pipeline.test.ts`

---

## Golden Path Testing

### Golden Path Definition

The golden path represents the critical user workflow:

```
Investigation → Entities → Relationships → Copilot → Results
```

### Golden Path Test Scenarios

1. **Investigation Creation**
   - Create new investigation
   - Verify investigation metadata
   - Check audit log

2. **Entity Management**
   - Add entities to investigation
   - Update entity properties
   - Delete entities
   - Verify graph sync

3. **Relationship Creation**
   - Link entities with relationships
   - Verify bidirectional relationships
   - Test relationship properties

4. **Copilot Interaction**
   - Start copilot run with goal
   - Monitor progress
   - Receive results

5. **Results Visualization**
   - Query graph data
   - Render graph visualization
   - Export results

### Smoke Test Implementation

The smoke test (`scripts/smoke-test.js`) validates the golden path:

```javascript
async runGoldenPath() {
  await this.test('Health Check', () => this.healthCheck());
  await this.test('Create Investigation', () => this.createInvestigation());
  await this.test('Add Entities', () => this.addEntities());
  await this.test('Add Relationships', () => this.addRelationships());
  await this.test('Start Copilot', () => this.startCopilot());
  await this.test('Verify Results', () => this.verifyResults());
}
```

### Golden Path CI Gate

The golden path test runs on every PR and blocks merge if it fails:

```yaml
# .github/workflows/ci.yml
- name: Run Golden Path Smoke Test
  run: pnpm smoke:ci
  timeout-minutes: 5
```

---

## Continuous Integration

### CI Pipeline

Tests run in the following order:

1. **Lint**: Code quality checks
2. **Typecheck**: TypeScript compilation
3. **Unit Tests**: Fast, isolated tests
4. **Integration Tests**: Component interactions
5. **Smoke Tests**: Golden path validation
6. **E2E Tests**: Full workflow tests
7. **Coverage Report**: Verify thresholds

### Required Checks

All PRs must pass:

- ✅ Linting (ESLint, Prettier)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (80%+ coverage)
- ✅ Golden path smoke test
- ✅ Security scanning (Gitleaks, CodeQL)

### Test Caching

We use Turbo for intelligent test caching:

```bash
# Only re-runs tests for changed code
turbo run test --cache-dir=.turbo
```

### Parallel Execution

Tests run in parallel for speed:

```bash
# Use 50% of CPU cores
jest --maxWorkers=50%
```

---

## Best Practices

### DO ✅

1. **Write tests first** (TDD)
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Keep tests isolated and independent**
5. **Mock external dependencies**
6. **Test edge cases and error conditions**
7. **Use factories for test data**
8. **Clean up after tests** (beforeEach/afterEach)
9. **Run tests locally before pushing**
10. **Update tests when changing code**

### DON'T ❌

1. **Don't skip tests** (no `.only()` or `.skip()` in committed code)
2. **Don't test implementation details**
3. **Don't share state between tests**
4. **Don't use random data** (use deterministic seeds)
5. **Don't ignore failing tests**
6. **Don't test external services directly** (use mocks)
7. **Don't duplicate test logic** (use helpers/utilities)
8. **Don't commit commented-out tests**
9. **Don't use arbitrary timeouts** (await conditions)
10. **Don't sacrifice clarity for brevity**

### Test Naming Conventions

Use clear, descriptive names:

```typescript
// ✅ Good
it('should create entity when input is valid')
it('should throw error when user is unauthorized')
it('should return empty array when no results found')

// ❌ Bad
it('works')
it('test 1')
it('should do stuff')
```

### Assertion Best Practices

Be specific with assertions:

```typescript
// ✅ Good
expect(result.id).toBe('entity-123');
expect(result.name).toBe('John Doe');
expect(result.createdAt).toBeInstanceOf(Date);

// ❌ Bad
expect(result).toBeTruthy();
expect(result.id).toBeDefined();
```

### Async Test Patterns

Always await async operations:

```typescript
// ✅ Good
it('should create entity', async () => {
  const result = await entityService.create(data);
  expect(result).toHaveProperty('id');
});

// ❌ Bad
it('should create entity', () => {
  entityService.create(data).then(result => {
    expect(result).toHaveProperty('id');
  });
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:jest

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm e2e

# Run smoke tests
pnpm smoke

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# Debug mode
pnpm test:debug
```

### CI Environment

```bash
# Full CI suite
pnpm ci

# Smoke test (CI mode)
pnpm smoke:ci

# Coverage with thresholds
pnpm test:coverage
```

### Filtering Tests

```bash
# Run specific test file
pnpm test -- entity.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should create entity"

# Run tests in directory
pnpm test -- server/src/repos
```

---

## Monitoring and Reporting

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Terminal**: Summary in console
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` (for CI integrations)
- **JSON**: `coverage/coverage-summary.json`

### Test Metrics

We track:

- **Test Count**: Total number of tests
- **Pass Rate**: Percentage of passing tests
- **Coverage**: Code coverage percentage
- **Duration**: Test execution time
- **Flakiness**: Tests that intermittently fail

### Failure Analysis

When tests fail:

1. **Review error message**: Understand what failed
2. **Check test logs**: Look for stack traces
3. **Reproduce locally**: Run the test in isolation
4. **Debug**: Use `--inspect-brk` for debugging
5. **Fix root cause**: Don't just make the test pass
6. **Verify fix**: Ensure test is stable

---

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

### Internal Resources

- [Test Templates](./test-templates/)
- [Test Utilities](../tests/utils/)
- [Mock Factories](../tests/factories/)
- [CI Configuration](../.github/workflows/ci.yml)

### Support

For questions or issues:

- Slack: `#engineering`
- GitHub Discussions: [Summit Testing](https://github.com/BrianCLong/summit/discussions)

---

## Changelog

- **2025-11-20**: Initial testing strategy document created
- **2025-11-20**: Added test templates and coverage thresholds
- **2025-11-20**: Documented golden path testing approach

---

## Appendix

### Test File Structure

```
tests/
├── unit/                  # Unit tests
│   ├── services/
│   ├── repos/
│   └── utils/
├── integration/           # Integration tests
│   ├── graphql/
│   ├── database/
│   └── api/
├── e2e/                   # End-to-end tests
│   ├── client/
│   └── workflows/
├── performance/           # Performance tests
├── security/              # Security tests
├── factories/             # Test data factories
├── mocks/                 # Mock implementations
├── fixtures/              # Test fixtures
└── utils/                 # Test utilities
```

### Common Test Utilities

```typescript
// tests/utils/testHelpers.ts

export const waitFor = async (condition: () => boolean, timeout = 5000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

export const createTestContext = (): GraphQLContext => ({
  user: { id: 'test-user', tenantId: 'test-tenant' },
  services: createMockServices(),
  logger: console,
  authorize: jest.fn().mockResolvedValue(true),
});
```

### CI Configuration Example

```yaml
# .github/workflows/ci.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - run: pnpm install --frozen-lockfile
    - run: pnpm lint
    - run: pnpm typecheck
    - run: pnpm test:coverage
    - run: pnpm smoke:ci
    - uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

---

**End of Testing Strategy Document**
