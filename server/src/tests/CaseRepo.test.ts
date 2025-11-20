/**
 * CaseRepo Unit Tests
 * Tests CRUD operations for Case Spaces
 */

import { Pool } from 'pg';
import { CaseRepo, CaseInput } from '../repos/CaseRepo';

describe('CaseRepo', () => {
  let mockPool: jest.Mocked<Pool>;
  let repo: CaseRepo;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    } as any;
    repo = new CaseRepo(mockPool);
  });

  describe('create', () => {
    it('should create a new case with required fields', async () => {
      const input: CaseInput = {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.create(input, 'user-123');

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Case');
      expect(result.compartment).toBe('SECRET');
      expect(result.policyLabels).toEqual(['sensitive', 'compliance']);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should create a case with default status if not provided', async () => {
      const input: CaseInput = {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.create(input, 'user-123');

      expect(result.status).toBe('open');
    });
  });

  describe('findById', () => {
    it('should find a case by ID', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.findById('case-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('case-123');
      expect(result?.compartment).toBe('SECRET');
    });

    it('should return null if case not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should filter by tenantId when provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await repo.findById('case-123', 'tenant-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id'),
        ['case-123', 'tenant-123'],
      );
    });
  });

  describe('update', () => {
    it('should update case fields', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.update({
        id: 'case-123',
        title: 'Updated Case',
        status: 'active',
        compartment: 'TOP_SECRET',
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Case');
      expect(result?.status).toBe('active');
    });

    it('should set closed_at and closed_by when status changes to closed', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.update(
        { id: 'case-123', status: 'closed' },
        'user-456',
      );

      expect(result?.status).toBe('closed');
      expect(result?.closedBy).toBe('user-456');
      expect(result?.closedAt).toBeDefined();
    });
  });

  describe('list', () => {
    it('should list cases with filters', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const results = await repo.list({
        tenantId: 'tenant-123',
        status: 'open',
        compartment: 'SECRET',
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('open');
      expect(results[1].compartment).toBe('SECRET');
    });

    it('should filter by policy labels', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await repo.list({
        tenantId: 'tenant-123',
        policyLabels: ['sensitive', 'compliance'],
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('policy_labels &&'),
        expect.arrayContaining(['tenant-123', ['sensitive', 'compliance']]),
      );
    });
  });

  describe('delete', () => {
    it('should prevent deletion if case has audit logs', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'log-1' }] }); // Audit logs check

      mockPool.connect = jest.fn().mockResolvedValueOnce(mockClient);

      await expect(repo.delete('case-123')).rejects.toThrow(
        'Cannot delete case with existing audit logs',
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should delete case if no audit logs exist', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No audit logs
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
        .mockResolvedValueOnce(undefined); // COMMIT

      mockPool.connect = jest.fn().mockResolvedValueOnce(mockClient);

      const result = await repo.delete('case-123');

      expect(result).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('should archive a case by updating status', async () => {
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

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await repo.archive('case-123', 'user-123');

      expect(result?.status).toBe('archived');
    });
  });

  describe('count', () => {
    it('should count cases with filters', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '42' }],
      } as any);

      const count = await repo.count({
        tenantId: 'tenant-123',
        status: 'open',
      });

      expect(count).toBe(42);
    });
  });
});
