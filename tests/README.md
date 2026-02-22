# Summit/IntelGraph Test Framework

Comprehensive testing framework for the Summit/IntelGraph platform providing type-safe factories, integration testing utilities, GraphQL resolver testing, and error scenario validation.

## Table of Contents

- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Test Factories](#test-factories)
- [Enhanced Factories](#enhanced-factories)
- [Integration Testing](#integration-testing)
- [GraphQL Testing](#graphql-testing)
- [Error Scenarios](#error-scenarios)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:jest --testPathPattern='unit'
pnpm test:jest --testPathPattern='integration'
pnpm test:jest --testPathPattern='error-scenarios'

# Run with coverage
pnpm test:coverage
```

## Directory Structure

```
tests/
├── factories/           # Test data factories
│   ├── base/           # Base factory classes and utilities
│   │   ├── BaseFactory.ts
│   │   └── index.ts
│   ├── enhanced/       # Enhanced domain-specific factories
│   │   ├── EnhancedUserFactory.ts
│   │   ├── EnhancedEntityFactory.ts
│   │   ├── EnhancedInvestigationFactory.ts
│   │   ├── EnhancedRelationshipFactory.ts
│   │   ├── EnhancedContextFactory.ts
│   │   ├── EnhancedGraphFactory.ts
│   │   └── index.ts
│   ├── userFactory.ts       # Legacy factories
│   ├── entityFactory.ts
│   ├── relationshipFactory.ts
│   ├── investigationFactory.ts
│   ├── graphFactory.ts
│   ├── requestFactory.ts
│   ├── contextFactory.ts
│   └── index.ts
├── integration/         # Integration tests
│   ├── framework/      # Integration test framework
│   │   ├── ServiceTestHarness.ts
│   │   ├── ContractTesting.ts
│   │   ├── TestHelpers.ts
│   │   └── index.ts
│   ├── graphql/        # GraphQL resolver tests
│   │   ├── ResolverTestUtils.ts
│   │   ├── entity.resolver.test.ts
│   │   └── index.ts
│   └── services/       # Service integration tests
├── error-scenarios/     # Error handling tests
│   ├── ErrorScenarioFramework.ts
│   ├── api-error-scenarios.test.ts
│   └── index.ts
├── e2e/                # End-to-end tests (Playwright)
├── unit/               # Unit tests
└── README.md           # This file
```

## Test Factories

### Legacy Factories

Test factories provide consistent, reusable test data generation:

```typescript
import {
  userFactory,
  entityFactory,
  investigationFactory,
  graphFactory,
} from '../tests/factories';

// Create test data
const user = userFactory({ role: 'admin' });
const entity = entityFactory({ type: 'person' });
const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });
```

### Available Legacy Factories

- **userFactory**: Generate test users with various roles and permissions
- **entityFactory**: Create graph entities (person, organization, IP, domain, etc.)
- **relationshipFactory**: Create graph relationships between entities
- **investigationFactory**: Generate investigation test data
- **graphFactory**: Create complete graph structures with nodes and relationships
- **requestFactory/responseFactory**: Mock HTTP requests and responses
- **contextFactory**: Create GraphQL execution contexts

## Enhanced Factories

The enhanced factory system provides type-safe, trait-based test data generation.

### Base Factory System

```typescript
import { defineFactory, random, getSequence, resetAllSequences } from '@tests/factories/base';

// Define a factory
const userFactory = defineFactory<User>({
  defaults: () => ({
    id: random.uuid(),
    email: random.email('user'),
    role: 'analyst',
  }),
  traits: {
    admin: { role: 'admin' },
    inactive: { isActive: false },
  },
});

// Usage
const user = userFactory.build();
const admin = userFactory.buildWithTrait('admin');
const users = userFactory.buildList(5);

// Fluent API
const customUser = userFactory.with
  .trait('admin')
  .attrs({ email: 'custom@test.com' })
  .build();

// Reset sequences between tests
beforeEach(() => resetAllSequences());
```

### Domain-Specific Factories

```typescript
import {
  enhancedUserFactory,
  enhancedEntityFactory,
  enhancedInvestigationFactory,
  enhancedRelationshipFactory,
  enhancedContextFactory,
  createThreatIntelGraph,
  createInvestigationGraph,
} from '@tests/factories/enhanced';

// Users with roles
const admin = enhancedUserFactory.buildWithTrait('admin');
const analyst = enhancedUserFactory.buildWithTrait('analyst');
const viewer = enhancedUserFactory.buildWithTrait('viewer');

// Entities with types and confidence
const person = enhancedEntityFactory.buildWithTrait('person');
const maliciousIP = enhancedEntityFactory.buildWithTraits(['ipAddress', 'malicious', 'highConfidence']);

// Investigations
const criticalCase = enhancedInvestigationFactory.buildWithTraits(['critical', 'inProgress']);
const aptInvestigation = enhancedInvestigationFactory.buildWithTrait('aptInvestigation');

// GraphQL contexts
const adminContext = enhancedContextFactory.buildWithTrait('admin');
const viewerContext = enhancedContextFactory.buildWithTrait('viewer');
const unauthContext = enhancedContextFactory.buildWithTrait('unauthenticated');

// Complex graphs
const threatGraph = createThreatIntelGraph({ investigationId: 'inv-123' });
const investigationGraph = createInvestigationGraph(20);
```

### Available Traits

#### User Traits
- `admin`, `analyst`, `viewer` - Role-based
- `inactive`, `unverified` - State-based
- `withRecentLogin`, `multiTenant` - Behavioral

#### Entity Traits
- `person`, `organization`, `ipAddress`, `domain`, `threat`, `malware` - Type-based
- `highConfidence`, `mediumConfidence`, `lowConfidence` - Confidence levels
- `osint`, `sigint`, `humint`, `threatFeed` - Source types
- `malicious`, `benign` - Classification

#### Investigation Traits
- `draft`, `open`, `inProgress`, `closed`, `archived` - Status
- `lowPriority`, `critical`, `emergency` - Priority
- `secret`, `topSecret` - Classification
- `aptInvestigation`, `incidentResponse` - Templates

#### Context Traits
- `authenticated`, `unauthenticated` - Auth state
- `admin`, `analyst`, `viewer` - Roles
- `enterprise`, `starter`, `free` - Plans
- `withAuthService`, `withGraphService`, `withCopilotService` - Services

## Integration Testing

### Service Test Harness

```typescript
import {
  ServiceTestHarness,
  createDefaultHarness,
} from '@tests/integration/framework';

describe('API Integration', () => {
  const harness = createDefaultHarness();

  beforeAll(async () => {
    await harness.setup();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it('should connect to all services', async () => {
    const health = harness.getHealthStatus();
    expect(health.get('api')?.status).toBe('healthy');
  });
});
```

### Contract Testing

```typescript
import {
  ContractVerifier,
  defineContract,
  CommonSchemas,
} from '@tests/integration/framework';

const verifier = new ContractVerifier();

const contract = defineContract()
  .name('API-GraphAPI-Contract')
  .version('1.0.0')
  .provider('api')
  .consumer('graph-api')
  .get('/health', 'Health check')
    .willRespondWith(200, { status: 'ok' }, CommonSchemas.healthResponse)
  .post('/api/entities', 'Create entity')
    .withRequestBody({ name: 'Test', type: 'person' })
    .willRespondWith(201, null, CommonSchemas.entity)
  .build();

const result = await verifier.verify(contract, 'http://localhost:4000');
```

### Test Helpers

```typescript
import {
  retry,
  waitFor,
  timeout,
  graphqlRequest,
  assert,
  TestDataCleaner,
  TestMetrics,
} from '@tests/integration/framework';

// Retry with backoff
const result = await retry(
  () => fetchData(),
  { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }
);

// Wait for condition
await waitFor(
  () => isServiceReady(),
  { timeout: 30000, interval: 1000 }
);

// GraphQL requests
const response = await graphqlRequest('http://localhost:4000/graphql', {
  query: `query { entity(id: "123") { id name } }`,
});

// Assertions
assert.noGraphQLErrors(response);
assert.hasData(response);

// Cleanup
const cleaner = new TestDataCleaner();
cleaner.registerEntity('http://localhost:4000/api/entities', entityId);
await cleaner.cleanup();

// Metrics
const metrics = new TestMetrics();
metrics.recordLatency('api-response', startTime);
console.log(metrics.getStats('api-response'));
```

## GraphQL Testing

### Resolver Tester

```typescript
import {
  ResolverTester,
  createResolverTester,
  resolverAssertions,
  TestQueries,
  TestMutations,
} from '@tests/integration/graphql';

const tester = createResolverTester({ schema: mySchema });

// Test queries
const result = await tester.query(TestQueries.getEntity, {
  variables: { id: '123' },
});

resolverAssertions.noErrors(result);
resolverAssertions.hasData(result);
resolverAssertions.withinTime(result, 100);

// Test with different roles
const adminResult = await tester.asAdmin().query('...');
const viewerResult = await tester.asViewer().query('...');
const unauthResult = await tester.asUnauthenticated().query('...');

// Test mutations
const createResult = await tester.mutate(TestMutations.createEntity, {
  variables: { input: { name: 'Test', type: 'person' } },
});

// Test authorization
resolverAssertions.hasAuthError(unauthResult);
resolverAssertions.hasAuthorizationError(viewerDeleteResult);
```

## Error Scenarios

### Error Scenario Runner

```typescript
import {
  ErrorScenarioRunner,
  CommonErrorScenarios,
  createErrorScenarioRunner,
} from '@tests/error-scenarios';

const runner = createErrorScenarioRunner();

// Register scenarios
runner.registerScenario(
  CommonErrorScenarios.databaseConnectionFailure(
    async () => db.query('SELECT 1'),
    async (result) => result instanceof Error
  )
);

runner.registerScenario(
  CommonErrorScenarios.requestTimeout(
    async () => slowRequest(),
    async (result) => result instanceof Error,
    5000
  )
);

// Run all scenarios
const results = await runner.runAll();
const summary = runner.getSummary();

console.log(`Pass rate: ${summary.passRate * 100}%`);
```

### Error Injector

```typescript
import { ErrorInjector, createErrorInjector } from '@tests/error-scenarios';

const injector = createErrorInjector();

// Configure injection
injector.configure('database', {
  type: 'connection_refused',
  probability: 0.5, // 50% failure rate
});

// Enable injection
injector.enable('database');

// Wrap functions
const wrappedQuery = injector.wrap('database', db.query);

// Disable injection
injector.disableAll();
```

## Running Tests

### Local Development

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:jest --testPathPattern='unit'

# Integration tests (requires services)
docker-compose -f docker-compose.dev.yml up -d
pnpm test:jest --testPathPattern='integration'

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# Specific file
pnpm test:jest tests/integration/graphql/entity.resolver.test.ts
```

### Test Coverage

We maintain high test coverage standards:

- **Global minimum**: 80%
- **Critical paths**: 85% (middleware, resolvers, core services)

```bash
pnpm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions

The enhanced testing workflow (`.github/workflows/enhanced-testing.yml`) runs:

1. **Unit Tests** - Fast feedback on code changes
2. **Integration Tests** - Service integration validation
3. **GraphQL Tests** - Resolver testing
4. **Error Scenario Tests** - Error handling validation
5. **Coverage Report** - Aggregated test coverage

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Nightly builds

### Manual Trigger

```bash
# Via GitHub CLI
gh workflow run enhanced-testing.yml \
  --field test_type=integration \
  --field verbose=true
```

## Best Practices

### DO:
- ✅ Use test factories for consistent data
- ✅ Use traits for variations (not separate factories)
- ✅ Reset sequences between tests with `resetAllSequences()`
- ✅ Write isolated, independent tests
- ✅ Test edge cases and error scenarios
- ✅ Mock external dependencies
- ✅ Clean up after tests with `TestDataCleaner`
- ✅ Use descriptive test names

### DON'T:
- ❌ Share state between tests
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Use hardcoded IDs or timestamps
- ❌ Skip test cleanup
- ❌ Create multiple factories for variations (use traits)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [CLAUDE.md Testing Section](../CLAUDE.md#testing-strategy)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full testing guidelines
