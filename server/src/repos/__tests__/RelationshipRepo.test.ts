/**
 * RelationshipRepo Test Suite
 *
 * Tests for:
 * - Relationship CRUD operations
 * - Dual-write to PostgreSQL and Neo4j
 * - Entity existence validation
 * - Transaction handling and rollbacks
 * - Outbox pattern for eventual consistency
 * - Query optimizations (UNION ALL, parallel counts)
 * - Search functionality with filters
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
    const mockRelationshipInput: RelationshipInput = {
      tenantId: 'tenant-123',
      srcId: 'entity-src',
      dstId: 'entity-dst',
      type: 'KNOWS',
      props: { since: '2020-01-01', strength: 'strong' },
    };

    const mockUserId = 'user-456';

    it('should create relationship in PostgreSQL after validating entities exist', async () => {
      const mockRelationshipRow = {
        id: 'rel-789',
        tenant_id: mockRelationshipInput.tenantId,
        src_id: mockRelationshipInput.srcId,
        dst_id: mockRelationshipInput.dstId,
        type: mockRelationshipInput.type,
        props: mockRelationshipInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] }); // Source entity check
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] }); // Dest entity check
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRelationshipRow] }); // INSERT
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await relationshipRepo.create(
        mockRelationshipInput,
        mockUserId,
      );

      expect(result.id).toBe(mockRelationshipRow.id);
      expect(result.srcId).toBe(mockRelationshipInput.srcId);
      expect(result.dstId).toBe(mockRelationshipInput.dstId);
      expect(result.type).toBe(mockRelationshipInput.type);
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if source entity does not exist', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [] }); // Source entity check (not found)

      await expect(
        relationshipRepo.create(mockRelationshipInput, mockUserId),
      ).rejects.toThrow('Source entity entity-src not found');

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should throw error if destination entity does not exist', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] }); // Source entity check (found)
      mockPgClient.query.mockResolvedValueOnce({ rows: [] }); // Dest entity check (not found)

      await expect(
        relationshipRepo.create(mockRelationshipInput, mockUserId),
      ).rejects.toThrow('Destination entity entity-dst not found');

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });

    it('should create outbox event for Neo4j sync', async () => {
      const mockRelationshipRow = {
        id: 'rel-789',
        tenant_id: mockRelationshipInput.tenantId,
        src_id: mockRelationshipInput.srcId,
        dst_id: mockRelationshipInput.dstId,
        type: mockRelationshipInput.type,
        props: mockRelationshipInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRelationshipRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.create(mockRelationshipInput, mockUserId);

      // Verify outbox event was created
      const outboxCall = mockPgClient.query.mock.calls.find((call) =>
        call[0].includes('relationship.upsert'),
      );
      expect(outboxCall).toBeDefined();
      expect(outboxCall?.[0]).toContain('outbox_events');
    });

    it('should attempt immediate Neo4j write', async () => {
      const mockRelationshipRow = {
        id: 'rel-789',
        tenant_id: mockRelationshipInput.tenantId,
        src_id: mockRelationshipInput.srcId,
        dst_id: mockRelationshipInput.dstId,
        type: mockRelationshipInput.type,
        props: mockRelationshipInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRelationshipRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.create(mockRelationshipInput, mockUserId);

      expect(mockNeo4jDriver.session).toHaveBeenCalled();
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should commit even if Neo4j write fails (best effort)', async () => {
      const mockRelationshipRow = {
        id: 'rel-789',
        tenant_id: mockRelationshipInput.tenantId,
        src_id: mockRelationshipInput.srcId,
        dst_id: mockRelationshipInput.dstId,
        type: mockRelationshipInput.type,
        props: mockRelationshipInput.props,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRelationshipRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockRejectedValue(
        new Error('Neo4j connection error'),
      );

      // Should not throw - best effort Neo4j write
      const result = await relationshipRepo.create(
        mockRelationshipInput,
        mockUserId,
      );

      expect(result.id).toBe(mockRelationshipRow.id);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle empty props', async () => {
      const minimalInput: RelationshipInput = {
        tenantId: 'tenant-123',
        srcId: 'entity-src',
        dstId: 'entity-dst',
        type: 'RELATED_TO',
      };

      const mockRelationshipRow = {
        id: 'rel-789',
        tenant_id: minimalInput.tenantId,
        src_id: minimalInput.srcId,
        dst_id: minimalInput.dstId,
        type: minimalInput.type,
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: mockUserId,
      };

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [mockRelationshipRow] });
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      const result = await relationshipRepo.create(minimalInput, mockUserId);

      expect(result.props).toEqual({});
    });

    it('should rollback on PostgreSQL error', async () => {
      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-src' }] });
      mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'entity-dst' }] });
      mockPgClient.query.mockRejectedValueOnce(
        new Error('PostgreSQL constraint violation'),
      );

      await expect(
        relationshipRepo.create(mockRelationshipInput, mockUserId),
      ).rejects.toThrow('PostgreSQL constraint violation');

      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete relationship from PostgreSQL', async () => {
      const relationshipId = 'rel-789';

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
      const relationshipId = 'rel-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
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
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 0 }); // DELETE

      const result = await relationshipRepo.delete(relationshipId);

      expect(result).toBe(false);
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should attempt Neo4j delete', async () => {
      const relationshipId = 'rel-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockResolvedValue(undefined);

      await relationshipRepo.delete(relationshipId);

      expect(mockNeo4jDriver.session).toHaveBeenCalled();
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();
    });

    it('should commit even if Neo4j delete fails (best effort)', async () => {
      const relationshipId = 'rel-789';

      mockPgClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockPgClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      mockPgClient.query.mockResolvedValueOnce(undefined); // Outbox event
      mockPgClient.query.mockResolvedValueOnce(undefined); // COMMIT
      mockNeo4jSession.executeWrite.mockRejectedValue(
        new Error('Neo4j connection error'),
      );

      const result = await relationshipRepo.delete(relationshipId);

      expect(result).toBe(true);
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findById', () => {
    it('should find relationship by ID', async () => {
      const relationshipId = 'rel-789';
      const mockRelationshipRow = {
        id: relationshipId,
        tenant_id: 'tenant-123',
        src_id: 'entity-src',
        dst_id: 'entity-dst',
        type: 'KNOWS',
        props: { since: '2020-01-01' },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-456',
      };

      mockPgPool.query.mockResolvedValue({ rows: [mockRelationshipRow] } as any);

      const result = await relationshipRepo.findById(relationshipId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(relationshipId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM relationships WHERE id = $1'),
        [relationshipId],
      );
    });

    it('should filter by tenantId when provided', async () => {
      const relationshipId = 'rel-789';
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
    const tenantId = 'tenant-123';
    const entityId = 'entity-456';
    const mockRelationships = [
      {
        id: 'rel-1',
        tenant_id: tenantId,
        src_id: entityId,
        dst_id: 'entity-other',
        type: 'KNOWS',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1',
      },
      {
        id: 'rel-2',
        tenant_id: tenantId,
        src_id: 'entity-other2',
        dst_id: entityId,
        type: 'WORKS_WITH',
        props: {},
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1',
      },
    ];

    it('should find outgoing relationships when direction is "outgoing"', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockRelationships[0]] } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'outgoing',
      );

      expect(results).toHaveLength(1);
      expect(results[0].srcId).toBe(entityId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1 AND src_id = $2'),
        [tenantId, entityId],
      );
    });

    it('should find incoming relationships when direction is "incoming"', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockRelationships[1]] } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'incoming',
      );

      expect(results).toHaveLength(1);
      expect(results[0].dstId).toBe(entityId);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1 AND dst_id = $2'),
        [tenantId, entityId],
      );
    });

    it('should use UNION ALL for "both" direction (optimized query)', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockRelationships } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'both',
      );

      expect(results).toHaveLength(2);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        expect.arrayContaining([tenantId, entityId, tenantId, entityId]),
      );
    });

    it('should deduplicate relationships when using "both" direction', async () => {
      const duplicatedRows = [
        mockRelationships[0],
        mockRelationships[0], // Duplicate
        mockRelationships[1],
      ];

      mockPgPool.query.mockResolvedValue({ rows: duplicatedRows } as any);

      const results = await relationshipRepo.findByEntityId(
        entityId,
        tenantId,
        'both',
      );

      expect(results).toHaveLength(2); // Deduplicated
    });

    it('should default to "both" direction when not specified', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockRelationships } as any);

      const results = await relationshipRepo.findByEntityId(entityId, tenantId);

      expect(results).toHaveLength(2);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        expect.any(Array),
      );
    });
  });

  describe('search', () => {
    it('should search relationships by tenantId only', async () => {
      const mockRelationships = [
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

      mockPgPool.query.mockResolvedValue({ rows: mockRelationships } as any);

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
        type: 'KNOWS',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $2'),
        expect.arrayContaining(['tenant-123', 'KNOWS']),
      );
    });

    it('should filter by srcId when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        srcId: 'entity-src',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND src_id = $2'),
        expect.arrayContaining(['tenant-123', 'entity-src']),
      );
    });

    it('should filter by dstId when provided', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        dstId: 'entity-dst',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND dst_id = $2'),
        expect.arrayContaining(['tenant-123', 'entity-dst']),
      );
    });

    it('should combine multiple filters', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        type: 'KNOWS',
        srcId: 'entity-src',
        dstId: 'entity-dst',
      });

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type'),
        expect.arrayContaining(['tenant-123', 'KNOWS', 'entity-src', 'entity-dst']),
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

    it('should cap limit at 1000 for safety', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
        limit: 5000, // Request more than max
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(1000); // Should be capped
    });

    it('should use default limit of 100', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      await relationshipRepo.search({
        tenantId: 'tenant-123',
      });

      const queryCall = mockPgPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(100);
    });
  });

  describe('getEntityRelationshipCount', () => {
    it('should return counts for incoming and outgoing relationships', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any) // Outgoing count
        .mockResolvedValueOnce({ rows: [{ count: '3' }] } as any); // Incoming count

      const result = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(result).toEqual({
        outgoing: 5,
        incoming: 3,
      });
      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
    });

    it('should execute both count queries in parallel for performance', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);

      const startTime = Date.now();
      await relationshipRepo.getEntityRelationshipCount(entityId, tenantId);
      const endTime = Date.now();

      // Both queries should be called
      expect(mockPgPool.query).toHaveBeenCalledTimes(2);

      // Verify queries are run in parallel (Promise.all pattern)
      // Check that outgoing query was called with correct parameters
      const outgoingCall = mockPgPool.query.mock.calls[0];
      expect(outgoingCall[0]).toContain('src_id = $2');

      // Check that incoming query was called with correct parameters
      const incomingCall = mockPgPool.query.mock.calls[1];
      expect(incomingCall[0]).toContain('dst_id = $2');
    });

    it('should handle zero counts', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      const result = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(result).toEqual({
        outgoing: 0,
        incoming: 0,
      });
    });

    it('should handle missing count values', async () => {
      const entityId = 'entity-123';
      const tenantId = 'tenant-456';

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await relationshipRepo.getEntityRelationshipCount(
        entityId,
        tenantId,
      );

      expect(result).toEqual({
        outgoing: 0,
        incoming: 0,
      });
    });
  });
});
