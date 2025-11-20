/**
 * AuditAccessLogRepo Unit Tests
 * Tests immutable audit logging with reason-for-access and legal basis
 */

import { Pool } from 'pg';
import { AuditAccessLogRepo, AuditAccessLogInput } from '../repos/AuditAccessLogRepo';

describe('AuditAccessLogRepo', () => {
  let mockPool: jest.Mocked<Pool>;
  let repo: AuditAccessLogRepo;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;
    repo = new AuditAccessLogRepo(mockPool);
  });

  describe('logAccess', () => {
    it('should log access with required fields', async () => {
      const input: AuditAccessLogInput = {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.logAccess(input);

      expect(result).toBeDefined();
      expect(result.action).toBe('view');
      expect(result.reason).toBe('Investigating fraud case');
      expect(result.legalBasis).toBe('investigation');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should fail without reason - policy-by-default', async () => {
      const input: AuditAccessLogInput = {
        tenantId: 'tenant-123',
        caseId: 'case-123',
        userId: 'user-123',
        action: 'view',
        reason: '', // Empty reason
        legalBasis: 'investigation',
      };

      await expect(repo.logAccess(input)).rejects.toThrow(
        'Reason is required for audit logging',
      );
    });

    it('should fail without legal basis - policy-by-default', async () => {
      const input: any = {
        tenantId: 'tenant-123',
        caseId: 'case-123',
        userId: 'user-123',
        action: 'view',
        reason: 'Valid reason',
        // legalBasis is missing
      };

      await expect(repo.logAccess(input)).rejects.toThrow(
        'Legal basis is required for audit logging',
      );
    });

    it('should include warrant information when provided', async () => {
      const input: AuditAccessLogInput = {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.logAccess(input);

      expect(result.warrantId).toBe('warrant-456');
      expect(result.authorityReference).toBe('Court Order #2024-001');
    });

    it('should track correlation ID for related operations', async () => {
      const input: AuditAccessLogInput = {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.logAccess(input);

      expect(result.correlationId).toBe('workflow-789');
    });
  });

  describe('query', () => {
    it('should query audit logs with filters', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const results = await repo.query({
        tenantId: 'tenant-123',
        caseId: 'case-123',
        userId: 'user-123',
      });

      expect(results).toHaveLength(1);
      expect(results[0].caseId).toBe('case-123');
    });

    it('should filter by date range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-12-31');

      await repo.query({
        tenantId: 'tenant-123',
        startTime,
        endTime,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.arrayContaining([startTime, endTime]),
      );
    });

    it('should filter by legal basis', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await repo.query({
        tenantId: 'tenant-123',
        legalBasis: 'court_order',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('legal_basis ='),
        expect.arrayContaining(['court_order']),
      );
    });
  });

  describe('getLogsForCase', () => {
    it('should retrieve all logs for a specific case', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const results = await repo.getLogsForCase('case-123', 'tenant-123');

      expect(results).toHaveLength(1);
      expect(results[0].caseId).toBe('case-123');
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify audit trail integrity', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await repo.verifyIntegrity('tenant-123');

      expect(result).toBeDefined();
      expect(result.totalLogs).toBe(1);
      expect(result.valid).toBeDefined();
    });
  });

  describe('count', () => {
    it('should count audit logs with filters', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '150' }],
      } as any);

      const count = await repo.count({
        tenantId: 'tenant-123',
        action: 'export',
      });

      expect(count).toBe(150);
    });
  });
});
