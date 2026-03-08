"use strict";
/**
 * Tests for GDPRComplianceService
 */
Object.defineProperty(exports, "__esModule", { value: true });
const GDPRComplianceService_js_1 = require("../GDPRComplianceService.js");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('pg');
(0, globals_1.describe)('GDPRComplianceService', () => {
    let mockPool;
    let service;
    (0, globals_1.beforeEach)(() => {
        mockPool = {
            query: globals_1.jest.fn(),
        };
        service = new GDPRComplianceService_js_1.GDPRComplianceService(mockPool);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('createDataSubjectRequest', () => {
        (0, globals_1.it)('should create a data subject request with 30-day deadline', async () => {
            const request = {
                tenantId: 'tenant-123',
                subjectId: 'user-456',
                subjectEmail: 'user@example.com',
                subjectIdentifiers: { email: 'user@example.com' },
                requestType: 'access',
                requestStatus: 'pending',
                requestReason: 'User requested copy of personal data',
                completionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            };
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        tenant_id: 'tenant-123',
                        subject_id: 'user-456',
                        subject_email: 'user@example.com',
                        subject_identifiers: request.subjectIdentifiers,
                        request_type: 'access',
                        request_status: 'pending',
                        request_reason: request.requestReason,
                        completion_deadline: request.completionDeadline,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });
            const result = await service.createDataSubjectRequest(request);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.requestType).toBe('access');
            (0, globals_1.expect)(result.requestStatus).toBe('pending');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should support all GDPR request types', async () => {
            const requestTypes = [
                'access',
                'rectification',
                'erasure',
                'restriction',
                'portability',
                'objection',
            ];
            for (const requestType of requestTypes) {
                mockPool.query.mockResolvedValueOnce({
                    rows: [
                        {
                            request_id: `dsr-${requestType}`,
                            tenant_id: 'tenant-123',
                            subject_id: 'user-456',
                            subject_identifiers: {},
                            request_type: requestType,
                            request_status: 'pending',
                            request_reason: `Test ${requestType}`,
                            completion_deadline: new Date(),
                            created_at: new Date(),
                            updated_at: new Date(),
                        },
                    ],
                });
                const result = await service.createDataSubjectRequest({
                    tenantId: 'tenant-123',
                    subjectId: 'user-456',
                    subjectIdentifiers: {},
                    requestType,
                    requestStatus: 'pending',
                    requestReason: `Test ${requestType}`,
                    completionDeadline: new Date(),
                });
                (0, globals_1.expect)(result.requestType).toBe(requestType);
            }
        });
    });
    (0, globals_1.describe)('updateDataSubjectRequest', () => {
        (0, globals_1.it)('should update request status', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        request_status: 'in_progress',
                        assigned_to: 'compliance-officer-456',
                        updated_at: new Date(),
                    },
                ],
            });
            const result = await service.updateDataSubjectRequest('dsr-123', {
                requestStatus: 'in_progress',
                assignedTo: 'compliance-officer-456',
            });
            (0, globals_1.expect)(result.requestStatus).toBe('in_progress');
            (0, globals_1.expect)(result.assignedTo).toBe('compliance-officer-456');
        });
        (0, globals_1.it)('should throw error if request not found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await (0, globals_1.expect)(service.updateDataSubjectRequest('nonexistent', { requestStatus: 'completed' })).rejects.toThrow('Data subject request not found');
        });
    });
    (0, globals_1.describe)('getOverdueRequests', () => {
        (0, globals_1.it)('should return requests past completion deadline', async () => {
            const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        tenant_id: 'tenant-123',
                        subject_id: 'user-456',
                        subject_identifiers: {},
                        request_type: 'access',
                        request_status: 'pending',
                        request_reason: 'Test',
                        completion_deadline: pastDate,
                        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
                        updated_at: new Date(),
                    },
                ],
            });
            const overdueRequests = await service.getOverdueRequests('tenant-123');
            (0, globals_1.expect)(overdueRequests).toHaveLength(1);
            (0, globals_1.expect)(overdueRequests[0].completionDeadline).toEqual(pastDate);
        });
    });
    (0, globals_1.describe)('upsertRetentionPolicy', () => {
        (0, globals_1.it)('should create a new retention policy', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        policy_id: 'policy-123',
                        policy_name: 'GDPR Personal Data',
                        data_category: 'personal_data',
                        retention_period_days: 2555,
                        retention_basis: 'legal_requirement',
                        applicable_jurisdictions: ['EU', 'UK'],
                        regulation_references: ['GDPR Article 5(1)(e)'],
                        is_active: true,
                        created_by: 'admin-123',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });
            const policy = await service.upsertRetentionPolicy({
                policyName: 'GDPR Personal Data',
                dataCategory: 'personal_data',
                retentionPeriodDays: 2555,
                retentionBasis: 'legal_requirement',
                applicableJurisdictions: ['EU', 'UK'],
                regulationReferences: ['GDPR Article 5(1)(e)'],
                isActive: true,
                createdBy: 'admin-123',
            });
            (0, globals_1.expect)(policy.policyName).toBe('GDPR Personal Data');
            (0, globals_1.expect)(policy.retentionPeriodDays).toBe(2555);
            (0, globals_1.expect)(policy.applicableJurisdictions).toContain('EU');
        });
    });
    (0, globals_1.describe)('getActiveRetentionPolicies', () => {
        (0, globals_1.it)('should return only active policies', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        policy_id: 'policy-1',
                        policy_name: 'Active Policy',
                        data_category: 'personal_data',
                        retention_period_days: 365,
                        retention_basis: 'legal_requirement',
                        applicable_jurisdictions: ['US'],
                        is_active: true,
                        effective_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        effective_until: null,
                        created_by: 'admin',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });
            const policies = await service.getActiveRetentionPolicies();
            (0, globals_1.expect)(policies).toHaveLength(1);
            (0, globals_1.expect)(policies[0].isActive).toBe(true);
        });
    });
    (0, globals_1.describe)('logDataDeletion', () => {
        (0, globals_1.it)('should log data deletion with proper metadata', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const result = await service.logDataDeletion({
                tenantId: 'tenant-123',
                deletionType: 'anonymization',
                resourceType: 'user',
                resourceId: 'user-456',
                resourceIdentifiers: { email: 'user@example.com' },
                deletionReason: 'GDPR Article 17 - Right to Erasure',
                deletedBy: 'compliance-officer-789',
            });
            (0, globals_1.expect)(result.deletionId).toBeDefined();
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO data_deletion_log'), globals_1.expect.any(Array));
        });
        (0, globals_1.it)('should support all deletion types', async () => {
            const deletionTypes = [
                'hard_delete',
                'soft_delete',
                'anonymization',
                'pseudonymization',
                'archival',
            ];
            for (const deletionType of deletionTypes) {
                mockPool.query.mockResolvedValueOnce({ rows: [] });
                const result = await service.logDataDeletion({
                    tenantId: 'tenant-123',
                    deletionType,
                    resourceType: 'user',
                    resourceId: 'user-456',
                    resourceIdentifiers: {},
                    deletionReason: `Test ${deletionType}`,
                    deletedBy: 'admin',
                });
                (0, globals_1.expect)(result.deletionId).toBeDefined();
            }
        });
    });
    (0, globals_1.describe)('processRightToErasure', () => {
        (0, globals_1.it)('should process erasure request through completion', async () => {
            // Mock getDataSubjectRequest
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        tenant_id: 'tenant-123',
                        subject_id: 'user-456',
                        subject_identifiers: {},
                        request_type: 'erasure',
                        request_status: 'pending',
                        request_reason: 'Right to be forgotten',
                        completion_deadline: new Date(),
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });
            // Mock updateDataSubjectRequest (set to in_progress)
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        request_status: 'in_progress',
                        assigned_to: 'processor-123',
                    },
                ],
            });
            // Mock updateDataSubjectRequest (set to completed)
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        request_status: 'completed',
                        completed_at: new Date(),
                    },
                ],
            });
            await service.processRightToErasure('dsr-123', 'processor-123');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should throw error for non-erasure requests', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-123',
                        request_type: 'access', // Not erasure
                        request_status: 'pending',
                    },
                ],
            });
            await (0, globals_1.expect)(service.processRightToErasure('dsr-123', 'processor-123')).rejects.toThrow('Invalid erasure request');
        });
    });
    (0, globals_1.describe)('listDataSubjectRequests', () => {
        (0, globals_1.it)('should list requests with filters', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        request_id: 'dsr-1',
                        tenant_id: 'tenant-123',
                        subject_id: 'user-456',
                        subject_identifiers: {},
                        request_type: 'access',
                        request_status: 'pending',
                        request_reason: 'Test',
                        completion_deadline: new Date(),
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });
            const requests = await service.listDataSubjectRequests({
                tenantId: 'tenant-123',
                requestType: 'access',
                requestStatus: 'pending',
                limit: 10,
            });
            (0, globals_1.expect)(requests).toHaveLength(1);
            (0, globals_1.expect)(requests[0].requestType).toBe('access');
        });
    });
});
