# Test Coverage Improvement Plan
## Summit/IntelGraph Platform

> **Generated**: 2025-11-23
> **Purpose**: Comprehensive plan to improve test coverage across critical business logic, API endpoints, and user flows

---

## Executive Summary

### Current State
- **Total Test Files**: ~350+ test files across the monorepo
- **Server Test Files**: 119 tests
- **Critical Coverage Gaps**: Significant gaps in repositories, services, middleware, and GraphQL resolvers
- **Coverage Thresholds Defined**:
  - Global: 80% (lines, functions, statements), 75% (branches)
  - Critical paths: 90% (middleware, resolvers, repos, services)

### Key Findings
1. **Repositories**: 2/6 core repos have tests (33% coverage)
2. **Services**: ~11/100+ services have tests (<11% coverage)
3. **Middleware**: 6/60+ middleware have tests (~10% coverage)
4. **GraphQL Resolvers**: Minimal coverage (<5%)

### Strategic Approach
Focus on **high-risk, high-impact** areas first:
- Core business logic (repos, services)
- Security-critical paths (auth, authorization, rate limiting)
- Golden path workflows (Investigation → Entities → Relationships → Copilot → Results)
- Data integrity (database operations, transactions)

---

## Priority Classification

### Priority 1: CRITICAL (Immediate - Week 1-2)
**Impact**: Production failures, data loss, security breaches
**Risk**: High

#### 1.1 Repository Layer (Data Access)
- ❌ **RelationshipRepo.ts** (407 LOC) - NO TESTS
  - CRUD operations for relationships
  - Graph database interactions
  - Data integrity concerns

- ❌ **CaseRepo.ts** (406 LOC) - NO TESTS
  - Case management persistence
  - Investigation data integrity

- ❌ **AuditAccessLogRepo.ts** (553 LOC) - NO TESTS
  - Compliance-critical audit logging
  - GDPR/regulatory requirements

- ❌ **ProvenanceRepo.ts** (147 LOC) - NO TESTS
  - Chain-of-custody tracking
  - Evidence integrity

#### 1.2 Security Middleware
- ❌ **opa-enforcer.ts** (466 LOC) - NO TESTS
  - Authorization enforcement
  - Policy evaluation

- ❌ **graphql-authz.ts** (330 LOC) - NO TESTS
  - GraphQL authorization
  - Field-level access control

- ❌ **audit-event-capture-middleware.ts** (500 LOC) - NO TESTS
  - Audit trail generation
  - Compliance logging

- ❌ **idempotency.ts** (441 LOC) - NO TESTS
  - Duplicate request prevention
  - Data consistency

#### 1.3 Core Services
- ❌ **CopilotOrchestrationService.js** (1,298 LOC) - NO TESTS
  - AI copilot workflow orchestration
  - Critical user flow

- ❌ **ComplianceService.ts** (1,237 LOC) - NO TESTS
  - GDPR/compliance operations
  - Data retention policies

### Priority 2: HIGH (Week 3-4)
**Impact**: Feature failures, degraded UX, data inconsistencies
**Risk**: Medium-High

#### 2.1 GraphQL Resolvers
- ❌ **resolvers.er.ts** (Entity/Relationship) - NO TESTS
  - Core domain operations
  - Golden path critical

- ❌ **resolvers.copilot-mvp.ts** - NO TESTS
  - Copilot API endpoints
  - User-facing features

- ❌ **multimodalResolvers.ts** (777 LOC) - NO TESTS
  - Multimodal data handling
  - Complex business logic

#### 2.2 Business Logic Services
- ❌ **AdvancedAnalyticsService.js** (1,584 LOC) - NO TESTS
  - Analytics calculations
  - Reporting accuracy

- ❌ **CIBudgetService.ts** (1,320 LOC) - NO TESTS
  - Cost tracking
  - Budget enforcement

- ❌ **VisualizationService.js** (2,031 LOC) - NO TESTS
  - Data visualization generation
  - Graph rendering logic

#### 2.3 Rate Limiting & Abuse Prevention
- ❌ **TieredRateLimitMiddleware.ts** (575 LOC) - NO TESTS
  - Rate limiting enforcement
  - DoS prevention

- ❌ **graphAbuseGuard.ts** (767 LOC) - NO TESTS
  - GraphQL query complexity
  - Abuse detection

### Priority 3: MEDIUM (Week 5-6)
**Impact**: Technical debt, maintenance burden
**Risk**: Medium

#### 3.1 Data Processing Services
- ❌ **ReportingService.js** (1,858 LOC) - NO TESTS
- ❌ **SimulationEngineService.js** (1,558 LOC) - NO TESTS
- ❌ **RTBFAuditService.ts** (1,454 LOC) - NO TESTS
- ❌ **RTBFJobService.ts** (1,386 LOC) - NO TESTS
- ❌ **TenantSLOService.ts** (1,511 LOC) - NO TESTS

#### 3.2 Security Hardening Middleware
- ❌ **graphql-hardening.ts** (475 LOC) - NO TESTS
- ❌ **spiffe-auth.ts** (492 LOC) - NO TESTS
- ❌ **dlpMiddleware.ts** (419 LOC) - NO TESTS
- ❌ **governance.ts** (442 LOC) - NO TESTS

### Priority 4: LOW (Ongoing)
**Impact**: Edge cases, nice-to-have coverage
**Risk**: Low

- Helper utilities
- Formatting services
- Non-critical integrations

---

## Test Implementation Strategy

### Phase 1: Foundation (Week 1-2)
**Goal**: Cover critical data layer and security

#### Week 1: Repository Layer
- [ ] **RelationshipRepo.ts** - Full CRUD coverage
  - Create relationship tests
  - Read/query tests (with filters)
  - Update tests (optimistic locking)
  - Delete tests (cascade handling)
  - Transaction tests
  - Error handling (DB failures, constraints)

- [ ] **CaseRepo.ts** - Case management coverage
  - Case creation tests
  - Case state transitions
  - Query tests (pagination, filtering)
  - Update operations
  - Deletion with cleanup

- [ ] **AuditAccessLogRepo.ts** - Audit trail coverage
  - Log creation tests
  - Query tests (time-based, user-based)
  - Immutability tests
  - Batch operations

#### Week 2: Security Middleware
- [ ] **opa-enforcer.ts** - Authorization coverage
  - Policy evaluation tests
  - Allow/deny scenarios
  - Context extraction
  - Error handling
  - Performance tests (caching)

- [ ] **graphql-authz.ts** - GraphQL auth coverage
  - Field-level authorization
  - Type-level authorization
  - Context propagation
  - Directive handling

- [ ] **audit-event-capture-middleware.ts** - Audit middleware
  - Event capture tests
  - Filtering tests
  - Batch processing
  - Error resilience

### Phase 2: Business Logic (Week 3-4)
**Goal**: Cover core services and GraphQL API

#### Week 3: GraphQL Resolvers
- [ ] **resolvers.er.ts** - Entity/Relationship API
  - Entity mutations (create, update, delete)
  - Relationship mutations
  - Query tests (with arguments)
  - Subscription tests
  - Error responses

- [ ] **resolvers.copilot-mvp.ts** - Copilot API
  - Copilot invocation tests
  - Result handling
  - Streaming responses
  - Error states

#### Week 4: Core Services
- [ ] **CopilotOrchestrationService.js** - Orchestration coverage
  - Workflow tests (happy path)
  - Step execution
  - Error recovery
  - Retry logic
  - State management

- [ ] **ComplianceService.ts** - Compliance coverage
  - Policy enforcement tests
  - Data retention tests
  - Audit report generation
  - GDPR operations (DSAR, erasure)

### Phase 3: Performance & Resilience (Week 5-6)
**Goal**: Cover rate limiting, abuse prevention, analytics

#### Week 5: Rate Limiting & Protection
- [ ] **TieredRateLimitMiddleware.ts**
  - Rate limit enforcement
  - Tier-based limits
  - Sliding window tests
  - Redis integration

- [ ] **graphAbuseGuard.ts**
  - Query complexity tests
  - Depth limiting
  - Cost calculation
  - Block/allow list

#### Week 6: Analytics & Reporting
- [ ] **AdvancedAnalyticsService.js**
  - Calculation accuracy tests
  - Aggregation tests
  - Time-series tests

- [ ] **VisualizationService.js**
  - Graph generation tests
  - Data transformation tests
  - Format validation

---

## Testing Best Practices

### Unit Test Structure
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Arrange
      const input = { ... };

      // Act
      const result = await service.method(input);

      // Assert
      expect(result).toMatchObject({ ... });
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidInput = { ... };

      // Act & Assert
      await expect(service.method(invalidInput))
        .rejects.toThrow('Validation error');
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb.query.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(service.method(input))
        .rejects.toThrow('Database error');
    });
  });
});
```

### Test Coverage Goals
- **Line Coverage**: 80% minimum, 90% for critical paths
- **Branch Coverage**: 75% minimum, 85% for critical paths
- **Function Coverage**: 80% minimum, 90% for critical paths
- **Statement Coverage**: 80% minimum, 90% for critical paths

### What to Test
✅ **DO TEST**:
- Business logic and calculations
- Data validation and sanitization
- Error handling and edge cases
- Database operations (CRUD, transactions)
- Authorization and authentication
- API contracts (inputs, outputs)
- State transitions
- Critical user workflows

❌ **DON'T TEST** (or low priority):
- Third-party library internals
- Simple getters/setters
- Configuration files
- Type definitions
- Generated code

### Mocking Strategy
- **Database**: Mock at client level (pg, neo4j-driver)
- **External Services**: Mock HTTP clients (axios, fetch)
- **Caching**: Mock Redis client
- **Queues**: Mock Kafka/Redpanda clients
- **File System**: Use in-memory implementations

### Test Data Management
- **Fixtures**: Store in `__fixtures__/` directories
- **Builders**: Use test data builders for complex objects
- **Factories**: Use factories for generating test data
- **Randomization**: Use faker.js for random but realistic data

---

## Golden Path Testing

### Critical User Flow
**Investigation → Entities → Relationships → Copilot → Results**

#### Integration Test Coverage
- [ ] Create investigation (E2E)
- [ ] Add entities to investigation (E2E)
- [ ] Create relationships between entities (E2E)
- [ ] Invoke copilot analysis (E2E)
- [ ] View and export results (E2E)

#### Unit Test Coverage
- [ ] Investigation creation service
- [ ] Entity creation service
- [ ] Relationship creation service
- [ ] Copilot orchestration service
- [ ] Result generation service

---

## Implementation Checklist

### Before Writing Tests
- [ ] Review existing test files for patterns
- [ ] Identify dependencies to mock
- [ ] Prepare test data fixtures
- [ ] Set up test database/services if needed

### Writing Tests
- [ ] Write failing test first (TDD)
- [ ] Implement minimum code to pass
- [ ] Refactor for clarity
- [ ] Add edge case tests
- [ ] Add error case tests
- [ ] Verify coverage meets threshold

### After Writing Tests
- [ ] Run tests locally: `pnpm test`
- [ ] Check coverage: `pnpm run test:coverage`
- [ ] Run linting: `pnpm lint`
- [ ] Run type checking: `pnpm typecheck`
- [ ] Commit with descriptive message
- [ ] Update this plan with progress

---

## Success Metrics

### Quantitative Goals
- **Repository Coverage**: 33% → 100% (6/6 repos with tests)
- **Service Coverage**: 11% → 60% (60/100 services with tests)
- **Middleware Coverage**: 10% → 80% (48/60 middleware with tests)
- **Resolver Coverage**: 5% → 90% (18/20 resolvers with tests)
- **Overall Line Coverage**: Unknown → 80%+

### Qualitative Goals
- Reduced production bugs related to covered areas
- Faster development with confidence to refactor
- Improved documentation through test cases
- Easier onboarding for new developers

---

## Risk Mitigation

### Risks
1. **Time Constraints**: Ambitious timeline for comprehensive coverage
   - **Mitigation**: Prioritize by risk/impact, defer low-priority items

2. **Legacy Code**: Untestable code due to tight coupling
   - **Mitigation**: Refactor incrementally, add seams for testing

3. **Mock Complexity**: Complex dependencies hard to mock
   - **Mitigation**: Use integration tests where mocking is impractical

4. **Brittle Tests**: Tests break with any code change
   - **Mitigation**: Test behavior, not implementation; avoid over-mocking

---

## Appendix: Test File Locations

### Repository Tests
- `/home/user/summit/server/src/repos/__tests__/`

### Service Tests
- `/home/user/summit/server/src/services/__tests__/`

### Middleware Tests
- `/home/user/summit/server/src/middleware/__tests__/`

### Resolver Tests
- `/home/user/summit/server/src/graphql/resolvers/__tests__/`
- `/home/user/summit/server/src/resolvers/__tests__/`

### Integration Tests
- `/home/user/summit/__tests__/e2e/`
- `/home/user/summit/e2e/`

---

## Next Steps

1. **Review & Approve**: Get team buy-in on priorities
2. **Start Implementation**: Begin with Priority 1 (Week 1)
3. **Track Progress**: Update this document weekly
4. **Adjust**: Refine priorities based on findings
5. **Celebrate**: Acknowledge milestones (50%, 75%, 90% coverage)

---

**Document Owner**: Engineering Team
**Review Cadence**: Weekly during implementation, monthly after completion
**Last Updated**: 2025-11-23
