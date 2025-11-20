# IntelGraph Server Test Suite

## Overview

This directory contains comprehensive test coverage for the IntelGraph Platform server component, focusing on critical security, data integrity, and business logic paths.

## Test Structure

```
server/src/__tests__/
├── helpers/
│   ├── testHelpers.ts          # Shared test utilities and mock factories
│   ├── setupTests.ts            # Global test configuration
│   └── __mocks__/               # Mock implementations
├── middleware/
│   ├── auth.test.ts             # Authentication & authorization tests
│   └── rateLimiting.test.ts    # Rate limiting tests
├── graphql/
│   └── resolvers/
│       ├── entity-tenant-isolation.test.ts  # Multi-tenant isolation
│       └── cypher-injection.test.ts         # SQL/Cypher injection prevention
├── db/
│   └── neo4j-resilience.test.ts # Database connection resilience
└── README.md                     # This file
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests with coverage
```bash
pnpm test:coverage
```

### Run specific test file
```bash
pnpm test -- src/__tests__/middleware/auth.test.ts
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Generate coverage report
```bash
pnpm test:coverage
node ../scripts/coverage-report.js
```

## Test Categories

### 1. Authentication & Authorization (`middleware/auth.test.ts`)
**Priority:** CRITICAL

Tests for token validation, permission checking, and security edge cases:
- ✅ Malformed token handling
- ✅ Expired token rejection
- ✅ Permission boundary validation
- ✅ ADMIN wildcard permissions
- ✅ Information leakage prevention
- ✅ Header manipulation attempts

**Coverage Target:** 80%

### 2. Tenant Isolation (`graphql/resolvers/entity-tenant-isolation.test.ts`)
**Priority:** CRITICAL

Tests for multi-tenant data isolation:
- ✅ Cross-tenant access prevention
- ✅ Tenant context validation
- ✅ Query parameter tenant filtering
- ✅ Concurrent tenant request handling
- ✅ Special character handling in tenant IDs

**Coverage Target:** 70%

### 3. Database Resilience (`db/neo4j-resilience.test.ts`)
**Priority:** CRITICAL

Tests for connection failure handling and graceful degradation:
- ✅ Connection initialization failures
- ✅ Network timeout handling
- ✅ DNS resolution failures
- ✅ Connectivity monitoring
- ✅ Mock mode fallback
- ✅ Session management
- ✅ Transaction rollback

**Coverage Target:** 70%

### 4. Rate Limiting (`middleware/rateLimiting.test.ts`)
**Priority:** HIGH

Tests for request throttling and abuse prevention:
- ✅ Default and custom configuration
- ✅ IP-based rate limiting
- ✅ Request counter reset
- ✅ High request rate handling
- ✅ Header manipulation prevention
- ✅ IPv6 support
- ✅ Proxy header handling

**Coverage Target:** 75%

### 5. Cypher Injection Prevention (`graphql/resolvers/cypher-injection.test.ts`)
**Priority:** CRITICAL

Tests for SQL/Cypher injection attacks:
- ✅ Query parameter injection attempts
- ✅ Entity type injection
- ✅ Entity ID injection
- ✅ MATCH clause injection
- ✅ UNION-style injection
- ✅ APOC procedure injection prevention
- ✅ Regex-based DoS prevention
- ✅ Multi-parameter attack combinations

**Coverage Target:** 80%

## Test Helpers

### Mock Factories

```typescript
import {
  createMockUser,
  createMockAdminUser,
  createMockViewerUser,
  createMockEntity,
  createMockContext,
  createMockJWT,
  createMockNeo4jDriver,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from './helpers/testHelpers';

// Create a mock user
const user = createMockUser({ tenant: 'test-tenant' });

// Create a mock admin
const admin = createMockAdminUser();

// Create a mock GraphQL context
const context = createMockContext({ role: 'ANALYST' });

// Create a mock Neo4j driver
const driver = createMockNeo4jDriver();

// Create mock Express objects
const req = createMockRequest({ ip: '192.168.1.100' });
const res = createMockResponse();
const next = createMockNext();
```

### Assertion Helpers

```typescript
import {
  assertErrorContains,
  assertNoSensitiveData,
} from './helpers/testHelpers';

// Assert error message contains specific text
assertErrorContains(error, 'Unauthorized');

// Assert no sensitive data in error message
assertNoSensitiveData(errorMessage);
```

### Async Helpers

```typescript
import { waitFor, flushPromises } from './helpers/testHelpers';

// Wait for specific duration
await waitFor(100);

// Flush all pending promises
await flushPromises();
```

## Coverage Thresholds

### Global Thresholds
- **Lines:** 20%
- **Statements:** 20%
- **Functions:** 20%
- **Branches:** 15%

### Critical File Thresholds
| File | Lines | Functions | Branches |
|------|-------|-----------|----------|
| `middleware/auth.ts` | 80% | 80% | 80% |
| `middleware/rbac.ts` | 75% | 75% | 75% |
| `db/neo4j.ts` | 70% | 70% | 70% |
| `graphql/resolvers/entity.ts` | 70% | 70% | 70% |

## Test Best Practices

### 1. Use Test Helpers
Always use the provided test helpers instead of creating mocks manually:

```typescript
// Good ✅
const user = createMockUser({ tenant: 'test-tenant' });

// Bad ❌
const user = { id: '123', tenant: 'test-tenant', email: 'test@example.com' };
```

### 2. Clean Up After Tests
Use `beforeEach` and `afterEach` for test isolation:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### 3. Test Edge Cases
Don't just test the happy path:

```typescript
it('should handle malformed input', () => {
  // Test null, undefined, empty string, special characters, etc.
});

it('should prevent security bypass attempts', () => {
  // Test injection, header manipulation, etc.
});
```

### 4. Verify No Information Leakage
Use `assertNoSensitiveData` to ensure errors don't expose sensitive info:

```typescript
it('should not leak sensitive information in errors', () => {
  const errorMessage = 'Database connection failed';
  assertNoSensitiveData(errorMessage);
});
```

### 5. Test Concurrent Scenarios
Test how your code handles concurrent requests:

```typescript
it('should handle concurrent requests correctly', async () => {
  const results = await Promise.all([
    handler(request1),
    handler(request2),
    handler(request3),
  ]);

  // Verify isolation and correctness
});
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main`, `develop`, or `claude/**` branches
- Every pull request

Coverage reports are:
- Posted as PR comments
- Uploaded to Codecov
- Available as GitHub Actions artifacts

## Coverage Improvement Roadmap

### Phase 1 (Weeks 1-4): Critical Security ✅ COMPLETED
- [x] Authentication middleware
- [x] Tenant isolation
- [x] Database resilience
- [x] Rate limiting
- [x] Injection prevention

**Target:** +15% coverage

### Phase 2 (Weeks 5-8): API Layer
- [ ] GraphQL resolver mutations
- [ ] Subscription lifecycle
- [ ] Context binding
- [ ] Error formatting
- [ ] Persisted queries

**Target:** +20% coverage (total: 35%)

### Phase 3 (Weeks 9-16): Business Logic
- [ ] Service layer
- [ ] Worker processes
- [ ] External integrations
- [ ] Complex algorithms
- [ ] Workflow orchestration

**Target:** +25% coverage (total: 60%)

## Troubleshooting

### Tests failing with "Cannot find module"
Ensure dependencies are installed:
```bash
pnpm install
```

### Tests timing out
Increase timeout in test file:
```typescript
jest.setTimeout(10000); // 10 seconds
```

Or for specific test:
```typescript
it('should complete', async () => {
  // test
}, 10000);
```

### Coverage not updating
Clear Jest cache:
```bash
pnpm test -- --clearCache
pnpm test:coverage
```

### Mock not working
Ensure mock is defined before importing the module:
```typescript
// Mock first
jest.mock('../../db/neo4j');

// Import second
const resolvers = await import('../../graphql/resolvers/entity');
```

## Contributing

When adding new tests:

1. **Follow the structure:** Place tests in appropriate directories
2. **Use helpers:** Leverage existing mock factories
3. **Document tests:** Add clear descriptions
4. **Test edge cases:** Don't just test happy paths
5. **Check coverage:** Ensure new tests actually cover the code
6. **Run full suite:** Verify no regressions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Coverage Reports](./coverage/lcov-report/index.html)

## Support

For questions or issues with tests:
- Check this README
- Review existing test examples
- Ask in #engineering-testing Slack channel
- Create an issue in GitHub

---

**Last Updated:** 2025-01-20
**Maintainers:** IntelGraph Engineering Team
