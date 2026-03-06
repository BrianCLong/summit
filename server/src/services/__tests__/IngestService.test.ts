/**
 * IngestService Unit Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { IngestService as IngestServiceType, IngestInput } from '../IngestService.js';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';

// Mock functions declared before mocks
const mockPgConnect = jest.fn();
const mockPgQuery = jest.fn();
const mockPgEnd = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisOn = jest.fn();
const mockRedisQuit = jest.fn();
const mockRedisSubscribe = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database', () => ({
  getPostgresPool: jest.fn(() => ({
    connect: mockPgConnect,
    query: mockPgQuery,
    end: mockPgEnd,
  })),
  getRedisClient: jest.fn(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    on: mockRedisOn,
    quit: mockRedisQuit,
    subscribe: mockRedisSubscribe,
  })),
}));

jest.unstable_mockModule('pg', () => ({
  Pool: jest.fn(),
}));

jest.unstable_mockModule('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: jest.fn(),
  },
}));

jest.unstable_mockModule('../../config/logger', () => ({
  __esModule: true,
  default: {
    child: () => ({
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
    }),
  },
}));

// Dynamic imports AFTER mocks are set up
const { IngestService } = await import('../IngestService.js');

describe('IngestService', () => {
  let ingestService: IngestServiceType;
  let mockPg: jest.Mocked<Pool>;
  let mockNeo4j: jest.Mocked<Driver>;
  let mockClient: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup mock Pool
    mockPg = {
      connect: jest.fn().mockResolvedValue(mockClient),
    } as any;

    // Setup mock Neo4j driver
    mockNeo4j = {
      session: jest.fn(),
    } as any;

    ingestService = new IngestService(mockPg, mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingest', () => {
    it('should successfully ingest entities and relationships and sync to Neo4j using batching', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      (mockNeo4j.session as jest.Mock).mockReturnValue(mockSession);

      const input: IngestInput = {
        tenantId: 'test-tenant',
        sourceType: 's3-csv',
        sourceId: 's3://bucket/data.csv',
        userId: 'user-123',
        entities: [
          {
            externalId: 'person-1',
            kind: 'person',
            labels: ['Person'],
            properties: {
              name: 'Alice Smith',
            },
          },
          {
            externalId: 'org-1',
            kind: 'organization',
            labels: ['Organization'],
            properties: {
              name: 'Tech Corp',
              industry: 'Technology',
            },
          },
        ],
        relationships: [
          {
            fromExternalId: 'person-1',
            toExternalId: 'org-1',
            relationshipType: 'MEMBER_OF',
            confidence: 0.95,
            properties: { role: 'CEO' },
          },
        ],
      };

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'prov-123' }] }) // INSERT provenance
        .mockResolvedValueOnce({ rows: [] }) // Check existing entity
        .mockResolvedValueOnce({ rows: [{ id: 'stable-id-1' }] }) // INSERT entity 1
        .mockResolvedValueOnce({ rows: [] }) // Check existing entity
        .mockResolvedValueOnce({ rows: [{ id: 'stable-id-2' }] }) // INSERT entity 2
        .mockResolvedValueOnce({ rows: [] }) // Check existing relationship
        .mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] }) // INSERT relationship
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'stable-id-1',
              tenant_id: 'test-tenant',
              kind: 'person',
              props: JSON.stringify({ name: 'Alice Smith' }),
              labels: ['Person'],
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              id: 'stable-id-2',
              tenant_id: 'test-tenant',
              kind: 'organization',
              props: JSON.stringify({ name: 'Tech Corp' }),
              labels: ['Organization'],
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }) // SELECT entities for Neo4j sync
        .mockResolvedValueOnce({ rows: [] }) // SELECT entities for Neo4j sync (empty)
        .mockResolvedValueOnce({
          rows: [
            {
              from_entity_id: 'stable-id-1',
              to_entity_id: 'stable-id-2',
              tenant_id: 'test-tenant',
              relationship_type: 'MEMBER_OF',
              props: JSON.stringify({ role: 'CEO' }),
              confidence: 0.95,
              source: 's3-csv',
              first_seen: new Date(),
              last_seen: new Date(),
            },
          ],
        }) // SELECT relationships for Neo4j sync
        .mockResolvedValueOnce({ rows: [] }); // SELECT relationships for Neo4j sync (empty)

      const result = await ingestService.ingest(input);

      expect(result.success).toBe(true);
      expect(result.entitiesCreated).toBe(2);
      expect(result.relationshipsCreated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.provenanceId).toBeTruthy();

      // Verify BEGIN was called
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');

      // Verify COMMIT was called
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // BOLT: Verify batched Neo4j synchronization
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND $batch AS item'),
        expect.objectContaining({
          batch: expect.arrayContaining([
            expect.objectContaining({ id: 'stable-id-1' }),
          ]),
        }),
      );

      // Verify client was released
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should generate stable IDs for duplicate entities', async () => {
      const input: IngestInput = {
        tenantId: 'test-tenant',
        sourceType: 's3-csv',
        sourceId: 's3://bucket/data.csv',
        userId: 'user-123',
        entities: [
          {
            externalId: 'person-1',
            kind: 'person',
            labels: ['Person'],
            properties: {
              name: 'Alice Smith',
              dateOfBirth: '1990-01-01',
              nationality: 'US',
            },
          },
          {
            externalId: 'person-1-duplicate',
            kind: 'person',
            labels: ['Person'],
            properties: {
              name: 'Alice Smith',
              dateOfBirth: '1990-01-01',
              nationality: 'US',
            },
          },
        ],
        relationships: [],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'prov-123' }] }) // Provenance
        .mockResolvedValueOnce({ rows: [] }) // Check entity 1
        .mockResolvedValueOnce({ rows: [{ id: 'stable-1' }] }) // Insert entity 1
        .mockResolvedValueOnce({ rows: [{ id: 'stable-1' }] }) // Check entity 2 (found)
        .mockResolvedValueOnce({ rows: [{ id: 'stable-1' }] }) // Update entity 2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await ingestService.ingest(input);

      expect(result.entitiesCreated).toBe(1);
      expect(result.entitiesUpdated).toBe(1);
    });

    it('should rollback transaction on error', async () => {
      const input: IngestInput = {
        tenantId: 'test-tenant',
        sourceType: 's3-csv',
        sourceId: 's3://bucket/data.csv',
        userId: 'user-123',
        entities: [
          {
            kind: 'person',
            labels: ['Person'],
            properties: { name: 'Alice' },
          },
        ],
        relationships: [],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'prov-123' }] }) // Provenance
        .mockRejectedValueOnce(new Error('Database error')); // Simulate error

      // Service handles errors gracefully and returns a result with success: false
      const result = await ingestService.ingest(input);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Database error'));
    });

    it('should handle missing relationships gracefully', async () => {
      const input: IngestInput = {
        tenantId: 'test-tenant',
        sourceType: 's3-csv',
        sourceId: 's3://bucket/data.csv',
        userId: 'user-123',
        entities: [
          {
            externalId: 'person-1',
            kind: 'person',
            labels: ['Person'],
            properties: { name: 'Alice' },
          },
        ],
        relationships: [
          {
            fromExternalId: 'person-1',
            toExternalId: 'org-MISSING',
            relationshipType: 'MEMBER_OF',
            confidence: 0.95,
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'prov-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'stable-1' }] })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await ingestService.ingest(input);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Entity not found'),
      );
      expect(result.relationshipsCreated).toBe(0);
    });
  });

  describe('generateStableId', () => {
    it('should generate consistent IDs for same natural keys', () => {
      const service = ingestService as any;

      const id1 = service.generateStableId('tenant-1', 'person', {
        name: 'Alice Smith',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
      });

      const id2 = service.generateStableId('tenant-1', 'person', {
        name: 'Alice Smith',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
      });

      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different tenants', () => {
      const service = ingestService as any;

      const id1 = service.generateStableId('tenant-1', 'person', {
        name: 'Alice Smith',
      });

      const id2 = service.generateStableId('tenant-2', 'person', {
        name: 'Alice Smith',
      });

      expect(id1).not.toBe(id2);
    });

    it('should include kind in ID', () => {
      const service = ingestService as any;

      const id = service.generateStableId('tenant-1', 'person', {
        name: 'Alice',
      });

      expect(id).toContain('person');
    });
  });
});
