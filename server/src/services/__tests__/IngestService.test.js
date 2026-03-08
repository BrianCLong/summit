"use strict";
/**
 * IngestService Unit Tests
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock functions declared before mocks
const mockPgConnect = globals_1.jest.fn();
const mockPgQuery = globals_1.jest.fn();
const mockPgEnd = globals_1.jest.fn();
const mockRedisGet = globals_1.jest.fn();
const mockRedisSet = globals_1.jest.fn();
const mockRedisOn = globals_1.jest.fn();
const mockRedisQuit = globals_1.jest.fn();
const mockRedisSubscribe = globals_1.jest.fn();
const mockLoggerInfo = globals_1.jest.fn();
const mockLoggerWarn = globals_1.jest.fn();
const mockLoggerError = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: mockPgConnect,
        query: mockPgQuery,
        end: mockPgEnd,
    })),
    getRedisClient: globals_1.jest.fn(() => ({
        get: mockRedisGet,
        set: mockRedisSet,
        on: mockRedisOn,
        quit: mockRedisQuit,
        subscribe: mockRedisSubscribe,
    })),
}));
globals_1.jest.unstable_mockModule('pg', () => ({
    Pool: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('neo4j-driver', () => ({
    __esModule: true,
    default: {
        driver: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../../config/logger', () => ({
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
const { IngestService } = await Promise.resolve().then(() => __importStar(require('../IngestService.js')));
(0, globals_1.describe)('IngestService', () => {
    let ingestService;
    let mockPg;
    let mockNeo4j;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        // Setup mock client
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        // Setup mock Pool
        mockPg = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
        };
        // Setup mock Neo4j driver
        mockNeo4j = {
            session: globals_1.jest.fn(),
        };
        ingestService = new IngestService(mockPg, mockNeo4j);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('ingest', () => {
        (0, globals_1.it)('should successfully ingest entities and relationships and sync to Neo4j using batching', async () => {
            const mockSession = {
                run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
                close: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            mockNeo4j.session.mockReturnValue(mockSession);
            const input = {
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.entitiesCreated).toBe(2);
            (0, globals_1.expect)(result.relationshipsCreated).toBe(1);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
            (0, globals_1.expect)(result.provenanceId).toBeTruthy();
            // Verify BEGIN was called
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            // Verify COMMIT was called
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
            // BOLT: Verify batched Neo4j synchronization
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('UNWIND $batch AS item'), globals_1.expect.objectContaining({
                batch: globals_1.expect.arrayContaining([
                    globals_1.expect.objectContaining({ id: 'stable-id-1' }),
                ]),
            }));
            // Verify client was released
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        });
        (0, globals_1.it)('should generate stable IDs for duplicate entities', async () => {
            const input = {
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
            (0, globals_1.expect)(result.entitiesCreated).toBe(1);
            (0, globals_1.expect)(result.entitiesUpdated).toBe(1);
        });
        (0, globals_1.it)('should rollback transaction on error', async () => {
            const input = {
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
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors).toContainEqual(globals_1.expect.stringContaining('Database error'));
        });
        (0, globals_1.it)('should handle missing relationships gracefully', async () => {
            const input = {
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
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors).toContainEqual(globals_1.expect.stringContaining('Entity not found'));
            (0, globals_1.expect)(result.relationshipsCreated).toBe(0);
        });
    });
    (0, globals_1.describe)('generateStableId', () => {
        (0, globals_1.it)('should generate consistent IDs for same natural keys', () => {
            const service = ingestService;
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
            (0, globals_1.expect)(id1).toBe(id2);
        });
        (0, globals_1.it)('should generate different IDs for different tenants', () => {
            const service = ingestService;
            const id1 = service.generateStableId('tenant-1', 'person', {
                name: 'Alice Smith',
            });
            const id2 = service.generateStableId('tenant-2', 'person', {
                name: 'Alice Smith',
            });
            (0, globals_1.expect)(id1).not.toBe(id2);
        });
        (0, globals_1.it)('should include kind in ID', () => {
            const service = ingestService;
            const id = service.generateStableId('tenant-1', 'person', {
                name: 'Alice',
            });
            (0, globals_1.expect)(id).toContain('person');
        });
    });
});
