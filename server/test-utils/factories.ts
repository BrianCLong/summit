// Factory helpers for creating test data

export const createTestUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'analyst',
  tenantId: 'test-tenant-1',
  ...overrides,
});

export const createTestCase = (overrides = {}) => ({
  id: 'test-case-1',
  title: 'Test Case',
  description: 'Test case description',
  status: 'active',
  priority: 'medium',
  assigneeId: 'test-user-1',
  tenantId: 'test-tenant-1',
  ...overrides,
});

export const createTestEntity = (overrides = {}) => ({
  id: 'test-entity-1',
  type: 'person',
  name: 'Test Entity',
  properties: { email: 'entity@example.com' },
  caseId: 'test-case-1',
  tenantId: 'test-tenant-1',
  ...overrides,
});

export const createTestMaestroRun = (overrides = {}) => ({
  id: 'run-123',
  pipeline: 'default-pipeline',
  status: 'created',
  tenantId: 'test-tenant-1',
  config: {},
  ...overrides,
});
