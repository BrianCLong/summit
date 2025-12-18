import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { RTBFOrchestrator } from '../rtbfOrchestrator.js';
import { DataRetentionRepository } from '../repository.js';
import { PolicyEvaluator } from '../policyEvaluator.js';
import { RedactionEngine } from '../redactionEngine.js';
import {
  RTBFRequest,
  RetentionRecord,
  DatasetMetadata,
  AppliedRetentionPolicy,
} from '../types.js';

describe('RTBFOrchestrator', () => {
  let pool: Pool;
  let repository: DataRetentionRepository;
  let orchestrator: RTBFOrchestrator;

  beforeEach(() => {
    pool = {
      query: jest.fn(),
    } as any;

    repository = new DataRetentionRepository(pool);
    orchestrator = new RTBFOrchestrator({ pool, repository });
  });

  describe('RTBF Request Submission', () => {
    it('should submit a new RTBF request', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.id).toBeDefined();
      expect(request.state).toBe('pending_approval'); // After auto-validation
      expect(request.auditEvents.length).toBeGreaterThan(0);
      expect(request.auditEvents[0].eventType).toBe('request.submitted');
    });

    it('should auto-validate request after submission', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.state).toBe('pending_approval');
      expect(
        request.auditEvents.some((e) => e.eventType === 'validation.passed'),
      ).toBe(true);
    });

    it('should perform impact assessment during validation', async () => {
      const metadata: DatasetMetadata = {
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

      const policy: AppliedRetentionPolicy = {
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

      const record: RetentionRecord = {
        metadata,
        policy,
        archiveHistory: [],
        lastEvaluatedAt: new Date(),
      };

      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.impact).toBeDefined();
      expect(request.impact?.estimatedRecordCount).toBe(5000);
      expect(request.impact?.affectedSystems).toContain('postgres');
    });
  });

  describe('Legal Hold Validation', () => {
    it('should reject request if legal hold is active', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const record: RetentionRecord = {
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

      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.state).toBe('rejected');
      expect(request.approval?.rejectionReason).toContain('Legal hold');
    });
  });

  describe('Request Approval Workflow', () => {
    it('should approve a pending request', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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
      expect(request.state).toBe('pending_approval');

      await orchestrator.approveRequest(
        request.id,
        'admin123',
        'Approved for compliance',
      );

      const updatedRequest = orchestrator.getRequest(request.id);
      expect(updatedRequest?.state).toBe('approved');
      expect(updatedRequest?.approval?.approvedBy).toBe('admin123');
      expect(updatedRequest?.approval?.approvalNotes).toBe(
        'Approved for compliance',
      );
    });

    it('should reject a pending request', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      await orchestrator.rejectRequest(
        request.id,
        'admin123',
        'Insufficient justification',
      );

      const updatedRequest = orchestrator.getRequest(request.id);
      expect(updatedRequest?.state).toBe('rejected');
      expect(updatedRequest?.approval?.rejectedBy).toBe('admin123');
      expect(updatedRequest?.approval?.rejectionReason).toBe(
        'Insufficient justification',
      );
    });

    it('should throw error when approving non-pending request', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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
      await expect(
        orchestrator.approveRequest(request.id, 'admin123'),
      ).rejects.toThrow('is not pending approval');
    });
  });

  describe('Dry-Run Mode', () => {
    it('should perform dry-run and populate results', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '250' }],
      });

      const record: RetentionRecord = {
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

      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.dryRun).toBe(true);
      expect(request.dryRunResults).toBeDefined();
      expect(request.dryRunResults?.affectedRecords.length).toBeGreaterThan(0);
      expect(request.dryRunResults?.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('Request Status Tracking', () => {
    it('should return request status with progress', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(status.request).toBeDefined();
      expect(status.request?.id).toBe(request.id);
      expect(status.progress).toBeDefined();
      expect(status.progress.totalJobs).toBeGreaterThanOrEqual(0);
      expect(status.progress.percentComplete).toBeGreaterThanOrEqual(0);
      expect(status.progress.percentComplete).toBeLessThanOrEqual(100);
    });
  });

  describe('Audit Trail', () => {
    it('should maintain complete audit trail', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      expect(request.auditEvents.length).toBeGreaterThan(0);

      // Should have submission event
      expect(
        request.auditEvents.some((e) => e.eventType === 'request.submitted'),
      ).toBe(true);

      // Should have validation events
      expect(
        request.auditEvents.some((e) => e.eventType.startsWith('validation.')),
      ).toBe(true);

      await orchestrator.approveRequest(request.id, 'admin123');

      const updatedRequest = orchestrator.getRequest(request.id);
      expect(
        updatedRequest?.auditEvents.some(
          (e) => e.eventType === 'request.approved',
        ),
      ).toBe(true);
    });

    it('should record all state transitions', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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

      await orchestrator.rejectRequest(
        request.id,
        'admin123',
        'Test rejection',
      );

      const updatedRequest = orchestrator.getRequest(request.id);
      expect(updatedRequest?.auditEvents.length).toBeGreaterThan(
        initialEvents,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle request for nonexistent dataset', async () => {
      jest.spyOn(repository, 'getRecord').mockReturnValue(undefined);

      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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
      expect(request.impact?.estimatedRecordCount).toBe(0);
    });

    it('should handle concurrent approval attempts', async () => {
      const requestData: Omit<
        RTBFRequest,
        'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'
      > = {
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
      await expect(
        orchestrator.approveRequest(request.id, 'admin2'),
      ).rejects.toThrow();
    });
  });
});
