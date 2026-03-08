"use strict";
// Factory helpers for creating test data
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestMaestroRun = exports.createTestEntity = exports.createTestCase = exports.createTestUser = void 0;
const createTestUser = (overrides = {}) => ({
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'analyst',
    tenantId: 'test-tenant-1',
    ...overrides,
});
exports.createTestUser = createTestUser;
const createTestCase = (overrides = {}) => ({
    id: 'test-case-1',
    title: 'Test Case',
    description: 'Test case description',
    status: 'active',
    priority: 'medium',
    assigneeId: 'test-user-1',
    tenantId: 'test-tenant-1',
    ...overrides,
});
exports.createTestCase = createTestCase;
const createTestEntity = (overrides = {}) => ({
    id: 'test-entity-1',
    type: 'person',
    name: 'Test Entity',
    properties: { email: 'entity@example.com' },
    caseId: 'test-case-1',
    tenantId: 'test-tenant-1',
    ...overrides,
});
exports.createTestEntity = createTestEntity;
const createTestMaestroRun = (overrides = {}) => ({
    id: 'run-123',
    pipeline: 'default-pipeline',
    status: 'created',
    tenantId: 'test-tenant-1',
    config: {},
    ...overrides,
});
exports.createTestMaestroRun = createTestMaestroRun;
