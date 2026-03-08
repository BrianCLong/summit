"use strict";
/**
 * CaseRepo Unit Tests
 * Tests CRUD operations for Case Spaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
const CaseRepo_js_1 = require("../repos/CaseRepo.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('CaseRepo', () => {
    let mockPool;
    let repo;
    (0, globals_1.beforeEach)(() => {
        mockPool = {
            query: globals_1.jest.fn(),
            connect: globals_1.jest.fn(),
        };
        repo = new CaseRepo_js_1.CaseRepo(mockPool);
    });
    (0, globals_1.describe)('create', () => {
        (0, globals_1.it)('should create a new case with required fields', async () => {
            const input = {
                tenantId: 'tenant-123',
                title: 'Test Case',
                description: 'Test description',
                status: 'open',
                compartment: 'SECRET',
                policyLabels: ['sensitive', 'compliance'],
            };
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Test Case',
                description: 'Test description',
                status: 'open',
                compartment: 'SECRET',
                policy_labels: ['sensitive', 'compliance'],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: null,
                closed_by: null,
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.create(input, 'user-123');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.title).toBe('Test Case');
            (0, globals_1.expect)(result.compartment).toBe('SECRET');
            (0, globals_1.expect)(result.policyLabels).toEqual(['sensitive', 'compliance']);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should create a case with default status if not provided', async () => {
            const input = {
                tenantId: 'tenant-123',
                title: 'Test Case',
            };
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Test Case',
                description: null,
                status: 'open',
                compartment: null,
                policy_labels: [],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: null,
                closed_by: null,
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.create(input, 'user-123');
            (0, globals_1.expect)(result.status).toBe('open');
        });
    });
    (0, globals_1.describe)('findById', () => {
        (0, globals_1.it)('should find a case by ID', async () => {
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Test Case',
                description: null,
                status: 'open',
                compartment: 'SECRET',
                policy_labels: ['sensitive'],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: null,
                closed_by: null,
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.findById('case-123');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.id).toBe('case-123');
            (0, globals_1.expect)(result?.compartment).toBe('SECRET');
        });
        (0, globals_1.it)('should return null if case not found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const result = await repo.findById('nonexistent');
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should filter by tenantId when provided', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await repo.findById('case-123', 'tenant-123');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('AND tenant_id'), ['case-123', 'tenant-123']);
        });
    });
    (0, globals_1.describe)('update', () => {
        (0, globals_1.it)('should update case fields', async () => {
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Updated Case',
                description: 'Updated description',
                status: 'active',
                compartment: 'TOP_SECRET',
                policy_labels: ['highly-sensitive'],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: null,
                closed_by: null,
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.update({
                id: 'case-123',
                title: 'Updated Case',
                status: 'active',
                compartment: 'TOP_SECRET',
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.title).toBe('Updated Case');
            (0, globals_1.expect)(result?.status).toBe('active');
        });
        (0, globals_1.it)('should set closed_at and closed_by when status changes to closed', async () => {
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Test Case',
                description: null,
                status: 'closed',
                compartment: null,
                policy_labels: [],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: new Date(),
                closed_by: 'user-456',
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.update({ id: 'case-123', status: 'closed' }, 'user-456');
            (0, globals_1.expect)(result?.status).toBe('closed');
            (0, globals_1.expect)(result?.closedBy).toBe('user-456');
            (0, globals_1.expect)(result?.closedAt).toBeDefined();
        });
    });
    (0, globals_1.describe)('list', () => {
        (0, globals_1.it)('should list cases with filters', async () => {
            const mockRows = [
                {
                    id: 'case-1',
                    tenant_id: 'tenant-123',
                    title: 'Case 1',
                    description: null,
                    status: 'open',
                    compartment: 'SECRET',
                    policy_labels: ['sensitive'],
                    metadata: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-123',
                    closed_at: null,
                    closed_by: null,
                },
                {
                    id: 'case-2',
                    tenant_id: 'tenant-123',
                    title: 'Case 2',
                    description: null,
                    status: 'open',
                    compartment: 'SECRET',
                    policy_labels: ['sensitive'],
                    metadata: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-123',
                    closed_at: null,
                    closed_by: null,
                },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockRows });
            const results = await repo.list({
                tenantId: 'tenant-123',
                status: 'open',
                compartment: 'SECRET',
            });
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results[0].status).toBe('open');
            (0, globals_1.expect)(results[1].compartment).toBe('SECRET');
        });
        (0, globals_1.it)('should filter by policy labels', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await repo.list({
                tenantId: 'tenant-123',
                policyLabels: ['sensitive', 'compliance'],
            });
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('policy_labels &&'), globals_1.expect.arrayContaining(['tenant-123', ['sensitive', 'compliance']]));
        });
    });
    (0, globals_1.describe)('delete', () => {
        (0, globals_1.it)('should prevent deletion if case has audit logs', async () => {
            const mockClient = {
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn(),
            };
            mockClient.query
                .mockResolvedValueOnce(undefined) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 'log-1' }] }); // Audit logs check
            mockPool.connect.mockResolvedValueOnce(mockClient);
            await (0, globals_1.expect)(repo.delete('case-123')).rejects.toThrow('Cannot delete case with existing audit logs');
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        });
        (0, globals_1.it)('should delete case if no audit logs exist', async () => {
            const mockClient = {
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn(),
            };
            mockClient.query
                .mockResolvedValueOnce(undefined) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // No audit logs
                .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
                .mockResolvedValueOnce(undefined); // COMMIT
            mockPool.connect.mockResolvedValueOnce(mockClient);
            const result = await repo.delete('case-123');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('archive', () => {
        (0, globals_1.it)('should archive a case by updating status', async () => {
            const mockRow = {
                id: 'case-123',
                tenant_id: 'tenant-123',
                title: 'Test Case',
                description: null,
                status: 'archived',
                compartment: null,
                policy_labels: [],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-123',
                closed_at: null,
                closed_by: null,
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.archive('case-123', 'user-123');
            (0, globals_1.expect)(result?.status).toBe('archived');
        });
    });
    (0, globals_1.describe)('count', () => {
        (0, globals_1.it)('should count cases with filters', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ count: '42' }],
            });
            const count = await repo.count({
                tenantId: 'tenant-123',
                status: 'open',
            });
            (0, globals_1.expect)(count).toBe(42);
        });
    });
});
