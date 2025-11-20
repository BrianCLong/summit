/**
 * RelationshipRepo Test Suite
 *
 * Tests for:
 * - Relationship CRUD operations
 * - Dual-write to PostgreSQL and Neo4j
 * - Entity existence validation
 * - Relationship search and filtering
 * - Direction-based queries (incoming/outgoing/both)
 * - Relationship count aggregation
 * - Transaction handling and rollbacks
 * - Outbox pattern for eventual consistency
 */

import { jest } from '@jest/globals';
import {
  RelationshipRepo,
  type Relationship,
  type RelationshipInput,
} from '../RelationshipRepo';
import type { Pool, PoolClient } from 'pg';
import type { Driver, Session } from 'neo4j-driver';

describe('RelationshipRepo', () => {
  let relationshipRepo: RelationshipRepo;
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

    relationshipRepo = new RelationshipRepo(mockPgPool, mockNeo4jDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockInput: RelationshipInput = {
      tenantId: 'tenant-123',
      srcId: 'entity-src-456',
      dstId: 'entity-dst-789',
      type: 'WORKS_WITH',
      props: { since: '2024-01-01', strength: 'strong' },
    };

    const mockUserId = 'user-111';

    it('should create relationship successfully', async () => {
      const mockRow = {
        id: 'rel-999',
        tenant_id: mockInput.tenantId,
        src_id: mockInput.srcId,
        dst_id: mockInput.dstId,
        type: mockInput.type,
        props: mockInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.srcId }] }); // Check src entity
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.dstId }] }); // Check dst entity
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT relationship
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await relationshipRepo.create(mockInput, mockUserId);

      expect(result.id).toBe(mockRow.id);
      expect(result.srcId).toBe(mockInput.srcId);
      expect(result.dstId).toBe(mockInput.dstId);
      expect(result.type).toBe(mockInput.type);
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should validate source entity exists', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [] }); // Src entity not found

      await expect(
        relationshipRepo.create(mockInput, mockUserId),
      ).rejects.toThrow(`Source entity ${mockInput.srcId} not found`);

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should validate destination entity exists', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.srcId }] }); // Src exists
      mockPgClient.query.mockResolvedValueOnce({ rows: [] }); // Dst entity not found

      await expect(
        relationshipRepo.create(mockInput, mockUserId),
      ).rejects.toThrow(`Destination entity ${mockInput.dstId} not found`);

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should create outbox event for Neo4j sync', async () => {
      const mockRow = {
        id: 'rel-999',
        tenant_id: mockInput.tenantId,
        src_id: mockInput.srcId,
        dst_id: mockInput.dstId,
        type: mockInput.type,
        props: mockInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.srcId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.dstId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.create(mockInput, mockUserId);

      const outboxCall = mockPgClient.query.mock.calls.find((call) =>
        call[0].includes('outbox_events'),
      );
      expect(outboxCall).toBeDefined();
      expect(outboxCall?.[0]).toContain('relationship.upsert');
    });

    it('should attempt immediate Neo4j write', async () => {
      const mockRow = {
        id: 'rel-999',
        tenant_id: mockInput.tenantId,
        src_id: mockInput.srcId,
        dst_id: mockInput.dstId,
        type: mockInput.type,
        props: mockInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.srcId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.dstId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.create(mockInput, mockUserId);

      expect(mockNeo4jDriver.session).toHaveBeenCalled();
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should commit even if Neo4j write fails', async () => {
      const mockRow = {
        id: 'rel-999',
        tenant_id: mockInput.tenantId,
        src_id: mockInput.srcId,
        dst_id: mockInput.dstId,
        type: mockInput.type,
        props: mockInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.srcId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: mockInput.dstId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockRejectedValue(
        new Error('Neo4j connection error'),
      );

      const result = await relationshipRepo.create(mockInput, mockUserId);

      expect(result.id).toBe(mockRow.id);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle empty props', async () => {
      const minimalInput: RelationshipInput = {
        tenantId: 'tenant-123',
        srcId: 'entity-src-456',
        dstId: 'entity-dst-789',
        type: 'KNOWS',
      };

      const mockRow = {
        id: 'rel-999',
        tenant_id: minimalInput.tenantId,
        src_id: minimalInput.srcId,
        dst_id: minimalInput.dstId,
        type: minimalInput.type,
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined);
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: minimalInput.srcId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: minimalInput.dstId }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined);
      mockPgClient.query.mockResolvedValueOnce(undefined);
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await relationshipRepo.create(minimalInput, mockUserId);

      expect(result.props).toEqual({});
    });
  });

  describe('delete', () => {
    it('should delete relationship successfully', async () => {
      const relationshipId = 'rel-999';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await relationshipRepo.delete(relationshipId);

      expect(result).toBe(true);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create outbox event for Neo4j deletion', async () => {
      const relationshipId = 'rel-999';

      mockPgClient.query.mockResolvedValueOnce(undefined);
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox
      mockPgClient.query.mockResolvedValueOnce(undefined);
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.delete(relationshipId);

      const outboxCall = mockPgClient.query.mock.calls.find((call) =>
        call[0].includes('relationship.delete'),
      );
      expect(outboxCall).toBeDefined();
    });

    it('should return false if relationship not found', async () => {
      const relationshipId = 'non-existent';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 0 }); // DELETE (no rows)

      const result = await relationshipRepo.delete(relationshipId);

      expect(result).toBe(false);
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findById', () => {
    it('should find relationship by ID', async () => {
      const relationshipId = 'rel-999';
      const mockRow = {
        id: relationshipId,
        tenant_id: 'tenant-123',
        src_id: 'entity-src-456',
        dst_id: 'entity-dst-789',
        type: 'KNOWS',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-111',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await relationshipRepo.findById(relationshipId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(relationshipId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM relationships WHERE id = $1',
        [relationshipId],
      );
    });

    it('should filter by tenantId when provided', async () => {
      const relationshipId = 'rel-999';
      const tenantId = 'tenant-123';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.findById(relationshipId, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        [relationshipId, tenantId],
      );
    });

    it('should return null if relationship not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await relationshipRepo.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEntityId', () => {
    const entityId = 'entity-123';
    const tenantId = 'tenant-456';

    it('should find incoming relationships', async () => {
      const mockRows = [
        {
          id: 'rel-1',
          tenant_id: tenantId,
          src_id: 'other-entity',
          dst_id: entityId,
          type: 'POINTS_TO',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'incoming',
      );

      expect(results).toHaveLength(1);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('dst_id = $2'),
        [tenantId, entityId],
      );
    });

    it('should find outgoing relationships', async () => {
      const mockRows = [
        {
          id: 'rel-2',
          tenant_id: tenantId,
          src_id: entityId,
          dst_id: 'other-entity',
          type: 'KNOWS',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'outgoing',
      );

      expect(results).toHaveLength(1);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('src_id = $2'),
        [tenantId, entityId],
      );
    });

    it('should find both incoming and outgoing relationships', async () => {
      const mockRows = [
        {
          id: 'rel-1',
          tenant_id: tenantId,
          src_id: 'other-entity',
          dst_id: entityId,
          type: 'INCOMING',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
        {
          id: 'rel-2',
          tenant_id: tenantId,
          src_id: entityId,
          dst_id: 'other-entity-2',
          type: 'OUTGOING',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'both',
      );

      expect(results).toHaveLength(2);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('(src_id = $2 OR dst_id = $2)'),
        [tenantId, entityId],
      );
    });

    it('should default to both directions if not specified', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.findByEntityId(entityId, tenantId);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('(src_id = $2 OR dst_id = $2)'),
        [tenantId, entityId],
      );
    });

    it('should order by created_at DESC', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.findByEntityId(entityId, tenantId);

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });
  });

  describe('search', () => {
    it('should search relationships by tenantId', async () => {
      const mockRows = [
        {
          id: 'rel-1',
          tenant_id: 'tenant-123',
          src_id: 'entity-1',
          dst_id: 'entity-2',
          type: 'KNOWS',
          props: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPgPool.query.mockResolvedValue({ rows: mockRows } as any);

      const results = await relationshipRepo.search({ tenantId: 'tenant-123' });

      expect(results).toHaveLength(1);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        expect.arrayContaining(['tenant-123']),
      );
    });

    it('should filter by type when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        type: 'WORKS_WITH',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $2'),
        expect.arrayContaining(['tenant-123', 'WORKS_WITH']),
      );
    });

    it('should filter by srcId when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        srcId: 'entity-src-456',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND src_id = $2'),
        expect.arrayContaining(['tenant-123', 'entity-src-456']),
      );
    });

    it('should filter by dstId when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        dstId: 'entity-dst-789',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND dst_id = $2'),
        expect.arrayContaining(['tenant-123', 'entity-dst-789']),
      );
    });

    it('should filter by multiple criteria', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        type: 'WORKS_WITH',
        srcId: 'entity-src-456',
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('AND type = $2');
      expect(queryCall[0]).toContain('AND src_id = $3');
      expect(queryCall[1]).toEqual(
        expect.arrayContaining(['tenant-123', 'WORKS_WITH', 'entity-src-456']),
      );
    });

    it('should respect limit and offset', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
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

    it('should cap limit at 1000', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        limit: 5000,
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(1000);
    });
  });

  describe('getEntityRelationshipCount', () => {
    it('should return incoming and outgoing counts', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query.mockResolvedValue({
        rows: [{ incoming: '5', outgoing: '3' }],
      } as any);

      const counts = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(counts.incoming).toBe(5);
      expect(counts.outgoing).toBe(3);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) FILTER'),
        [tenantId, entityId],
      );
    });

    it('should handle zero counts', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query.mockResolvedValue({
        rows: [{ incoming: '0', outgoing: '0' }],
      } as any);

      const counts = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(counts.incoming).toBe(0);
      expect(counts.outgoing).toBe(0);
    });

    it('should handle missing count values', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const counts = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(counts.incoming).toBe(0);
      expect(counts.outgoing).toBe(0);
    });

    it('should use SQL FILTER for counting directions', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query.mockResolvedValue({
        rows: [{ incoming: '2', outgoing: '3' }],
      } as any);

      await relationshipRepo.getEntityRelationshipCount(entityId, tenantId);

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('FILTER (WHERE src_id = $2)');
      expect(queryCall[0]).toContain('FILTER (WHERE dst_id = $2)');
    });
  });
});
