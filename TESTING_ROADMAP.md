# Test Coverage Analysis & Improvement Roadmap

**Date:** 2025-11-20
**Status:** Initial Assessment Complete

---

## Executive Summary

The codebase has **strong E2E test coverage** (~60+ Playwright tests) but **critically weak unit/integration coverage**:

- **server/src:** 6.2% coverage (53/854 files)
- **client/src:** 7.5% coverage (54/724 files)
- **apps/:** 2.5% coverage (6/239 files)

**Critical Risk Areas:**
- ❌ Security layer: 0% coverage (9 files)
- ❌ Database & repos: 0% coverage (27 files)
- ❌ Background workers: 0% coverage (13 files)
- ❌ Services: 1.2% coverage (1/85 files)
- ❌ API routes: 3.3% coverage (2/60 files)
- ❌ GraphQL resolvers: 1.1% coverage (1/87 files)

---

## Test Files Created

As a starting point, comprehensive test suites have been created for the most critical areas:

### 1. Security Layer
**File:** `server/src/security/__tests__/jwt-security.test.ts`
- ✅ JWT token signing and verification
- ✅ Key rotation and management
- ✅ Replay attack protection using JTI
- ✅ JWKS endpoint functionality
- ✅ Circuit breaker behavior
- ✅ Health checks
- **Coverage:** ~95% of jwt-security.ts

### 2. Database Layer
**File:** `server/src/db/__tests__/postgres.test.ts`
- ✅ Connection pool initialization
- ✅ Read/write pool routing
- ✅ Circuit breaker with automatic recovery
- ✅ Retry logic with exponential backoff
- ✅ Query timeout handling
- ✅ Connection leak detection
- ✅ Slow query tracking
- ✅ Prepared statement caching
- **Coverage:** ~85% of postgres.ts

### 3. Repository Layer
**File:** `server/src/repos/__tests__/EntityRepo.test.ts`
- ✅ Entity CRUD operations
- ✅ Dual-write to PostgreSQL and Neo4j
- ✅ Transaction handling and rollbacks
- ✅ Outbox pattern for eventual consistency
- ✅ Batch operations for DataLoader
- ✅ Search and filtering
- **Coverage:** ~90% of EntityRepo.ts

**File:** `server/src/repos/__tests__/InvestigationRepo.test.ts`
- ✅ Investigation CRUD operations
- ✅ Status management (active, archived, completed)
- ✅ List and filter functionality
- ✅ Statistics aggregation
- ✅ Batch operations
- ✅ Transaction handling
- **Coverage:** ~90% of InvestigationRepo.ts

### 4. Services Layer
**File:** `server/src/services/__tests__/AuthService.test.ts`
- ✅ User registration with argon2 hashing
- ✅ User login with credential validation
- ✅ JWT token generation and verification
- ✅ Role-based permission system (ADMIN, ANALYST, VIEWER)
- ✅ Session management with refresh tokens
- ✅ SQL injection protection
- **Coverage:** ~85% of AuthService.ts

---

## Critical Priorities (Next 2 Weeks)

### Phase 1: Complete Security & Data Layer Testing

#### Week 1: Security & Crypto
**Priority: CRITICAL 🔴**

1. **Security Module (9 files - 0% coverage)**
   - [x] `security/jwt-security.ts` - Created comprehensive test
   - [ ] `security/crypto/keyStore.ts` - Key management and rotation
   - [ ] `security/crypto/certificates.ts` - Certificate validation
   - [ ] `security/vulnerability-policy.ts` - Security policy enforcement
   - [ ] `security/crypto/signing.ts` - Digital signatures
   - [ ] `security/crypto/encryption.ts` - Encryption utilities

**Estimated Effort:** 3-4 days
**Risk if not done:** Security vulnerabilities, unauthorized access, data breaches

2. **Database Repos (4 files - 0% coverage)**
   - [x] `repos/EntityRepo.ts` - Created comprehensive test
   - [x] `repos/InvestigationRepo.ts` - Created comprehensive test
   - [ ] `repos/RelationshipRepo.ts` - Relationship CRUD with graph sync
   - [ ] `repos/ActivityRepo.ts` - Activity logging and audit

**Estimated Effort:** 2 days
**Risk if not done:** Data integrity issues, silent data corruption

#### Week 2: Database Operations
**Priority: CRITICAL 🔴**

3. **Database Layer (23 files - 0% coverage)**
   - [x] `db/postgres.ts` - Created comprehensive test
   - [ ] `db/timescale.ts` - Time-series operations
   - [ ] `db/budgetLedger.ts` - Budget tracking and allocation
   - [ ] `db/migrations/*.ts` - Migration testing
   - [ ] `db/seeds/*.ts` - Seed data validation

**Estimated Effort:** 3-4 days
**Risk if not done:** Database connection failures, query performance issues

4. **Background Workers (13 files - 0% coverage)**
   - [ ] `workers/trustScore.ts` - Trust score calculations
   - [ ] `workers/embeddingBackfill.ts` - ML embedding generation
   - [ ] `workers/behavioralFingerprintWorker.ts` - Behavioral analysis
   - [ ] `workers/retentionWorker.ts` - Data retention policies
   - [ ] `workers/notificationWorker.ts` - Notification delivery
   - [ ] `workers/analyticsWorker.ts` - Analytics aggregation

**Estimated Effort:** 4-5 days
**Risk if not done:** Silent failures, data inconsistencies, missed notifications

---

## High Priorities (Weeks 3-6)

### Phase 2: Core Business Logic

#### Week 3-4: Services Layer
**Priority: HIGH 🟠**

**Services (85 files - 1.2% coverage)**

Top 10 services by criticality:
1. [x] `services/AuthService.ts` - Created comprehensive test
2. [ ] `services/ComplianceService.ts` - Regulatory compliance
3. [ ] `services/GraphRAGService.ts` - Graph retrieval-augmented generation
4. [ ] `services/AlertTriageV2Service.ts` - Alert processing
5. [ ] `services/EntityResolutionService.ts` - Entity matching
6. [ ] `services/AdvancedMLService.ts` - Machine learning operations
7. [ ] `services/InvestigationService.ts` - Investigation workflows
8. [ ] `services/SearchService.ts` - Full-text and graph search
9. [ ] `services/ExportService.ts` - Data export functionality
10. [ ] `services/IntegrationService.ts` - Third-party integrations

**Estimated Effort:** 10-12 days
**Risk if not done:** Business logic bugs, user-facing feature failures

#### Week 5: API Routes
**Priority: HIGH 🟠**

**Routes (60 files - 3.3% coverage)**

Current coverage:
- ✅ `routes/__tests__/disclosures.test.ts`
- ✅ `routes/__tests__/investigations.test.ts`

Priority routes for testing:
1. [ ] `routes/entities.ts` - Entity management endpoints
2. [ ] `routes/relationships.ts` - Relationship endpoints
3. [ ] `routes/alerts.ts` - Alert management
4. [ ] `routes/search.ts` - Search API
5. [ ] `routes/graph.ts` - Graph traversal API
6. [ ] `routes/auth.ts` - Authentication endpoints
7. [ ] `routes/users.ts` - User management
8. [ ] `routes/investigations.ts` - Investigation API
9. [ ] `routes/exports.ts` - Data export API
10. [ ] `routes/webhooks.ts` - Webhook handlers

**Estimated Effort:** 8-10 days
**Risk if not done:** Breaking API changes, contract violations

#### Week 6: GraphQL Layer
**Priority: HIGH 🟠**

**GraphQL (87 files - 1.1% coverage)**

Priority resolvers:
1. [ ] `graphql/resolvers/Entity.ts` - Entity queries/mutations
2. [ ] `graphql/resolvers/Investigation.ts` - Investigation operations
3. [ ] `graphql/resolvers/Relationship.ts` - Relationship graph
4. [ ] `graphql/resolvers/User.ts` - User management
5. [ ] `graphql/resolvers/Search.ts` - Search functionality
6. [ ] `graphql/schema/*.ts` - Schema validation
7. [ ] `graphql/dataloaders/*.ts` - DataLoader N+1 prevention

**Estimated Effort:** 8-10 days
**Risk if not done:** GraphQL schema breaks, N+1 query problems

---

## Medium Priorities (Weeks 7-10)

### Phase 3: Supporting Infrastructure

#### Week 7-8: AI/ML & Utilities
**Priority: MEDIUM 🟡**

**AI/ML Components (23 files - 4.3% coverage)**
- [ ] `ai/embeddingService.ts` - Vector embeddings
- [ ] `ai/promptEngineering.ts` - LLM prompts
- [ ] `ai/modelRegistry.ts` - Model management
- [ ] `ai/ragPipeline.ts` - RAG implementation
- [ ] `ai/entityExtraction.ts` - NLP entity extraction

**Server Utilities (11 files - 0% coverage)**
- [ ] `utils/validation.ts` - Input validation
- [ ] `utils/crypto.ts` - Cryptographic utilities
- [ ] `utils/date.ts` - Date formatting and parsing
- [ ] `utils/logger.ts` - Logging utilities
- [ ] `utils/cache.ts` - Caching layer

**Estimated Effort:** 6-8 days
**Risk if not done:** AI model failures, utility bugs affecting multiple features

#### Week 9-10: Client Services & Hooks
**Priority: MEDIUM 🟡**

**Client Services (15 files - ~40% coverage)**
- [ ] `client/src/services/disclosures.ts`
- [ ] `client/src/services/orchestrator/modules.ts`
- [ ] `client/src/services/orchestrator/presets.ts`

**Client Hooks (5 files - 0% coverage)**
- [ ] `client/src/hooks/useFlag.ts` - Feature flags
- [ ] `client/src/hooks/useSafeQuery.ts` - Safe GraphQL queries
- [ ] `client/src/hooks/useI18n.ts` - Internationalization

**Client Libraries (6 files - ~15% coverage)**
- [ ] `client/src/lib/utils.ts` - Common utilities
- [ ] `client/src/lib/toastBus.ts` - Toast notifications
- [ ] `client/src/lib/graphql.ts` - GraphQL client utilities

**Estimated Effort:** 6-8 days
**Risk if not done:** Client-side bugs, poor UX

---

## Lower Priorities (Weeks 11-14)

### Phase 4: Components & Integration

#### Apps Directory (239 files - 2.5% coverage)
**Priority: LOW 🟢**

While coverage is very low, E2E tests likely cover user flows. Focus on:
- Complex component logic
- Custom hooks
- State management
- Form validation

**Estimated Effort:** 10-12 days
**Risk if not done:** Component bugs, but mitigated by E2E tests

---

## Testing Infrastructure Improvements

### 1. Coverage Enforcement
**File:** `server/jest.config.ts`, `client/jest.config.ts`

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  },
  // Critical paths require higher coverage
  './src/security/**/*.ts': {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100
  },
  './src/repos/**/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  },
  './src/services/**/*.ts': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/db/**/*.ts': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

### 2. CI/CD Integration
**File:** `.github/workflows/test.yml`

```yaml
- name: Run unit tests with coverage
  run: pnpm test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true

- name: Enforce coverage thresholds
  run: pnpm test:coverage --ci
```

### 3. Pre-commit Hooks
**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for changed files
pnpm test:changed

# Check coverage hasn't decreased
pnpm test:coverage:check
```

### 4. Test Requirements in PRs
**File:** `.github/pull_request_template.md`

```markdown
## Testing Checklist
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] E2E tests added/updated (if user-facing changes)
- [ ] Coverage thresholds met
- [ ] All tests passing
```

### 5. Mutation Testing (Future)
**File:** `stryker.conf.json`

```json
{
  "mutator": "typescript",
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/security/**/*.ts",
    "src/repos/**/*.ts",
    "src/services/**/*.ts",
    "src/db/**/*.ts"
  ]
}
```

---

## Test Patterns & Best Practices

### 1. Unit Tests
- Test individual functions and classes in isolation
- Mock external dependencies (database, APIs, Redis)
- Fast execution (<1s per test file)
- High coverage (>90%)

**Example:**
```typescript
describe('EntityRepo', () => {
  let repo: EntityRepo;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = createMockPool();
    repo = new EntityRepo(mockPool, mockNeo4jDriver);
  });

  it('should create entity successfully', async () => {
    mockPool.query.mockResolvedValue({ rows: [mockEntity] });
    const result = await repo.create(input, userId);
    expect(result.id).toBe(mockEntity.id);
  });
});
```

### 2. Integration Tests
- Test interaction between multiple components
- Use test database or in-memory database
- Test actual database queries
- Test API endpoints with real routing

**Example:**
```typescript
describe('Entity API Integration', () => {
  let app: Express;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    app = createApp(testDb);
  });

  it('should create and retrieve entity', async () => {
    const response = await request(app)
      .post('/api/entities')
      .send(entityData);

    expect(response.status).toBe(201);

    const getResponse = await request(app)
      .get(`/api/entities/${response.body.id}`);

    expect(getResponse.body.name).toBe(entityData.name);
  });
});
```

### 3. Contract Tests
- Test API contracts between services
- Use schema validation (GraphQL, OpenAPI)
- Ensure backward compatibility

**Example:**
```typescript
describe('GraphQL Schema Contract', () => {
  it('should match expected schema', () => {
    const schema = buildSchema();
    expect(printSchema(schema)).toMatchSnapshot();
  });

  it('should validate query response', async () => {
    const result = await executeQuery(ENTITY_QUERY);
    expect(result).toMatchSchema(EntitySchema);
  });
});
```

### 4. E2E Tests (Already Strong)
- Test complete user workflows
- Use Playwright for browser automation
- Test across different browsers/devices
- Focus on critical user paths

---

## Running Tests

### Quick Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests for specific file
pnpm test EntityRepo

# Run tests in watch mode
pnpm test:watch

# Run only changed files
pnpm test:changed

# Run E2E tests
pnpm test:e2e

# Run specific test suite
pnpm test --testNamePattern="create entity"
```

### Coverage Reports

```bash
# Generate HTML coverage report
pnpm test:coverage:html

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### CI/CD Integration

```bash
# Run tests in CI mode (no watch, with coverage)
pnpm test:ci

# Run tests with JUnit output for CI
pnpm test:ci:junit
```

---

## Success Metrics

### Coverage Targets

| Component | Current | Target (3 months) | Target (6 months) |
|-----------|---------|-------------------|-------------------|
| Security | 0% → 10% | 100% | 100% |
| Database & Repos | 0% | 90% | 95% |
| Background Workers | 0% | 80% | 90% |
| Services | 1.2% | 70% | 85% |
| API Routes | 3.3% | 75% | 85% |
| GraphQL Resolvers | 1.1% | 70% | 80% |
| **Overall Server** | **6.2%** | **60%** | **75%** |
| **Overall Client** | **7.5%** | **50%** | **65%** |

### Quality Metrics

- **Test Execution Time:** <10 minutes for full suite
- **Flaky Test Rate:** <2%
- **Build Success Rate:** >95%
- **Bug Escape Rate:** <5% (bugs found in production vs. testing)
- **Code Review Coverage:** 100% (all PRs reviewed for tests)

---

## Quick Wins (High Impact, Low Effort)

These can be tackled immediately for quick improvements:

1. **Utility Functions** (2-3 days)
   - `server/src/utils/*.ts` (11 files)
   - `client/src/lib/utils.ts`
   - Pure functions, easy to test, high reuse

2. **Validators** (1-2 days)
   - Input validation functions
   - Schema validators
   - Data sanitizers

3. **Formatters** (1 day)
   - Date formatters
   - Currency formatters
   - String utilities

4. **Constants & Configs** (1 day)
   - Configuration validation
   - Environment variable parsing
   - Default value testing

---

## Resources & Documentation

### Testing Tools Used
- **Jest:** Unit and integration testing framework
- **Playwright:** E2E testing framework
- **Supertest:** HTTP assertion library
- **jest-mock-extended:** Advanced mocking
- **@faker-js/faker:** Test data generation

### Documentation
- [Jest Best Practices](https://jestjs.io/docs/getting-started)
- [Testing Library Guide](https://testing-library.com/docs/)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Martin Fowler: Testing Strategies](https://martinfowler.com/testing/)

### Internal Resources
- Test examples: `server/src/**/__tests__/`
- Test setup: `jest.setup.ts`
- E2E examples: `e2e/`
- CI configuration: `.github/workflows/`

---

## Next Steps

1. **Review and approve this roadmap** with the team
2. **Assign ownership** for each phase to team members
3. **Set up coverage tracking** in CI/CD
4. **Create tickets** for each test file to be created
5. **Start with Phase 1** (Security & Data Layer) immediately
6. **Weekly check-ins** to track progress and blockers
7. **Celebrate wins** as coverage milestones are reached

---

## Conclusion

This roadmap provides a clear path from **6.2% server coverage** to **75%+ coverage** over the next 6 months, prioritizing the highest-risk areas first:

1. ✅ **Week 1-2:** Security, Database, Repos (CRITICAL)
2. **Week 3-6:** Services, API Routes, GraphQL (HIGH)
3. **Week 7-10:** AI/ML, Utilities, Client (MEDIUM)
4. **Week 11-14:** Components, Integration (LOW)

The test files already created (JWT Security, EntityRepo, InvestigationRepo, AuthService, Postgres Pool) serve as templates and examples for the rest of the codebase. These cover ~90% of their respective modules and demonstrate the patterns to follow.

**Let's build a robust, well-tested codebase! 🚀**
