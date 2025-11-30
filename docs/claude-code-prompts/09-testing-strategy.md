# Prompt 9: Testing Strategy (Unit/Contract/E2E/Load/Chaos)

## Role
Principal Test Engineer

## Context
IntelGraph requires comprehensive testing to ensure:
- **Correctness** - Features work as designed
- **Performance** - SLOs are met under load
- **Reliability** - Systems degrade gracefully
- **Regression prevention** - Changes don't break existing functionality

Evidence-backed quality gates ensure production readiness.

## Task
Implement a comprehensive testing strategy:

### 1. Unit Tests (Jest)
- Business logic and utilities
- Resolver functions
- Data transformations
- Policy evaluation

### 2. Integration Tests (Jest + TestContainers)
- Database interactions (Neo4j, PostgreSQL)
- Cache operations (Redis)
- Message queue operations (Kafka)

### 3. Contract Tests (Pact)
- GraphQL schema contracts
- Service-to-service contracts
- API client contracts

### 4. E2E Tests (Playwright)
- Critical user journeys
- Golden path validation
- Cross-browser testing

### 5. Load Tests (k6)
- API throughput and latency
- Ingest pipeline capacity
- Graph query performance
- SLO validation

### 6. Chaos Engineering (Chaos Mesh or custom)
- Network latency injection
- Pod termination
- Database connection failures
- Degraded dependency scenarios

## Guardrails

### Coverage Thresholds
- **Critical paths**: ≥ 80% coverage
- **Business logic**: ≥ 90% coverage
- **Generated code**: Excluded from coverage

### SLO Validation
- k6 thresholds match SLO targets
- Tests fail if SLOs breached

### Test Execution
- Unit/integration: < 5 minutes
- E2E: < 10 minutes
- Load tests: Run nightly or on-demand

## Deliverables

### 1. Unit & Integration Tests
- [ ] `/tests` directory structure:
  - [ ] `unit/` - Pure logic tests
  - [ ] `integration/` - Database and service tests
  - [ ] `fixtures/` - Test data and mocks
  - [ ] `helpers/` - Test utilities

- [ ] Jest configuration:
  - [ ] `jest.config.js` with coverage thresholds
  - [ ] `jest.setup.js` for global setup
  - [ ] SWC transformer for TypeScript

- [ ] TestContainers setup for:
  - [ ] Neo4j
  - [ ] PostgreSQL
  - [ ] Redis

### 2. Contract Tests
- [ ] `tests/contract/` with Pact tests:
  - [ ] Provider tests (GraphQL schema)
  - [ ] Consumer tests (API clients)
  - [ ] Contract verification in CI

- [ ] Pact broker integration (if available)

### 3. E2E Tests
- [ ] `tests/e2e/` with Playwright tests:
  - [ ] Golden path test (Investigation → Entities → Relationships → Copilot)
  - [ ] Entity creation and editing
  - [ ] Relationship discovery
  - [ ] Search functionality
  - [ ] User authentication flows

- [ ] Playwright configuration:
  - [ ] Cross-browser (Chromium, Firefox, WebKit)
  - [ ] Parallelization
  - [ ] Screenshots on failure
  - [ ] Trace recording

### 4. Load Tests
- [ ] `tests/load/` with k6 scripts:
  - [ ] `api-load.js` - GraphQL API load test
  - [ ] `ingest-load.js` - Ingest pipeline load test
  - [ ] `graph-query-load.js` - Neo4j query load test
  - [ ] `concurrent-users.js` - Concurrent user simulation

- [ ] k6 thresholds matching SLOs
- [ ] Results exported to InfluxDB/Grafana (optional)

### 5. Chaos Experiments
- [ ] `tests/chaos/` with chaos scripts:
  - [ ] `network-latency.yaml` - Inject 100ms latency
  - [ ] `pod-failure.yaml` - Random pod termination
  - [ ] `db-connection-failure.yaml` - Simulate DB outage
  - [ ] Revert/cleanup procedures

- [ ] Chaos Mesh manifests (or equivalent)
- [ ] Observability during chaos (metrics, logs, traces)

### 6. Golden Path Dataset
- [ ] `data/test-fixtures/` with representative data:
  - [ ] Entities (Persons, Organizations, Events)
  - [ ] Relationships
  - [ ] Source documents
  - [ ] Provenance records

### 7. Documentation
- [ ] Testing strategy overview
- [ ] Test execution guide
- [ ] Writing new tests guide
- [ ] CI integration guide

## Acceptance Criteria
- ✅ `pnpm test:all` runs all test suites successfully
- ✅ Coverage reports show ≥ 80% for critical paths
- ✅ k6 thresholds meet SLOs (read p95 ≤ 350ms, write p95 ≤ 700ms)
- ✅ E2E tests pass on Chromium, Firefox, and WebKit
- ✅ Chaos experiment degrades gracefully (no data loss, circuit breakers engage)
- ✅ Chaos experiment triggers alerts in monitoring
- ✅ All tests documented with clear descriptions

## Jest Configuration Example

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
  },
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__generated__/**',
  ],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
```

## k6 Load Test Example

```javascript
// tests/load/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const readLatency = new Trend('read_latency');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp-up
    { duration: '5m', target: 100 },  // Sustained load
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<350', 'p(99)<900'],  // SLO
    'http_req_duration{type:write}': ['p(95)<700', 'p(99)<1500'], // SLO
    errors: ['rate<0.01'], // < 1% error rate
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

export default function () {
  // Read query
  const readPayload = JSON.stringify({
    query: `
      query GetEntity($id: ID!) {
        entity(id: $id) {
          id
          name
          type
          relationships {
            id
            type
          }
        }
      }
    `,
    variables: { id: 'entity-123' },
  });

  const readRes = http.post(API_URL, readPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'read' },
  });

  check(readRes, {
    'read status 200': (r) => r.status === 200,
    'read has data': (r) => JSON.parse(r.body).data !== null,
  }) || errorRate.add(1);

  readLatency.add(readRes.timings.duration);

  sleep(1);

  // Write mutation
  const writePayload = JSON.stringify({
    query: `
      mutation CreateEntity($input: CreateEntityInput!) {
        createEntity(input: $input) {
          id
          name
        }
      }
    `,
    variables: {
      input: {
        name: 'Test Entity',
        type: 'Organization',
      },
    },
  });

  const writeRes = http.post(API_URL, writePayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'write' },
  });

  check(writeRes, {
    'write status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
```

## Playwright E2E Test Example

```typescript
// tests/e2e/golden-path.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Golden Path - Investigation Flow', () => {
  test('should create investigation, add entities, discover relationships', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');

    // Create investigation
    await page.click('[data-testid="new-investigation"]');
    await page.fill('[data-testid="investigation-name"]', 'Test Investigation');
    await page.click('[data-testid="create-investigation"]');

    // Verify investigation created
    await expect(page.locator('[data-testid="investigation-title"]')).toHaveText('Test Investigation');

    // Add entity
    await page.click('[data-testid="add-entity"]');
    await page.fill('[data-testid="entity-name"]', 'John Doe');
    await page.selectOption('[data-testid="entity-type"]', 'Person');
    await page.click('[data-testid="save-entity"]');

    // Verify entity appears in graph
    await expect(page.locator('[data-testid="graph-node"]')).toContainText('John Doe');

    // Discover relationships
    await page.click('[data-testid="entity-menu"]');
    await page.click('[data-testid="discover-relationships"]');

    // Wait for relationship discovery
    await expect(page.locator('[data-testid="relationship-count"]')).not.toHaveText('0');

    // Query Copilot
    await page.fill('[data-testid="copilot-input"]', 'What connections does John Doe have?');
    await page.click('[data-testid="copilot-submit"]');

    // Verify Copilot response
    await expect(page.locator('[data-testid="copilot-response"]')).toBeVisible();
  });
});
```

## Chaos Experiment Example

```yaml
# tests/chaos/network-latency.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-neo4j
  namespace: intelgraph-staging
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - intelgraph-staging
    labelSelectors:
      app: neo4j
  delay:
    latency: '100ms'
    correlation: '100'
    jitter: '10ms'
  duration: '5m'
```

## Related Files
- `/home/user/summit/docs/TEST_STRATEGY.md` - Testing guidelines
- `/home/user/summit/tests/` - Test suites
- `/home/user/summit/scripts/smoke-test.js` - Smoke tests

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 9: Comprehensive testing strategy"

# Or use the slash command (if configured)
/testing-strategy
```

## Notes
- Use TestContainers for isolated integration tests
- Implement test data builders for complex objects
- Use Faker.js for generating realistic test data
- Consider snapshot testing for GraphQL responses
- Run load tests in dedicated environment (not production)
