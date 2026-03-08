"use strict";
/**
 * AuditAccessLogRepo Unit Tests
 * Tests immutable audit logging with reason-for-access and legal basis
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AuditAccessLogRepo_js_1 = require("../repos/AuditAccessLogRepo.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('AuditAccessLogRepo', () => {
    let mockPool;
    let repo;
    (0, globals_1.beforeEach)(() => {
        mockPool = {
            query: globals_1.jest.fn(),
        };
        repo = new AuditAccessLogRepo_js_1.AuditAccessLogRepo(mockPool);
        mockPool.query.mockClear();
    });
    (0, globals_1.describe)('logAccess', () => {
        (0, globals_1.it)('should log access with required fields', async () => {
            const input = {
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
                action: 'view',
                resourceType: 'case',
                resourceId: 'case-123',
                reason: 'Investigating fraud case',
                legalBasis: 'investigation',
            };
            const mockRow = {
                id: 'log-123',
                tenant_id: 'tenant-123',
                case_id: 'case-123',
                user_id: 'user-123',
                action: 'view',
                resource_type: 'case',
                resource_id: 'case-123',
                reason: 'Investigating fraud case',
                legal_basis: 'investigation',
                warrant_id: null,
                authority_reference: null,
                approval_chain: [],
                ip_address: null,
                user_agent: null,
                session_id: null,
                request_id: null,
                correlation_id: null,
                created_at: new Date(),
                hash: 'abc123',
                previous_hash: null,
                metadata: {},
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.logAccess(input);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.action).toBe('view');
            (0, globals_1.expect)(result.reason).toBe('Investigating fraud case');
            (0, globals_1.expect)(result.legalBasis).toBe('investigation');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should fail without reason - policy-by-default', async () => {
            const input = {
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
                action: 'view',
                reason: '', // Empty reason
                legalBasis: 'investigation',
            };
            await (0, globals_1.expect)(repo.logAccess(input)).rejects.toThrow('Reason is required for audit logging');
        });
        (0, globals_1.it)('should fail without legal basis - policy-by-default', async () => {
            const input = {
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
                action: 'view',
                reason: 'Valid reason',
                // legalBasis is missing
            };
            await (0, globals_1.expect)(repo.logAccess(input)).rejects.toThrow('Legal basis is required for audit logging');
        });
        (0, globals_1.it)('should include warrant information when provided', async () => {
            const input = {
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
                action: 'export',
                reason: 'Court ordered disclosure',
                legalBasis: 'court_order',
                warrantId: 'warrant-456',
                authorityReference: 'Court Order #2024-001',
            };
            const mockRow = {
                id: 'log-123',
                tenant_id: 'tenant-123',
                case_id: 'case-123',
                user_id: 'user-123',
                action: 'export',
                resource_type: null,
                resource_id: null,
                reason: 'Court ordered disclosure',
                legal_basis: 'court_order',
                warrant_id: 'warrant-456',
                authority_reference: 'Court Order #2024-001',
                approval_chain: [],
                ip_address: null,
                user_agent: null,
                session_id: null,
                request_id: null,
                correlation_id: null,
                created_at: new Date(),
                hash: 'abc123',
                previous_hash: null,
                metadata: {},
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.logAccess(input);
            (0, globals_1.expect)(result.warrantId).toBe('warrant-456');
            (0, globals_1.expect)(result.authorityReference).toBe('Court Order #2024-001');
        });
        (0, globals_1.it)('should track correlation ID for related operations', async () => {
            const input = {
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
                action: 'view',
                reason: 'Investigation workflow',
                legalBasis: 'investigation',
                correlationId: 'workflow-789',
            };
            const mockRow = {
                id: 'log-123',
                tenant_id: 'tenant-123',
                case_id: 'case-123',
                user_id: 'user-123',
                action: 'view',
                resource_type: null,
                resource_id: null,
                reason: 'Investigation workflow',
                legal_basis: 'investigation',
                warrant_id: null,
                authority_reference: null,
                approval_chain: [],
                ip_address: null,
                user_agent: null,
                session_id: null,
                request_id: null,
                correlation_id: 'workflow-789',
                created_at: new Date(),
                hash: 'abc123',
                previous_hash: null,
                metadata: {},
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.logAccess(input);
            (0, globals_1.expect)(result.correlationId).toBe('workflow-789');
        });
    });
    (0, globals_1.describe)('query', () => {
        (0, globals_1.it)('should query audit logs with filters', async () => {
            const mockRows = [
                {
                    id: 'log-1',
                    tenant_id: 'tenant-123',
                    case_id: 'case-123',
                    user_id: 'user-123',
                    action: 'view',
                    resource_type: 'case',
                    resource_id: 'case-123',
                    reason: 'Investigation',
                    legal_basis: 'investigation',
                    warrant_id: null,
                    authority_reference: null,
                    approval_chain: [],
                    ip_address: null,
                    user_agent: null,
                    session_id: null,
                    request_id: null,
                    correlation_id: null,
                    created_at: new Date(),
                    hash: 'abc123',
                    previous_hash: null,
                    metadata: {},
                },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockRows });
            const results = await repo.query({
                tenantId: 'tenant-123',
                caseId: 'case-123',
                userId: 'user-123',
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].caseId).toBe('case-123');
        });
        (0, globals_1.it)('should filter by date range', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const startTime = new Date('2024-01-01');
            const endTime = new Date('2024-12-31');
            await repo.query({
                tenantId: 'tenant-123',
                startTime,
                endTime,
            });
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('created_at >='), globals_1.expect.arrayContaining([startTime, endTime]));
        });
        (0, globals_1.it)('should filter by legal basis', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await repo.query({
                tenantId: 'tenant-123',
                legalBasis: 'court_order',
            });
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('legal_basis ='), globals_1.expect.arrayContaining(['court_order']));
        });
    });
    (0, globals_1.describe)('getLogsForCase', () => {
        (0, globals_1.it)('should retrieve all logs for a specific case', async () => {
            const mockRows = [
                {
                    id: 'log-1',
                    tenant_id: 'tenant-123',
                    case_id: 'case-123',
                    user_id: 'user-123',
                    action: 'view',
                    resource_type: 'case',
                    resource_id: 'case-123',
                    reason: 'Investigation',
                    legal_basis: 'investigation',
                    warrant_id: null,
                    authority_reference: null,
                    approval_chain: [],
                    ip_address: null,
                    user_agent: null,
                    session_id: null,
                    request_id: null,
                    correlation_id: null,
                    created_at: new Date(),
                    hash: 'abc123',
                    previous_hash: null,
                    metadata: {},
                },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockRows });
            const results = await repo.getLogsForCase('case-123', 'tenant-123');
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].caseId).toBe('case-123');
        });
    });
    (0, globals_1.describe)('verifyIntegrity', () => {
        (0, globals_1.it)('should verify audit trail integrity', async () => {
            const mockRows = [
                {
                    id: 'log-1',
                    tenant_id: 'tenant-123',
                    case_id: 'case-123',
                    user_id: 'user-123',
                    action: 'view',
                    resource_type: 'case',
                    resource_id: 'case-123',
                    reason: 'Investigation',
                    legal_basis: 'investigation',
                    warrant_id: null,
                    authority_reference: null,
                    approval_chain: [],
                    ip_address: null,
                    user_agent: null,
                    session_id: null,
                    request_id: null,
                    correlation_id: null,
                    created_at: new Date(),
                    hash: 'abc123',
                    previous_hash: null,
                    metadata: {},
                },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockRows });
            const result = await repo.verifyIntegrity('tenant-123');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.totalLogs).toBe(1);
            (0, globals_1.expect)(result.valid).toBeDefined();
        });
    });
    (0, globals_1.describe)('count', () => {
        (0, globals_1.it)('should count audit logs with filters', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ count: '150' }],
            });
            const count = await repo.count({
                tenantId: 'tenant-123',
                action: 'export',
            });
            (0, globals_1.expect)(count).toBe(150);
        });
    });
});
