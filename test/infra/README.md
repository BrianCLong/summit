# Test Infrastructure Standards

> **Status**: ENFORCED
> **Version**: 1.0.0
> **Authority**: Release Captain
> **Created**: 2026-01-01
> **Parent Document**: `docs/ga/GA_DEFINITION.md` Part 3

---

## 1. OVERVIEW

This directory contains **mandatory test infrastructure helpers** that ensure deterministic, isolated, and reliable test execution across Summit.

**Core Principle**:
> Tests fail for real reasons only.

**Operating Constraint**:
> All tests must use helpers from this directory for singletons, state management, and cleanup.

---

## 2. REQUIRED IMPORTS

### 2.1 Metric Registry Reset

**Problem**: Prometheus metrics registry is a singleton. Tests that register metrics without cleanup cause collisions.

**Solution**: Import and use `resetMetricRegistry()` in `beforeEach` or `afterEach`.

**Location**: `test/infra/metrics.ts`

**Usage**:
```typescript
import { resetMetricRegistry } from '../../test/infra/metrics';

describe('MyService', () => {
  beforeEach(() => {
    resetMetricRegistry();
  });

  it('should track request count', () => {
    const service = new MyService();
    service.handleRequest();
    expect(service.metrics.requestCount).toBe(1);
  });
});
```

**Enforcement**: Lint rule (ESLint) flags metric registration without reset.

---

### 2.2 Network Isolation Guard

**Problem**: Tests that make real HTTP calls are slow, flaky, and leak state.

**Solution**: Use `enableNetworkIsolation()` to block all outbound network calls during tests.

**Location**: `test/infra/network.ts`

**Usage**:
```typescript
import { enableNetworkIsolation, disableNetworkIsolation } from '../../test/infra/network';

describe('APIClient', () => {
  beforeAll(() => {
    enableNetworkIsolation();
  });

  afterAll(() => {
    disableNetworkIsolation();
  });

  it('should throw when attempting real network call', () => {
    const client = new APIClient();
    expect(() => client.fetchData('https://example.com')).toThrow('Network isolation enabled');
  });
});
```

**Exceptions**: Integration tests (use `test:integration` script, skip network isolation).

---

### 2.3 Clock Control (Fake Timers)

**Problem**: Tests that rely on `setTimeout`, `setInterval`, or `Date.now()` are non-deterministic.

**Solution**: Use `useFakeTimers()` and `advanceTimers()` helpers.

**Location**: `test/infra/time.ts`

**Usage**:
```typescript
import { useFakeTimers, advanceTimers, restoreTimers } from '../../test/infra/time';

describe('RateLimiter', () => {
  beforeEach(() => {
    useFakeTimers();
  });

  afterEach(() => {
    restoreTimers();
  });

  it('should reset limit after 60 seconds', () => {
    const limiter = new RateLimiter({ limit: 100, windowSeconds: 60 });
    limiter.consume(100);
    expect(limiter.isExhausted()).toBe(true);

    advanceTimers(60000); // Advance 60 seconds
    expect(limiter.isExhausted()).toBe(false);
  });
});
```

---

### 2.4 Database Test Fixtures

**Problem**: Tests that rely on shared database state interfere with each other.

**Solution**: Use `createTestDatabase()` and `cleanupTestDatabase()` for isolated DB per test.

**Location**: `test/infra/database.ts`

**Usage**:
```typescript
import { createTestDatabase, cleanupTestDatabase } from '../../test/infra/database';

describe('UserRepository', () => {
  let db: TestDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('should create user', async () => {
    const repo = new UserRepository(db.pool);
    const user = await repo.create({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });
});
```

**Implementation**:
- Spins up isolated Postgres schema per test
- Runs migrations
- Cleans up after test (truncate + drop schema)

---

### 2.5 Redis Test Fixtures

**Problem**: Tests that rely on shared Redis state interfere with each other.

**Solution**: Use `createTestRedis()` and `cleanupTestRedis()` for isolated Redis per test.

**Location**: `test/infra/redis.ts`

**Usage**:
```typescript
import { createTestRedis, cleanupTestRedis } from '../../test/infra/redis';

describe('CacheService', () => {
  let redis: TestRedis;

  beforeEach(async () => {
    redis = await createTestRedis();
  });

  afterEach(async () => {
    await cleanupTestRedis(redis);
  });

  it('should cache value', async () => {
    const cache = new CacheService(redis.client);
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });
});
```

**Implementation**:
- Uses unique Redis DB index per test (0-15)
- Flushes DB after test

---

## 3. TEST RUNNER STANDARDS

### 3.1 Node Services

**Test Runner**: `node:test` + `tsx`

**Rationale**:
- Native Node.js test runner (no dependencies)
- Built-in TypeScript support via `tsx`
- Deterministic, fast, isolated

**Configuration**: `package.json`
```json
{
  "scripts": {
    "test": "node --test --require tsx/register 'src/**/*.test.ts'",
    "test:watch": "node --test --watch --require tsx/register 'src/**/*.test.ts'"
  }
}
```

**Example Test**:
```typescript
// src/services/auth.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AuthService } from './auth';

describe('AuthService', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Teardown
  });

  it('should validate JWT token', () => {
    const service = new AuthService();
    const token = service.generateToken({ userId: '123' });
    assert.ok(service.validateToken(token));
  });
});
```

---

### 3.2 Pure Logic (No I/O)

**Test Runner**: `node:test` only (no tsx needed for JS files)

**Rationale**:
- Fastest execution
- No compilation step
- Ideal for utility functions, pure logic

**Example Test**:
```javascript
// src/utils/format.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatCurrency } from './format.js';

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    assert.strictEqual(formatCurrency(1234.56, 'USD'), '$1,234.56');
  });
});
```

---

### 3.3 Integration Tests

**Test Runner**: `node:test` + `tsx` (with real DB, Redis, etc.)

**Configuration**: `package.json`
```json
{
  "scripts": {
    "test:integration": "node --test --require tsx/register 'test/integration/**/*.test.ts'"
  }
}
```

**Example Test**:
```typescript
// test/integration/api.test.ts
import { describe, it, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { startServer, stopServer } from '../../test/infra/server';

describe('API Integration', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  it('should return 200 for health check', async () => {
    const res = await fetch('http://localhost:3000/health');
    assert.strictEqual(res.status, 200);
  });
});
```

---

## 4. MANDATORY PATTERNS

### 4.1 Singleton Cleanup

**Rule**: Every test that creates a singleton must clean it up.

**Examples of Singletons**:
- Metrics registry (Prometheus)
- Logger instance
- Database connection pool
- Redis client
- HTTP server

**Pattern**:
```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(async () => {
    await service.cleanup(); // Close connections, reset state
  });

  it('should work', () => {
    // Test code
  });
});
```

**Enforcement**: CI fails if hanging processes detected after test run.

---

### 4.2 Explicit Teardown Contracts

**Rule**: Every service that allocates resources must implement a `cleanup()` or `dispose()` method.

**Interface**:
```typescript
interface Disposable {
  cleanup(): Promise<void>;
}

class MyService implements Disposable {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({ /* ... */ });
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}
```

**Usage in Tests**:
```typescript
afterEach(async () => {
  await service.cleanup();
});
```

**Enforcement**: Lint rule requires `cleanup()` method on classes that extend `Service` base class.

---

### 4.3 No Global State

**Rule**: Tests must not rely on or mutate global state.

**Bad**:
```typescript
// ❌ BAD: Mutates global config
import { config } from './config';

describe('MyService', () => {
  it('should use custom port', () => {
    config.port = 9999; // ❌ Mutates global!
    const service = new MyService();
    expect(service.port).toBe(9999);
  });
});
```

**Good**:
```typescript
// ✅ GOOD: Injects config
describe('MyService', () => {
  it('should use custom port', () => {
    const config = { port: 9999 };
    const service = new MyService(config);
    expect(service.port).toBe(9999);
  });
});
```

---

## 5. CONTINUOUS INTEGRATION REQUIREMENTS

### 5.1 Deterministic Execution

**Requirement**: Tests must pass 100% of the time in CI (no flakes).

**Enforcement**:
- Flaky tests moved to `test:quarantine` (non-blocking)
- Core test suite must achieve 100% pass rate
- CI fails if any core test fails

**Tracking**:
```bash
# Identify flaky tests (run 100 times)
for i in {1..100}; do pnpm test || echo "FAIL $i"; done
```

---

### 5.2 Parallel Execution

**Requirement**: Tests should be parallelizable (no shared state, no race conditions).

**Configuration**: `node:test` supports `--test-concurrency` flag.

```json
{
  "scripts": {
    "test": "node --test --test-concurrency=4 --require tsx/register 'src/**/*.test.ts'"
  }
}
```

**Validation**: CI runs tests in parallel, no failures.

---

### 5.3 Timeout Enforcement

**Requirement**: Tests must complete within reasonable time (default: 30s per test).

**Configuration**:
```typescript
import { describe, it } from 'node:test';

describe('SlowService', () => {
  it('should timeout if too slow', { timeout: 5000 }, async () => {
    // Test must complete within 5 seconds
    await slowOperation();
  });
});
```

**Enforcement**: CI fails if any test exceeds timeout.

---

## 6. DIRECTORY STRUCTURE

```
test/
├── infra/                    # Mandatory infrastructure helpers
│   ├── README.md             # This file
│   ├── metrics.ts            # Metric registry reset
│   ├── network.ts            # Network isolation
│   ├── time.ts               # Fake timers
│   ├── database.ts           # Test database fixtures
│   ├── redis.ts              # Test Redis fixtures
│   ├── server.ts             # Test server (integration tests)
│   └── logger.ts             # Test logger (silence logs)
├── integration/              # Integration tests (real I/O)
│   ├── api.test.ts
│   ├── database.test.ts
│   └── redis.test.ts
├── fixtures/                 # Test data (JSON, CSV, etc.)
│   ├── users.json
│   └── policies.rego
└── helpers/                  # Test-specific helpers (not infra)
    └── factories.ts          # Data factories
```

---

## 7. IMPLEMENTATION STATUS

### 7.1 Phase 1 (Immediate)

- [ ] Create `test/infra/metrics.ts`
- [ ] Create `test/infra/network.ts`
- [ ] Create `test/infra/time.ts`
- [ ] Create `test/infra/database.ts`
- [ ] Create `test/infra/redis.ts`
- [ ] Create `test/infra/server.ts`
- [ ] Create `test/infra/logger.ts`

### 7.2 Phase 2 (Week 1)

- [ ] Migrate existing tests to use infra helpers
- [ ] Add ESLint rules for enforcement
- [ ] Update CI to detect hanging processes
- [ ] Document test patterns in `CONTRIBUTING.md`

### 7.3 Phase 3 (Week 2)

- [ ] Achieve 100% core test pass rate
- [ ] Move flaky tests to quarantine
- [ ] Enable parallel test execution in CI
- [ ] Monitor test execution time (P95 <2min)

---

## 8. ENFORCEMENT

### 8.1 CI Enforcement

**Gate**: Tests must pass to merge.

**Configuration**: `.github/workflows/ci-core.yml`
```yaml
- name: Run unit tests
  run: pnpm test:unit
  # No continue-on-error allowed
```

**Failure Action**: PR blocked, cannot merge.

---

### 8.2 Lint Enforcement

**Rule**: ESLint plugin enforces infra helper usage.

**Example Rules**:
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'summit/require-metrics-reset': 'error',
    'summit/require-cleanup-method': 'error',
    'summit/no-network-in-unit-tests': 'error',
    'summit/no-global-state-mutation': 'error',
  },
};
```

---

### 8.3 Code Review Enforcement

**Checklist**:
- [ ] Test uses `resetMetricRegistry()` if it registers metrics
- [ ] Test uses `cleanup()` for all resources (DB, Redis, HTTP)
- [ ] Test does not make real network calls (unless integration test)
- [ ] Test does not rely on global state
- [ ] Test has explicit timeout (if long-running)

---

## 9. EXAMPLES

### 9.1 Complete Unit Test Example

```typescript
// src/services/rate-limiter.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { RateLimiter } from './rate-limiter';
import { resetMetricRegistry } from '../../test/infra/metrics';
import { createTestRedis, cleanupTestRedis } from '../../test/infra/redis';
import { useFakeTimers, advanceTimers, restoreTimers } from '../../test/infra/time';

describe('RateLimiter', () => {
  let redis: TestRedis;

  beforeEach(async () => {
    resetMetricRegistry();
    useFakeTimers();
    redis = await createTestRedis();
  });

  afterEach(async () => {
    await cleanupTestRedis(redis);
    restoreTimers();
  });

  it('should limit requests within window', async () => {
    const limiter = new RateLimiter({
      redis: redis.client,
      limit: 10,
      windowSeconds: 60,
    });

    for (let i = 0; i < 10; i++) {
      const allowed = await limiter.allow('user123');
      assert.strictEqual(allowed, true);
    }

    const denied = await limiter.allow('user123');
    assert.strictEqual(denied, false);
  });

  it('should reset limit after window expires', async () => {
    const limiter = new RateLimiter({
      redis: redis.client,
      limit: 10,
      windowSeconds: 60,
    });

    for (let i = 0; i < 10; i++) {
      await limiter.allow('user123');
    }

    advanceTimers(60000); // Advance 60 seconds

    const allowed = await limiter.allow('user123');
    assert.strictEqual(allowed, true);
  });
});
```

### 9.2 Complete Integration Test Example

```typescript
// test/integration/api-rate-limit.test.ts
import { describe, it, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { startServer, stopServer } from '../infra/server';
import { createTestRedis, cleanupTestRedis } from '../infra/redis';

describe('API Rate Limiting Integration', () => {
  let redis: TestRedis;

  beforeAll(async () => {
    redis = await createTestRedis();
    await startServer({ redisClient: redis.client });
  });

  afterAll(async () => {
    await stopServer();
    await cleanupTestRedis(redis);
  });

  it('should rate limit API requests', async () => {
    // Make 100 requests (limit is 100/min)
    for (let i = 0; i < 100; i++) {
      const res = await fetch('http://localhost:3000/api/data');
      assert.strictEqual(res.status, 200);
    }

    // 101st request should be rate limited
    const res = await fetch('http://localhost:3000/api/data');
    assert.strictEqual(res.status, 429);
  });
});
```

---

## 10. MIGRATION GUIDE

### 10.1 Migrating Existing Tests

**Step 1**: Identify singletons and state
- Grep for `new Pool`, `new Redis`, `prometheus.register`, `new Server`

**Step 2**: Add cleanup
- Import helpers from `test/infra/`
- Add `beforeEach` and `afterEach` hooks

**Step 3**: Validate
- Run tests 10 times: `for i in {1..10}; do pnpm test || break; done`
- Check for hanging processes: `lsof -i :3000` (should be empty after tests)

**Step 4**: Remove global state
- Convert global config to dependency injection
- Use test fixtures instead of shared state

---

## CONCLUSION

**Test infrastructure is not optional. It is a hard requirement for GA.**

**Enforcement**: CI-enforced, lint-enforced, code-review-enforced.

**Questions?** → Open issue with label `test-infra-question`

---

**End of Test Infrastructure Standards**
