# Test Coverage Gap Analysis

**Date**: 2025-11-28
**Modules Analyzed**: GraphQL API resolvers, Entity Service, Relationship Service, Auth Service
**Test Framework**: Jest (SWC transformer), Playwright (E2E)
**Current Coverage**: Smoke tests validate golden path; unit tests exist but coverage not systematically measured

---

## Executive Summary

**Overall Assessment**: **MEDIUM RISK**

**Key Gaps**:
1. ❌ No systematic coverage measurement (no `jest --coverage` in CI)
2. ❌ Error paths under-tested (happy path bias)
3. ❌ Edge cases missing (boundary values, null handling)
4. ❌ Integration tests limited (mocked dependencies)
5. ✅ Good: Golden path smoke tests, E2E tests for happy paths

**Target Coverage**: 80% line coverage, 70% branch coverage (realistic for business logic)

---

## Critical Under-Tested Areas

### 1. GraphQL Resolvers - Error Handling

**Current State**:
- Happy path tested via smoke tests
- Error scenarios not systematically tested

**Gaps Identified**:

| Resolver | Gap | Risk | Priority |
|----------|-----|------|----------|
| `createInvestigation` | No test for duplicate name | Users can create duplicate investigations | HIGH |
| `createEntity` | No test for invalid type | System accepts invalid entity types | HIGH |
| `createRelationship` | No test for non-existent entities | Orphaned relationships created | HIGH |
| `askCopilot` | No test for LLM API timeout | Requests hang indefinitely | MEDIUM |
| `getInvestigationResults` | No test for malformed investigation ID | 500 errors instead of 404 | MEDIUM |

**Proposed Tests** (8 tests):

```typescript
// tests/graphql/resolvers/investigation.test.ts

describe('createInvestigation', () => {
  it('should reject duplicate investigation names', async () => {
    // Arrange
    const name = 'Test Investigation';
    await createInvestigation({ name });

    // Act & Assert
    await expect(
      createInvestigation({ name })
    ).rejects.toThrow('Investigation with name "Test Investigation" already exists');
  });

  it('should reject investigation names exceeding 255 characters', async () => {
    const longName = 'a'.repeat(256);

    await expect(
      createInvestigation({ name: longName })
    ).rejects.toThrow('Investigation name must be 255 characters or less');
  });

  it('should reject empty investigation names', async () => {
    await expect(
      createInvestigation({ name: '' })
    ).rejects.toThrow('Investigation name is required');
  });

  it('should handle database connection failures gracefully', async () => {
    // Mock DB failure
    jest.spyOn(db, 'query').mockRejectedValue(new Error('Connection lost'));

    await expect(
      createInvestigation({ name: 'Test' })
    ).rejects.toThrow('Unable to create investigation. Please try again.');
  });
});

describe('createEntity', () => {
  it('should reject invalid entity types', async () => {
    await expect(
      createEntity({ type: 'InvalidType', name: 'Test' })
    ).rejects.toThrow('Invalid entity type. Must be one of: Person, Organization, Location, Event');
  });

  it('should reject entity without investigation context', async () => {
    await expect(
      createEntity({ type: 'Person', name: 'John Doe', investigationId: null })
    ).rejects.toThrow('Investigation ID is required');
  });

  it('should handle Neo4j write failures', async () => {
    jest.spyOn(neo4j, 'run').mockRejectedValue(new Error('Write failed'));

    await expect(
      createEntity({ type: 'Person', name: 'Test', investigationId: 'inv123' })
    ).rejects.toThrow('Unable to create entity');
  });
});

describe('createRelationship', () => {
  it('should reject relationship between non-existent entities', async () => {
    await expect(
      createRelationship({
        fromEntityId: 'nonexistent1',
        toEntityId: 'nonexistent2',
        type: 'knows'
      })
    ).rejects.toThrow('One or both entities not found');
  });

  it('should prevent circular relationships with self', async () => {
    const entity = await createEntity({ type: 'Person', name: 'John' });

    await expect(
      createRelationship({
        fromEntityId: entity.id,
        toEntityId: entity.id,
        type: 'knows'
      })
    ).rejects.toThrow('Self-referential relationships not allowed');
  });

  it('should reject invalid relationship types', async () => {
    const entity1 = await createEntity({ type: 'Person', name: 'John' });
    const entity2 = await createEntity({ type: 'Person', name: 'Jane' });

    await expect(
      createRelationship({
        fromEntityId: entity1.id,
        toEntityId: entity2.id,
        type: 'invalidType'
      })
    ).rejects.toThrow('Invalid relationship type');
  });
});

describe('askCopilot', () => {
  it('should timeout after 30 seconds', async () => {
    jest.spyOn(copilotService, 'ask').mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 31000))
    );

    await expect(
      askCopilot({ investigationId: 'inv123', question: 'Test?' })
    ).rejects.toThrow('Copilot request timed out');
  }, 32000);

  it('should handle LLM API rate limits gracefully', async () => {
    jest.spyOn(copilotService, 'ask').mockRejectedValue(
      new Error('Rate limit exceeded')
    );

    await expect(
      askCopilot({ investigationId: 'inv123', question: 'Test?' })
    ).rejects.toThrow('Copilot is currently unavailable. Please try again in a few minutes.');
  });
});
```

---

### 2. Authentication & Authorization - Permission Edge Cases

**Current State**:
- Basic auth tests exist
- RBAC/ABAC edge cases not tested

**Gaps Identified**:

| Scenario | Gap | Risk | Priority |
|----------|-----|------|----------|
| Token expiry | No test for expired JWT | Users with expired tokens can access data | HIGH |
| Missing permissions | No test for insufficient permissions | Privilege escalation risk | HIGH |
| Token refresh | No test for refresh token rotation | Session hijacking risk | MEDIUM |
| Multi-tenancy | No test for cross-tenant access | Data leak between tenants | HIGH |

**Proposed Tests** (10 tests):

```typescript
// tests/auth/authorization.test.ts

describe('JWT Authentication', () => {
  it('should reject expired access tokens', async () => {
    const expiredToken = generateToken({ userId: 'user123' }, { expiresIn: '-1h' });

    await expect(
      authenticateRequest({ headers: { authorization: `Bearer ${expiredToken}` } })
    ).rejects.toThrow('Token expired');
  });

  it('should reject tokens with invalid signature', async () => {
    const tamperedToken = validToken.slice(0, -10) + '1234567890';

    await expect(
      authenticateRequest({ headers: { authorization: `Bearer ${tamperedToken}` } })
    ).rejects.toThrow('Invalid token signature');
  });

  it('should reject tokens from wrong issuer', async () => {
    const wrongIssuerToken = generateToken({ userId: 'user123' }, { issuer: 'evil.com' });

    await expect(
      authenticateRequest({ headers: { authorization: `Bearer ${wrongIssuerToken}` } })
    ).rejects.toThrow('Invalid token issuer');
  });

  it('should enforce token rotation on refresh', async () => {
    const refreshToken = generateRefreshToken({ userId: 'user123' });

    // First refresh should succeed
    const newTokens1 = await refreshAccessToken(refreshToken);
    expect(newTokens1.accessToken).toBeDefined();

    // Second refresh with same token should fail
    await expect(
      refreshAccessToken(refreshToken)
    ).rejects.toThrow('Refresh token already used');
  });
});

describe('RBAC Authorization', () => {
  it('should deny access when user lacks required role', async () => {
    const user = { id: 'user123', roles: ['viewer'] };

    await expect(
      authorizeAction(user, 'entity:delete')
    ).rejects.toThrow('Insufficient permissions');
  });

  it('should deny access to investigations from different tenant', async () => {
    const user = { id: 'user123', tenantId: 'tenant-a' };
    const investigation = { id: 'inv123', tenantId: 'tenant-b' };

    await expect(
      authorizeResourceAccess(user, investigation, 'read')
    ).rejects.toThrow('Access denied: resource belongs to different tenant');
  });

  it('should allow admin to access all tenants', async () => {
    const admin = { id: 'admin123', roles: ['admin'], tenantId: 'tenant-a' };
    const investigation = { id: 'inv123', tenantId: 'tenant-b' };

    await expect(
      authorizeResourceAccess(admin, investigation, 'read')
    ).resolves.toBe(true);
  });

  it('should deny access to deleted user accounts', async () => {
    const deletedUser = { id: 'user123', status: 'deleted' };

    await expect(
      authenticateRequest({ user: deletedUser })
    ).rejects.toThrow('User account has been deleted');
  });

  it('should enforce IP whitelist for sensitive operations', async () => {
    const user = { id: 'user123', allowedIPs: ['192.168.1.0/24'] };
    const request = { ip: '10.0.0.1' };

    await expect(
      authorizeAction(user, 'investigation:export', { request })
    ).rejects.toThrow('IP address not whitelisted for sensitive operations');
  });
});
```

---

### 3. Entity Service - Database Constraint Violations

**Current State**:
- Basic CRUD tested
- Constraint violations not tested

**Gaps Identified**:

| Operation | Gap | Risk | Priority |
|-----------|-----|------|----------|
| Create entity | No test for unique constraint violation | Duplicate entities with same external ID | MEDIUM |
| Update entity | No test for concurrent updates | Lost updates, data corruption | HIGH |
| Delete entity | No test for cascade delete of relationships | Orphaned data | MEDIUM |
| Bulk import | No test for transaction rollback | Partial imports leave inconsistent state | HIGH |

**Proposed Tests** (8-10 tests):

```typescript
// tests/services/entity-service.test.ts

describe('EntityService - Constraint Handling', () => {
  it('should prevent duplicate entities with same external ID', async () => {
    await entityService.create({ externalId: 'ext-123', name: 'Entity 1' });

    await expect(
      entityService.create({ externalId: 'ext-123', name: 'Entity 2' })
    ).rejects.toThrow('Entity with external ID "ext-123" already exists');
  });

  it('should handle concurrent updates with optimistic locking', async () => {
    const entity = await entityService.create({ name: 'Test Entity' });

    // Simulate two concurrent updates
    const update1 = entityService.update(entity.id, { name: 'Update 1' });
    const update2 = entityService.update(entity.id, { name: 'Update 2' });

    await expect(Promise.all([update1, update2])).rejects.toThrow('Concurrent modification detected');
  });

  it('should cascade delete relationships when entity is deleted', async () => {
    const entity1 = await entityService.create({ name: 'Entity 1' });
    const entity2 = await entityService.create({ name: 'Entity 2' });
    const relationship = await relationshipService.create({
      fromEntityId: entity1.id,
      toEntityId: entity2.id,
      type: 'knows'
    });

    await entityService.delete(entity1.id);

    // Relationship should also be deleted
    await expect(
      relationshipService.findById(relationship.id)
    ).resolves.toBeNull();
  });

  it('should rollback transaction on bulk import failure', async () => {
    const entities = [
      { name: 'Valid 1' },
      { name: 'Valid 2' },
      { name: null }, // Invalid - will fail
      { name: 'Valid 3' }
    ];

    await expect(
      entityService.bulkCreate(entities)
    ).rejects.toThrow();

    // No entities should be created (transaction rolled back)
    const count = await entityService.count();
    expect(count).toBe(0);
  });

  it('should enforce maximum entity name length', async () => {
    const longName = 'a'.repeat(1001);

    await expect(
      entityService.create({ name: longName })
    ).rejects.toThrow('Entity name must be 1000 characters or less');
  });

  it('should reject null or undefined required fields', async () => {
    await expect(
      entityService.create({ name: null })
    ).rejects.toThrow('Entity name is required');

    await expect(
      entityService.create({ name: undefined })
    ).rejects.toThrow('Entity name is required');
  });

  it('should handle database write failures gracefully', async () => {
    jest.spyOn(neo4jDriver, 'session').mockImplementation(() => {
      throw new Error('Connection pool exhausted');
    });

    await expect(
      entityService.create({ name: 'Test' })
    ).rejects.toThrow('Unable to create entity. Database unavailable.');
  });
});
```

---

### 4. Integration Tests - End-to-End Workflows

**Current State**:
- Smoke tests cover happy path
- No tests for workflow variations

**Gaps Identified**:

| Workflow | Gap | Risk | Priority |
|----------|-----|------|----------|
| Investigation with no entities | Not tested | UI crashes or shows errors | MEDIUM |
| Copilot on empty investigation | Not tested | Unhelpful or error responses | MEDIUM |
| Large graph (>1000 entities) | Not tested | Performance degradation not caught | HIGH |
| Concurrent user edits | Not tested | Race conditions, lost updates | HIGH |

**Proposed Tests** (5-7 integration tests):

```typescript
// tests/integration/workflows.test.ts

describe('Investigation Workflows (Integration)', () => {
  it('should handle investigation with no entities gracefully', async () => {
    const investigation = await graphql.mutate({ mutation: CREATE_INVESTIGATION });

    const results = await graphql.query({
      query: GET_INVESTIGATION_RESULTS,
      variables: { id: investigation.id }
    });

    expect(results.data.investigation.entities).toEqual([]);
    expect(results.data.investigation.relationships).toEqual([]);
  });

  it('should handle copilot query on empty investigation', async () => {
    const investigation = await graphql.mutate({ mutation: CREATE_INVESTIGATION });

    const response = await graphql.mutate({
      mutation: ASK_COPILOT,
      variables: {
        investigationId: investigation.id,
        question: 'Summarize this investigation'
      }
    });

    expect(response.data.askCopilot.answer).toContain('no entities or relationships');
  });

  it('should handle large investigation (1000+ entities) without timeout', async () => {
    const investigation = await createInvestigation();

    // Create 1000 entities
    for (let i = 0; i < 1000; i++) {
      await createEntity({
        investigationId: investigation.id,
        name: `Entity ${i}`,
        type: 'Person'
      });
    }

    // Should complete within 10 seconds
    const start = Date.now();
    const results = await getInvestigationResults(investigation.id);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    expect(results.entities.length).toBe(1000);
  }, 15000);

  it('should handle concurrent entity creation by multiple users', async () => {
    const investigation = await createInvestigation();

    // Simulate 5 users creating entities concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      createEntity({
        investigationId: investigation.id,
        name: `Entity from User ${i}`,
        type: 'Person'
      })
    );

    const results = await Promise.all(promises);

    // All 5 entities should be created successfully
    expect(results.length).toBe(5);
    expect(new Set(results.map(r => r.id)).size).toBe(5); // All unique IDs
  });

  it('should maintain referential integrity when deleting investigation', async () => {
    const investigation = await createInvestigation();
    const entity1 = await createEntity({ investigationId: investigation.id, name: 'E1' });
    const entity2 = await createEntity({ investigationId: investigation.id, name: 'E2' });
    await createRelationship({ fromEntityId: entity1.id, toEntityId: entity2.id });

    await deleteInvestigation(investigation.id);

    // All related entities and relationships should be deleted
    await expect(getEntity(entity1.id)).resolves.toBeNull();
    await expect(getEntity(entity2.id)).resolves.toBeNull();
  });
});
```

---

## Coverage Measurement Implementation

### Step 1: Add Coverage Collection to Jest

```json
// jest.config.js (update)
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'apps/gateway/src/**/*.ts',
    'server/src/services/**/*.ts',
    'server/src/graphql/resolvers/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/*.d.ts'
  ],
  coverageThresholds: {
    global: {
      lines: 70,
      branches: 60,
      functions: 70,
      statements: 70
    },
    './apps/gateway/src/': {
      lines: 80,
      branches: 70
    },
    './server/src/services/': {
      lines: 80,
      branches: 70
    }
  }
};
```

### Step 2: Add Coverage to CI

```yaml
# .github/workflows/ci.yml
- name: Unit & integration tests with coverage
  run: pnpm -w run test --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
    fail_ci_if_error: true
```

### Step 3: Add Coverage Badge

```markdown
# README.md
[![Coverage](https://codecov.io/gh/yourorg/summit/branch/main/graph/badge.svg)](https://codecov.io/gh/yourorg/summit)
```

---

## Recommended Test Implementation Order

### Phase 1: Critical Path (Week 1)
Priority: HIGH - These gaps have highest business risk

1. ✅ **GraphQL Error Handling** (Day 1-2)
   - createInvestigation edge cases
   - createEntity validation
   - createRelationship validation

2. ✅ **Auth Token Security** (Day 3)
   - Expired token handling
   - Invalid signature detection
   - Refresh token rotation

3. ✅ **Entity Service Constraints** (Day 4-5)
   - Duplicate prevention
   - Concurrent update handling
   - Cascade delete verification

### Phase 2: Integration Coverage (Week 2)
Priority: MEDIUM - Improve workflow robustness

4. ✅ **Workflow Edge Cases** (Day 1-2)
   - Empty investigation handling
   - Copilot on empty data
   - Concurrent user operations

5. ✅ **Performance Tests** (Day 3)
   - Large graph handling (1000+ entities)
   - Query timeout scenarios

6. ✅ **Data Integrity** (Day 4-5)
   - Bulk import transaction rollback
   - Investigation deletion cascade

### Phase 3: Coverage Infrastructure (Week 3)
Priority: MEDIUM - Systematic measurement

7. ✅ **Coverage Tooling** (Day 1-2)
   - Configure Jest coverage
   - Add Codecov integration
   - Set coverage thresholds

8. ✅ **Mutation Testing** (Day 3-5) - Optional but recommended
   - Install Stryker
   - Run mutation tests on critical services
   - Fix surviving mutants

---

## Success Metrics

**Before Implementation**:
- Line coverage: Unknown (estimated 40-50%)
- Branch coverage: Unknown (estimated 30-40%)
- Error path coverage: Very low (<20%)

**Target After Implementation**:
- Line coverage: 80%+ for critical modules
- Branch coverage: 70%+ for critical modules
- Error path coverage: 60%+
- All 30+ proposed tests implemented

**Measurement**:
```bash
# Run coverage report
pnpm test --coverage

# Check coverage thresholds
npx jest --coverage --coverageThreshold='{"global":{"lines":80}}'

# Generate HTML report
open coverage/lcov-report/index.html
```

---

## Long-Term Recommendations

1. **Contract Testing**: Add Pact tests for GraphQL schema changes
2. **Chaos Engineering**: Periodic failure injection (kill database mid-transaction)
3. **Property-Based Testing**: Use fast-check for fuzzing entity/relationship creation
4. **Visual Regression Testing**: Percy or Chromatic for UI changes
5. **Accessibility Testing**: Axe-core integration in E2E tests

---

**Last Updated**: 2025-11-28
**Owner**: Engineering Team
**Next Review**: After Phase 1 completion (2 weeks)
