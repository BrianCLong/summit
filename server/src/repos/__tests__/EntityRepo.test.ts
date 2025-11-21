/**
 * EntityRepo Test Suite
 *
 * Tests for:
 * - Entity CRUD operations
 * - Dual-write to PostgreSQL and Neo4j
 * - Transaction handling and rollbacks
 * - Outbox pattern for eventual consistency
 * - Batch operations
 * - Search functionality
 */

import { jest } from '@jest/globals';
import { EntityRepo, type Entity, type EntityInput } from '../EntityRepo';
import type { Pool, PoolClient } from 'pg';
import type { Driver, Session } from 'neo4j-driver';

describe('EntityRepo', () => {
  let entityRepo: EntityRepo;
  let mockPgPool: jest.Mocked<Pool>;
  let mockPgClient: jest.Mocked<PoolClient>;
  let mockNeo4jDriver: jest.Mocked<Driver>;
  let mockNeo4jSession: jest.Mocked<Session>;

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

    // Mock Neo4j session
    mockNeo4jSession = {
      executeWrite: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock Neo4j driver
    mockNeo4jDriver = {
      session: jest.fn().mockReturnValue(mockNeo4jSession),
    } as any;

    entityRepo = new EntityRepo(mockPgPool, mockNeo4jDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockEntityInput: EntityInput = {
      tenantId: 'tenant-123',
      kind: 'Person',
      labels: ['Individual', 'Customer'],
      props: { name: 'John Doe', email: 'john@example.com' },
    };

    const mockUserId = 'user-456';

    it('should create entity in PostgreSQL', async () => {
      const mockEntityRow = {
        id: 'entity-789',
        tenant_id: mockEntityInput.tenantId,
        kind: mockEntityInput.kind,
        labels: mockEntityInput.labels,
        props: mockEntityInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.create(mockEntityInput, mockUserId);

      expect(result.id).toBe(mockEntityRow.id);
      expect(result.tenantId).toBe(mockEntityInput.tenantId);
      expect(result.kind).toBe(mockEntityInput.kind);
      expect(result.labels).toEqual(mockEntityInput.labels);
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create outbox event for Neo4j sync', async () => {
      const mockEntityRow = {
        id: 'entity-789',
        tenant_id: mockEntityInput.tenantId,
        kind: mockEntityInput.kind,
        labels: mockEntityInput.labels,
        props: mockEntityInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await entityRepo.create(mockEntityInput, mockUserId);

      // Verify outbox event was created
      const outboxCall = mockPgClient.query.mock.calls.find((call) =>
        call[0].includes('outbox_events'),
      );
      expect(outboxCall).toBeDefined();
      expect(outboxCall?.[0]).toContain('entity.upsert');
    });

    it('should attempt immediate Neo4j write', async () => {
      const mockEntityRow = {
        id: 'entity-789',
        tenant_id: mockEntityInput.tenantId,
        kind: mockEntityInput.kind,
        labels: mockEntityInput.labels,
        props: mockEntityInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await entityRepo.create(mockEntityInput, mockUserId);

      expect(mockNeo4jDriver.session).toHaveBeenCalled();
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should rollback on PostgreSQL error', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockRejectedValueOnce(
        new Error('PostgreSQL constraint violation'),
      );

      await expect(
        entityRepo.create(mockEntityInput, mockUserId),
      ).rejects.toThrow('PostgreSQL constraint violation');

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should commit even if Neo4j write fails', async () => {
      const mockEntityRow = {
        id: 'entity-789',
        tenant_id: mockEntityInput.tenantId,
        kind: mockEntityInput.kind,
        labels: mockEntityInput.labels,
        props: mockEntityInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockRejectedValue(
        new Error('Neo4j connection error'),
      );

      // Should not throw - best effort Neo4j write
      const result = await entityRepo.create(mockEntityInput, mockUserId);

      expect(result.id).toBe(mockEntityRow.id);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle empty labels and props', async () => {
      const minimalInput: EntityInput = {
        tenantId: 'tenant-123',
        kind: 'Entity',
      };

      const mockEntityRow = {
        id: 'entity-789',
        tenant_id: minimalInput.tenantId,
        kind: minimalInput.kind,
        labels: [],
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.create(minimalInput, mockUserId);

      expect(result.labels).toEqual([]);
      expect(result.props).toEqual({});
    });
  });

  describe('update', () => {
    it('should update entity labels and props', async () => {
      const updateInput = {
        id: 'entity-789',
        labels: ['NewLabel'],
        props: { name: 'Jane Doe' },
      };

      const mockEntityRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        kind: 'Person',
        labels: updateInput.labels,
        props: updateInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // UPDATE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.update(updateInput);

      expect(result).not.toBeNull();
      expect(result?.labels).toEqual(updateInput.labels);
      expect(result?.props).toEqual(updateInput.props);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return null if entity not found', async () => {
      const updateInput = {
        id: 'non-existent',
        labels: ['NewLabel'],
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE (no rows)

      const result = await entityRepo.update(updateInput);

      expect(result).toBeNull();
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle partial updates (only labels)', async () => {
      const updateInput = {
        id: 'entity-789',
        labels: ['UpdatedLabel'],
      };

      const mockEntityRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        kind: 'Person',
        labels: updateInput.labels,
        props: { existing: 'props' },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // UPDATE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.update(updateInput);

      expect(result?.labels).toEqual(updateInput.labels);
    });

    it('should handle partial updates (only props)', async () => {
      const updateInput = {
        id: 'entity-789',
        props: { updated: 'value' },
      };

      const mockEntityRow = {
        id: updateInput.id,
        tenant_id: 'tenant-123',
        kind: 'Person',
        labels: ['ExistingLabel'],
        props: updateInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockEntityRow] }); // UPDATE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.update(updateInput);

      expect(result?.props).toEqual(updateInput.props);
    });
  });

  describe('delete', () => {
    it('should delete entity from PostgreSQL', async () => {
      const entityId = 'entity-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await entityRepo.delete(entityId);

      expect(result).toBe(true);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create outbox event for Neo4j deletion', async () => {
      const entityId = 'entity-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await entityRepo.delete(entityId);

      const outboxCall = mockPgClient.query.mock.calls.find((call) =>
        call[0].includes('entity.delete'),
      );
      expect(outboxCall).toBeDefined();
    });

    it('should return false if entity not found', async () => {
      const entityId = 'non-existent';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 0 }); // DELETE

      const result = await entityRepo.delete(entityId);

      expect(result).toBe(false);
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should attempt Neo4j delete', async () => {
      const entityId = 'entity-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await entityRepo.delete(entityId);

      expect(mockNeo4jDriver.session).toHaveBeenCalled();
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find entity by ID', async () => {
      const entityId = 'entity-789';
      const mockEntityRow = {
        id: entityId,
        tenant_id: 'tenant-123',
        kind: 'Person',
        labels: ['Individual'],
        props: { name: 'John Doe' },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockEntityRow] } as any);

      const result = await entityRepo.findById(entityId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(entityId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM entities WHERE id = $1'),
        [entityId],
      );
    });

    it('should filter by tenantId when provided', async () => {
      const entityId = 'entity-789';
      const tenantId = 'tenant-123';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.findById(entityId, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        [entityId, tenantId],
      );
    });

    it('should return null if entity not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await entityRepo.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search entities by tenantId', async () => {
      const mockEntities = [
        {
          id: 'entity-1',
          tenant_id: 'tenant-123',
          kind: 'Person',
          labels: [],
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockEntities } as any);

      const results = await entityRepo.search({ tenantId: 'tenant-123' });

      expect(results).toHaveLength(1);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        expect.arrayContaining(['tenant-123']),
      );
    });

    it('should filter by kind when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.search({
        tenantId: 'tenant-123',
        kind: 'Person',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND kind = $2'),
        expect.arrayContaining(['tenant-123', 'Person']),
      );
    });

    it('should filter by props when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.search({
        tenantId: 'tenant-123',
        props: { status: 'active' },
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('props @> $2::jsonb'),
        expect.any(Array),
      );
    });

    it('should respect limit and offset', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.search({
        tenantId: 'tenant-123',
        limit: 50,
        offset: 100,
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('LIMIT');
      expect(queryCall[0]).toContain('OFFSET');
      expect(queryCall[1]).toContain(50);
      expect(queryCall[1]).toContain(100);
    });

    it('should cap limit at 1000 for safety', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.search({
        tenantId: 'tenant-123',
        limit: 5000, // Request more than max
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(1000); // Should be capped
    });
  });

  describe('batchByIds', () => {
    it('should load multiple entities by IDs', async () => {
      const ids = ['entity-1', 'entity-2', 'entity-3'];
      const mockEntities = ids.map((id) => ({
        id,
        tenant_id: 'tenant-123',
        kind: 'Person',
        labels: [],
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1',
      }));

      mockPgPool.query.mockResolvedValue({ rows: mockEntities } as any);

      const results = await entityRepo.batchByIds(ids);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r !== null)).toBe(true);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ANY($1)'),
        [ids],
      );
    });

    it('should return nulls for missing entities', async () => {
      const ids = ['entity-1', 'entity-2', 'entity-3'];
      const mockEntities = [
        {
          id: 'entity-1',
          tenant_id: 'tenant-123',
          kind: 'Person',
          labels: [],
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockEntities } as any);

      const results = await entityRepo.batchByIds(ids);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();
    });

    it('should handle empty IDs array', async () => {
      const results = await entityRepo.batchByIds([]);

      expect(results).toEqual([]);
      expect(mockPgPool.query).not.toHaveBeenCalled();
    });

    it('should filter by tenantId when provided', async () => {
      const ids = ['entity-1', 'entity-2'];
      const tenantId = 'tenant-123';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await entityRepo.batchByIds(ids, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        [ids, tenantId],
      );
    });
  });
});
