"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rtbfOrchestrator_js_1 = require("../rtbfOrchestrator.js");
const repository_js_1 = require("../repository.js");
(0, globals_1.describe)('RTBFOrchestrator', () => {
    let pool;
    let repository;
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        pool = {
            query: globals_1.jest.fn(),
        };
        repository = new repository_js_1.DataRetentionRepository(pool);
        orchestrator = new rtbfOrchestrator_js_1.RTBFOrchestrator({ pool, repository });
    });
    (0, globals_1.describe)('RTBF Request Submission', () => {
        (0, globals_1.it)('should submit a new RTBF request', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    userId: 'user123',
                    email: 'user@example.com',
                    type: 'user',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    jurisdiction: 'EU',
                    reason: 'User requested data deletion',
                },
                deletionType: 'hard',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.id).toBeDefined();
            (0, globals_1.expect)(request.state).toBe('pending_approval'); // After auto-validation
            (0, globals_1.expect)(request.auditEvents.length).toBeGreaterThan(0);
            (0, globals_1.expect)(request.auditEvents[0].eventType).toBe('request.submitted');
        });
        (0, globals_1.it)('should auto-validate request after submission', async () => {
            const requestData = {
                scope: 'user_data',
                requester: {
                    userId: 'user123',
                    type: 'user',
                },
                target: {
                    userId: 'user123',
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User deletion request',
                },
                deletionType: 'soft',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.state).toBe('pending_approval');
            (0, globals_1.expect)(request.auditEvents.some((e) => e.eventType === 'validation.passed')).toBe(true);
        });
        (0, globals_1.it)('should perform impact assessment during validation', async () => {
            const metadata = {
                datasetId: 'dataset-1',
                name: 'Test Dataset',
                dataType: 'analytics',
                containsPersonalData: true,
                jurisdictions: ['EU'],
                tags: [],
                storageSystems: ['postgres'],
                owner: 'test',
                createdAt: new Date(),
                recordCount: 5000,
            };
            const policy = {
                datasetId: 'dataset-1',
                templateId: 'standard',
                retentionDays: 365,
                purgeGraceDays: 30,
                legalHoldAllowed: true,
                storageTargets: ['postgres'],
                classificationLevel: 'restricted',
                safeguards: [],
                appliedAt: new Date(),
                appliedBy: 'system',
            };
            const record = {
                metadata,
                policy,
                archiveHistory: [],
                lastEvaluatedAt: new Date(),
            };
            globals_1.jest.spyOn(repository, 'getRecord').mockReturnValue(record);
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'admin',
                    userId: 'admin123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'Compliance request',
                },
                deletionType: 'hard',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.impact).toBeDefined();
            (0, globals_1.expect)(request.impact?.estimatedRecordCount).toBe(5000);
            (0, globals_1.expect)(request.impact?.affectedSystems).toContain('postgres');
        });
    });
    (0, globals_1.describe)('Legal Hold Validation', () => {
        (0, globals_1.it)('should reject request if legal hold is active', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            const record = {
                metadata: {
                    datasetId: 'dataset-1',
                    name: 'Protected Dataset',
                    dataType: 'communications',
                    containsPersonalData: true,
                    jurisdictions: ['US'],
                    tags: [],
                    storageSystems: ['postgres'],
                    owner: 'test',
                    createdAt: new Date(),
                },
                policy: {
                    datasetId: 'dataset-1',
                    templateId: 'standard',
                    retentionDays: 365,
                    purgeGraceDays: 30,
                    legalHoldAllowed: true,
                    storageTargets: ['postgres'],
                    classificationLevel: 'restricted',
                    safeguards: [],
                    appliedAt: new Date(),
                    appliedBy: 'system',
                },
                legalHold: {
                    datasetId: 'dataset-1',
                    reason: 'Litigation',
                    requestedBy: 'legal-team',
                    createdAt: new Date(),
                    expiresAt: futureDate,
                    scope: 'full',
                },
                archiveHistory: [],
                lastEvaluatedAt: new Date(),
            };
            globals_1.jest.spyOn(repository, 'getRecord').mockReturnValue(record);
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'hard',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.state).toBe('rejected');
            (0, globals_1.expect)(request.approval?.rejectionReason).toContain('Legal hold');
        });
    });
    (0, globals_1.describe)('Request Approval Workflow', () => {
        (0, globals_1.it)('should approve a pending request', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'soft',
                dryRun: true, // Prevent auto-execution
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.state).toBe('pending_approval');
            await orchestrator.approveRequest(request.id, 'admin123', 'Approved for compliance');
            const updatedRequest = orchestrator.getRequest(request.id);
            (0, globals_1.expect)(updatedRequest?.state).toBe('approved');
            (0, globals_1.expect)(updatedRequest?.approval?.approvedBy).toBe('admin123');
            (0, globals_1.expect)(updatedRequest?.approval?.approvalNotes).toBe('Approved for compliance');
        });
        (0, globals_1.it)('should reject a pending request', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'hard',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            await orchestrator.rejectRequest(request.id, 'admin123', 'Insufficient justification');
            const updatedRequest = orchestrator.getRequest(request.id);
            (0, globals_1.expect)(updatedRequest?.state).toBe('rejected');
            (0, globals_1.expect)(updatedRequest?.approval?.rejectedBy).toBe('admin123');
            (0, globals_1.expect)(updatedRequest?.approval?.rejectionReason).toBe('Insufficient justification');
        });
        (0, globals_1.it)('should throw error when approving non-pending request', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'admin',
                    userId: 'admin123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'Internal policy',
                    reason: 'Data cleanup',
                },
                deletionType: 'soft',
                dryRun: true,
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            await orchestrator.approveRequest(request.id, 'admin123');
            // Try to approve again
            await (0, globals_1.expect)(orchestrator.approveRequest(request.id, 'admin123')).rejects.toThrow('is not pending approval');
        });
    });
    (0, globals_1.describe)('Dry-Run Mode', () => {
        (0, globals_1.it)('should perform dry-run and populate results', async () => {
            const mockQuery = pool.query;
            mockQuery.mockResolvedValue({
                rows: [{ count: '250' }],
            });
            const record = {
                metadata: {
                    datasetId: 'dataset-1',
                    name: 'Test Dataset',
                    dataType: 'analytics',
                    containsPersonalData: true,
                    jurisdictions: ['EU'],
                    tags: ['postgres:table:users'],
                    storageSystems: ['postgres'],
                    owner: 'test',
                    createdAt: new Date(),
                },
                policy: {
                    datasetId: 'dataset-1',
                    templateId: 'standard',
                    retentionDays: 365,
                    purgeGraceDays: 30,
                    legalHoldAllowed: false,
                    storageTargets: ['postgres'],
                    classificationLevel: 'restricted',
                    safeguards: [],
                    appliedAt: new Date(),
                    appliedBy: 'system',
                },
                archiveHistory: [],
                lastEvaluatedAt: new Date(),
            };
            globals_1.jest.spyOn(repository, 'getRecord').mockReturnValue(record);
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'hard',
                dryRun: true,
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.dryRun).toBe(true);
            (0, globals_1.expect)(request.dryRunResults).toBeDefined();
            (0, globals_1.expect)(request.dryRunResults?.affectedRecords.length).toBeGreaterThan(0);
            (0, globals_1.expect)(request.dryRunResults?.estimatedDuration).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Request Status Tracking', () => {
        (0, globals_1.it)('should return request status with progress', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'soft',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            const status = orchestrator.getRequestStatus(request.id);
            (0, globals_1.expect)(status.request).toBeDefined();
            (0, globals_1.expect)(status.request?.id).toBe(request.id);
            (0, globals_1.expect)(status.progress).toBeDefined();
            (0, globals_1.expect)(status.progress.totalJobs).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(status.progress.percentComplete).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(status.progress.percentComplete).toBeLessThanOrEqual(100);
        });
    });
    (0, globals_1.describe)('Audit Trail', () => {
        (0, globals_1.it)('should maintain complete audit trail', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'soft',
                dryRun: true,
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            (0, globals_1.expect)(request.auditEvents.length).toBeGreaterThan(0);
            // Should have submission event
            (0, globals_1.expect)(request.auditEvents.some((e) => e.eventType === 'request.submitted')).toBe(true);
            // Should have validation events
            (0, globals_1.expect)(request.auditEvents.some((e) => e.eventType.startsWith('validation.'))).toBe(true);
            await orchestrator.approveRequest(request.id, 'admin123');
            const updatedRequest = orchestrator.getRequest(request.id);
            (0, globals_1.expect)(updatedRequest?.auditEvents.some((e) => e.eventType === 'request.approved')).toBe(true);
        });
        (0, globals_1.it)('should record all state transitions', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'soft',
                dryRun: true,
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            const initialEvents = request.auditEvents.length;
            await orchestrator.rejectRequest(request.id, 'admin123', 'Test rejection');
            const updatedRequest = orchestrator.getRequest(request.id);
            (0, globals_1.expect)(updatedRequest?.auditEvents.length).toBeGreaterThan(initialEvents);
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle request for nonexistent dataset', async () => {
            globals_1.jest.spyOn(repository, 'getRecord').mockReturnValue(undefined);
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['nonexistent'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'hard',
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            // Should still process, but with zero impact
            (0, globals_1.expect)(request.impact?.estimatedRecordCount).toBe(0);
        });
        (0, globals_1.it)('should handle concurrent approval attempts', async () => {
            const requestData = {
                scope: 'dataset',
                requester: {
                    type: 'user',
                    userId: 'user123',
                },
                target: {
                    datasetIds: ['dataset-1'],
                },
                justification: {
                    legalBasis: 'GDPR Article 17',
                    reason: 'User request',
                },
                deletionType: 'soft',
                dryRun: true,
            };
            const request = await orchestrator.submitRTBFRequest(requestData);
            // First approval should succeed
            await orchestrator.approveRequest(request.id, 'admin1');
            // Second approval should fail
            await (0, globals_1.expect)(orchestrator.approveRequest(request.id, 'admin2')).rejects.toThrow();
        });
    });
});
