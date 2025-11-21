/**
 * InvestigationRepo Test Suite
 *
 * Tests for:
 * - Investigation CRUD operations
 * - Status management (active, archived, completed)
 * - List and filter functionality
 * - Statistics aggregation
 * - Batch operations
 * - Transaction handling
 */

import { jest } from '@jest/globals';
import {
  InvestigationRepo,
  type Investigation,
  type InvestigationInput,
} from '../InvestigationRepo';
import type { Pool, PoolClient } from 'pg';

describe('InvestigationRepo', () => {
  let investigationRepo: InvestigationRepo;
  let mockPgPool: jest.Mocked<Pool>;
  let mockPgClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    // Mock PostgreSQL client
    mockPgClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Mock PostgreSQL pool
    mockPgPool = {
      connect: jest.fn().mockResolvedValue(mockPgClient),
      query: jest.fn(),
    } as any;

    investigationRepo = new InvestigationRepo(mockPgPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockInput: InvestigationInput = {
      tenantId: 'tenant-123',
      name: 'Fraud Investigation 2024',
      description: 'Investigation into suspicious transactions',
      status: 'active',
      props: { priority: 'high', assigned: 'analyst-1' },
    };

    const mockUserId = 'user-456';

    it('should create investigation successfully', async () => {
      const mockRow = {
        id: 'inv-789',
        tenant_id: mockInput.tenantId,
        name: mockInput.name,
        description: mockInput.description,
        status: mockInput.status,
        props: mockInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.create(mockInput, mockUserId);

      expect(result.id).toBe(mockRow.id);
      expect(result.name).toBe(mockInput.name);
      expect(result.status).toBe(mockInput.status);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO investigations'),
        expect.arrayContaining([
          expect.any(String), // UUID
          mockInput.tenantId,
          mockInput.name,
          mockInput.description,
          mockInput.status,
          JSON.stringify(mockInput.props),
          mockUserId,
        ]),
      );
    });

    it('should default status to active if not provided', async () => {
      const inputWithoutStatus: InvestigationInput = {
        tenantId: 'tenant-123',
        name: 'Test Investigation',
      };

      const mockRow = {
        id: 'inv-789',
        tenant_id: inputWithoutStatus.tenantId,
        name: inputWithoutStatus.name,
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.create(
        inputWithoutStatus,
        mockUserId,
      );

      expect(result.status).toBe('active');
      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain('active');
    });

    it('should handle optional description', async () => {
      const inputWithoutDescription: InvestigationInput = {
        tenantId: 'tenant-123',
        name: 'Test Investigation',
      };

      const mockRow = {
        id: 'inv-789',
        tenant_id: inputWithoutDescription.tenantId,
        name: inputWithoutDescription.name,
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.create(
        inputWithoutDescription,
        mockUserId,
      );

      expect(result.description).toBeUndefined();
    });

    it('should handle empty props', async () => {
      const inputWithoutProps: InvestigationInput = {
        tenantId: 'tenant-123',
        name: 'Test Investigation',
      };

      const mockRow = {
        id: 'inv-789',
        tenant_id: inputWithoutProps.tenantId,
        name: inputWithoutProps.name,
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.create(
        inputWithoutProps,
        mockUserId,
      );

      expect(result.props).toEqual({});
    });
  });

  describe('update', () => {
    it('should update investigation name', async () => {
      const updateInput = {
        id: 'inv-789',
        name: 'Updated Investigation Name',
      };

      const mockRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        name: updateInput.name,
        description: 'Old description',
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.update(updateInput);

      expect(result).not.toBeNull();
      expect(result?.name).toBe(updateInput.name);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE investigations SET'),
        expect.arrayContaining([updateInput.id, updateInput.name]),
      );
    });

    it('should update status', async () => {
      const updateInput = {
        id: 'inv-789',
        status: 'completed' as const,
      };

      const mockRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        name: 'Investigation',
        description: null,
        status: updateInput.status,
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.update(updateInput);

      expect(result?.status).toBe('completed');
    });

    it('should update multiple fields', async () => {
      const updateInput = {
        id: 'inv-789',
        name: 'New Name',
        description: 'New description',
        status: 'archived' as const,
        props: { updated: true },
      };

      const mockRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        name: updateInput.name,
        description: updateInput.description,
        status: updateInput.status,
        props: updateInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.update(updateInput);

      expect(result?.name).toBe(updateInput.name);
      expect(result?.description).toBe(updateInput.description);
      expect(result?.status).toBe(updateInput.status);
      expect(result?.props).toEqual(updateInput.props);
    });

    it('should return null if investigation not found', async () => {
      const updateInput = {
        id: 'non-existent',
        name: 'Updated Name',
      };

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await investigationRepo.update(updateInput);

      expect(result).toBeNull();
    });

    it('should return existing investigation if no fields to update', async () => {
      const updateInput = {
        id: 'inv-789',
      };

      const mockRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        name: 'Existing Name',
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.update(updateInput);

      expect(result).not.toBeNull();
      // Should have called findById instead of UPDATE
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM investigations WHERE id = $1'),
        [updateInput.id],
      );
    });

    it('should always update updated_at timestamp', async () => {
      const updateInput = {
        id: 'inv-789',
        name: 'Updated Name',
      };

      const mockRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        name: updateInput.name,
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      await investigationRepo.update(updateInput);

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('updated_at = now()');
    });
  });

  describe('delete', () => {
    it('should delete investigation successfully', async () => {
      const investigationId = 'inv-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await investigationRepo.delete(investigationId);

      expect(result).toBe(true);
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPgClient.query).toHaveBeenCalledWith(
        'DELETE FROM investigations WHERE id = $1',
        [investigationId],
      );
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should return false if investigation not found', async () => {
      const investigationId = 'non-existent';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 0 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await investigationRepo.delete(investigationId);

      expect(result).toBe(false);
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const investigationId = 'inv-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        investigationRepo.delete(investigationId),
      ).rejects.toThrow('Database error');

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find investigation by ID', async () => {
      const investigationId = 'inv-789';
      const mockRow = {
        id: investigationId,
        tenant_id: 'tenant-123',
        name: 'Test Investigation',
        description: 'Description',
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await investigationRepo.findById(investigationId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(investigationId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM investigations WHERE id = $1',
        [investigationId],
      );
    });

    it('should filter by tenantId when provided', async () => {
      const investigationId = 'inv-789';
      const tenantId = 'tenant-123';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.findById(investigationId, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        [investigationId, tenantId],
      );
    });

    it('should return null if investigation not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await investigationRepo.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list investigations for tenant', async () => {
      const mockRows = [
        {
          id: 'inv-1',
          tenant_id: 'tenant-123',
          name: 'Investigation 1',
          description: null,
          status: 'active',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
        {
          id: 'inv-2',
          tenant_id: 'tenant-123',
          name: 'Investigation 2',
          description: null,
          status: 'completed',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-2',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await investigationRepo.list({
        tenantId: 'tenant-123',
      });

      expect(results).toHaveLength(2);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        expect.arrayContaining(['tenant-123']),
      );
    });

    it('should filter by status', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.list({
        tenantId: 'tenant-123',
        status: 'active',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.arrayContaining(['tenant-123', 'active']),
      );
    });

    it('should respect limit and offset', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.list({
        tenantId: 'tenant-123',
        limit: 25,
        offset: 50,
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('LIMIT');
      expect(queryCall[0]).toContain('OFFSET');
      expect(queryCall[1]).toContain(25);
      expect(queryCall[1]).toContain(50);
    });

    it('should use default limit of 50', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.list({
        tenantId: 'tenant-123',
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(50);
    });

    it('should cap limit at 1000', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.list({
        tenantId: 'tenant-123',
        limit: 5000,
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(1000);
    });

    it('should order by created_at DESC', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.list({
        tenantId: 'tenant-123',
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });
  });

  describe('getStats', () => {
    it('should return entity and relationship counts', async () => {
      const investigationId = 'inv-789';
      const tenantId = 'tenant-123';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '42' }] } as any) // Entities
        .mockResolvedValueOnce({ rows: [{ count: '18' }] } as any); // Relationships

      const stats = await investigationRepo.getStats(
        investigationId,
        tenantId,
      );

      expect(stats.entityCount).toBe(42);
      expect(stats.relationshipCount).toBe(18);
      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle zero counts', async () => {
      const investigationId = 'inv-789';
      const tenantId = 'tenant-123';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      const stats = await investigationRepo.getStats(
        investigationId,
        tenantId,
      );

      expect(stats.entityCount).toBe(0);
      expect(stats.relationshipCount).toBe(0);
    });

    it('should handle missing count values', async () => {
      const investigationId = 'inv-789';
      const tenantId = 'tenant-123';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const stats = await investigationRepo.getStats(
        investigationId,
        tenantId,
      );

      expect(stats.entityCount).toBe(0);
      expect(stats.relationshipCount).toBe(0);
    });
  });

  describe('batchByIds', () => {
    it('should load multiple investigations by IDs', async () => {
      const ids = ['inv-1', 'inv-2', 'inv-3'];
      const mockRows = ids.map((id) => ({
        id,
        tenant_id: 'tenant-123',
        name: `Investigation ${id}`,
        description: null,
        status: 'active',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1',
      }));

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await investigationRepo.batchByIds(ids);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r !== null)).toBe(true);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ANY($1)'),
        [ids],
      );
    });

    it('should return nulls for missing investigations', async () => {
      const ids = ['inv-1', 'inv-2', 'inv-3'];
      const mockRows = [
        {
          id: 'inv-1',
          tenant_id: 'tenant-123',
          name: 'Investigation 1',
          description: null,
          status: 'active',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await investigationRepo.batchByIds(ids);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();
    });

    it('should handle empty IDs array', async () => {
      const results = await investigationRepo.batchByIds([]);

      expect(results).toEqual([]);
      expect(mockPgPool.query).not.toHaveBeenCalled();
    });

    it('should filter by tenantId when provided', async () => {
      const ids = ['inv-1', 'inv-2'];
      const tenantId = 'tenant-123';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await investigationRepo.batchByIds(ids, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        [ids, tenantId],
      );
    });

    it('should maintain order of input IDs', async () => {
      const ids = ['inv-3', 'inv-1', 'inv-2'];
      const mockRows = [
        {
          id: 'inv-1',
          tenant_id: 'tenant-123',
          name: 'Investigation 1',
          description: null,
          status: 'active',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
        {
          id: 'inv-2',
          tenant_id: 'tenant-123',
          name: 'Investigation 2',
          description: null,
          status: 'active',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await investigationRepo.batchByIds(ids);

      expect(results[0]).toBeNull(); // inv-3 not found
      expect(results[1]?.id).toBe('inv-1');
      expect(results[2]?.id).toBe('inv-2');
    });
  });
});
