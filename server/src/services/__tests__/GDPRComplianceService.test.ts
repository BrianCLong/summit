/**
 * Tests for GDPRComplianceService
 */

import { Pool } from 'pg';
import { GDPRComplianceService, DataSubjectRequest } from '../GDPRComplianceService';

jest.mock('pg');

describe('GDPRComplianceService', () => {
  let mockPool: jest.Mocked<Pool>;
  let service: GDPRComplianceService;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    service = new GDPRComplianceService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataSubjectRequest', () => {
    it('should create a data subject request with 30-day deadline', async () => {
      const request: DataSubjectRequest = {
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
      } as any);

      const result = await service.createDataSubjectRequest(request);

      expect(result).toBeDefined();
      expect(result.requestType).toBe('access');
      expect(result.requestStatus).toBe('pending');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should support all GDPR request types', async () => {
      const requestTypes: Array<DataSubjectRequest['requestType']> = [
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
        } as any);

        const result = await service.createDataSubjectRequest({
          tenantId: 'tenant-123',
          subjectId: 'user-456',
          subjectIdentifiers: {},
          requestType,
          requestStatus: 'pending',
          requestReason: `Test ${requestType}`,
          completionDeadline: new Date(),
        });

        expect(result.requestType).toBe(requestType);
      }
    });
  });

  describe('updateDataSubjectRequest', () => {
    it('should update request status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            request_id: 'dsr-123',
            request_status: 'in_progress',
            assigned_to: 'compliance-officer-456',
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await service.updateDataSubjectRequest('dsr-123', {
        requestStatus: 'in_progress',
        assignedTo: 'compliance-officer-456',
      });

      expect(result.requestStatus).toBe('in_progress');
      expect(result.assignedTo).toBe('compliance-officer-456');
    });

    it('should throw error if request not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.updateDataSubjectRequest('nonexistent', { requestStatus: 'completed' })
      ).rejects.toThrow('Data subject request not found');
    });
  });

  describe('getOverdueRequests', () => {
    it('should return requests past completion deadline', async () => {
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
      } as any);

      const overdueRequests = await service.getOverdueRequests('tenant-123');

      expect(overdueRequests).toHaveLength(1);
      expect(overdueRequests[0].completionDeadline).toEqual(pastDate);
    });
  });

  describe('upsertRetentionPolicy', () => {
    it('should create a new retention policy', async () => {
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
      } as any);

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

      expect(policy.policyName).toBe('GDPR Personal Data');
      expect(policy.retentionPeriodDays).toBe(2555);
      expect(policy.applicableJurisdictions).toContain('EU');
    });
  });

  describe('getActiveRetentionPolicies', () => {
    it('should return only active policies', async () => {
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
      } as any);

      const policies = await service.getActiveRetentionPolicies();

      expect(policies).toHaveLength(1);
      expect(policies[0].isActive).toBe(true);
    });
  });

  describe('logDataDeletion', () => {
    it('should log data deletion with proper metadata', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.logDataDeletion({
        tenantId: 'tenant-123',
        deletionType: 'anonymization',
        resourceType: 'user',
        resourceId: 'user-456',
        resourceIdentifiers: { email: 'user@example.com' },
        deletionReason: 'GDPR Article 17 - Right to Erasure',
        deletedBy: 'compliance-officer-789',
      });

      expect(result.deletionId).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_deletion_log'),
        expect.any(Array)
      );
    });

    it('should support all deletion types', async () => {
      const deletionTypes: Array<'hard_delete' | 'soft_delete' | 'anonymization' | 'pseudonymization' | 'archival'> = [
        'hard_delete',
        'soft_delete',
        'anonymization',
        'pseudonymization',
        'archival',
      ];

      for (const deletionType of deletionTypes) {
        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        const result = await service.logDataDeletion({
          tenantId: 'tenant-123',
          deletionType,
          resourceType: 'user',
          resourceId: 'user-456',
          resourceIdentifiers: {},
          deletionReason: `Test ${deletionType}`,
          deletedBy: 'admin',
        });

        expect(result.deletionId).toBeDefined();
      }
    });
  });

  describe('processRightToErasure', () => {
    it('should process erasure request through completion', async () => {
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
      } as any);

      // Mock updateDataSubjectRequest (set to in_progress)
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            request_id: 'dsr-123',
            request_status: 'in_progress',
            assigned_to: 'processor-123',
          },
        ],
      } as any);

      // Mock updateDataSubjectRequest (set to completed)
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            request_id: 'dsr-123',
            request_status: 'completed',
            completed_at: new Date(),
          },
        ],
      } as any);

      await service.processRightToErasure('dsr-123', 'processor-123');

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error for non-erasure requests', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            request_id: 'dsr-123',
            request_type: 'access', // Not erasure
            request_status: 'pending',
          },
        ],
      } as any);

      await expect(
        service.processRightToErasure('dsr-123', 'processor-123')
      ).rejects.toThrow('Invalid erasure request');
    });
  });

  describe('listDataSubjectRequests', () => {
    it('should list requests with filters', async () => {
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
      } as any);

      const requests = await service.listDataSubjectRequests({
        tenantId: 'tenant-123',
        requestType: 'access',
        requestStatus: 'pending',
        limit: 10,
      });

      expect(requests).toHaveLength(1);
      expect(requests[0].requestType).toBe('access');
    });
  });
});
