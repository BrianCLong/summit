# Test Templates

This directory contains comprehensive test templates for the Summit/IntelGraph platform. Use these templates as starting points for writing tests across different layers of the application.

## Available Templates

### 1. GraphQL Resolver Tests
**File:** `graphql-resolver.test.ts`

**Use for:**
- Testing GraphQL queries and mutations
- Validating resolver logic
- Testing authorization
- Service interaction validation
- Error handling

**Key Features:**
- Mock context setup
- Service mocking patterns
- Authorization testing
- Field resolver testing
- Subscription testing

### 2. Neo4j Graph Operations Tests
**File:** `neo4j-operations.test.ts`

**Use for:**
- Testing graph database operations
- Node and relationship CRUD
- Cypher query execution
- Graph analytics algorithms
- Transaction handling

**Key Features:**
- Driver and session mocking
- Query validation
- Performance testing
- Injection prevention
- Transaction rollback testing

### 3. Narrative Simulation Engine Tests
**File:** `narrative-engine.test.ts`

**Use for:**
- Testing simulation engine logic
- Actor behavior validation
- Event processing
- Relationship dynamics
- Scenario execution

**Key Features:**
- Deterministic testing
- State management
- Influence propagation
- Scenario branching
- Performance benchmarks

### 4. AI/ML Pipeline Tests
**File:** `ai-ml-pipeline.test.ts`

**Use for:**
- Testing ML model inference
- Pipeline orchestration
- Data preprocessing
- Model validation
- Performance testing

**Key Features:**
- Model loading and caching
- Batch prediction testing
- Input validation
- Output validation
- Monitoring and metrics

### 5. Golden Path Integration Tests
**File:** `golden-path-integration.test.ts`

**Use for:**
- End-to-end workflow testing
- Database integration testing
- Multi-service orchestration
- Data consistency validation
- Real-time update testing

**Key Features:**
- Complete workflow coverage
- Database integration
- WebSocket testing
- Cleanup utilities
- Performance validation

## Usage Guidelines

### 1. Copy the Template

```bash
cp docs/test-templates/graphql-resolver.test.ts server/src/resolvers/__tests__/MyResolver.test.ts
```

### 2. Customize for Your Use Case

- Replace placeholder names
- Adjust mock setup
- Add domain-specific test cases
- Update assertions

### 3. Follow Testing Best Practices

- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests isolated and independent
- Mock external dependencies
- Test edge cases and errors

### 4. Run Your Tests

```bash
# Run specific test file
pnpm test -- MyResolver.test.ts

# Run all tests in directory
pnpm test -- server/src/resolvers/__tests__

# Run with coverage
pnpm test:coverage
```

## Testing Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should do something', async () => {
  // Arrange: Setup test data and mocks
  const input = { /* test data */ };
  const mockService = { method: jest.fn() };

  // Act: Execute the operation
  const result = await functionUnderTest(input);

  // Assert: Verify the outcome
  expect(result).toEqual(expectedOutput);
  expect(mockService.method).toHaveBeenCalled();
});
```

### Given-When-Then (BDD)

```typescript
describe('Given a user is authenticated', () => {
  describe('When creating an entity', () => {
    it('Then should create entity successfully', async () => {
      // Test implementation
    });
  });
});
```

### Test Factories

```typescript
const createMockEntity = (overrides = {}) => ({
  id: 'entity-' + Math.random(),
  name: 'Test Entity',
  ...overrides,
});
```

## Common Utilities

### Mock Services

```typescript
const createMockServices = () => ({
  entityRepo: {
    create: jest.fn(),
    findById: jest.fn(),
  },
  auditService: {
    log: jest.fn(),
  },
});
```

### Test Data Factories

```typescript
const createTestInvestigation = () => ({
  id: 'inv-' + Date.now(),
  name: 'Test Investigation',
  status: 'active',
  createdAt: new Date(),
});
```

### Async Utilities

```typescript
const waitFor = async (condition, timeout = 5000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

## Coverage Requirements

All tests should aim for:

- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

Critical paths require:

- **Statements:** 90%+
- **Branches:** 85%+
- **Functions:** 90%+
- **Lines:** 90%+

## Resources

- [Testing Strategy](../TESTING_STRATEGY.md)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](../best-practices/testing.md)

## Contributing

When adding new templates:

1. Follow existing patterns
2. Include comprehensive examples
3. Document key features
4. Add to this README
5. Update TESTING_STRATEGY.md

## Support

For questions or issues with testing:

- Slack: `#engineering`
- GitHub Discussions: [Testing](https://github.com/BrianCLong/summit/discussions)
