"use strict";
/**
 * Tests for Entity DataLoader
 */
Object.defineProperty(exports, "__esModule", { value: true });
const entityLoader_js_1 = require("../entityLoader.js");
const globals_1 = require("@jest/globals");
// Mock Neo4j driver
const mockNeo4jSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockNeo4jDriver = {
    session: globals_1.jest.fn(() => mockNeo4jSession),
};
const mockPgPool = {};
(0, globals_1.describe)('EntityLoader', () => {
    let context;
    (0, globals_1.beforeEach)(() => {
        context = {
            neo4jDriver: mockNeo4jDriver,
            pgPool: mockPgPool,
            tenantId: 'test-tenant',
        };
        globals_1.jest.clearAllMocks();
        mockNeo4jDriver.session.mockReturnValue(mockNeo4jSession);
    });
    (0, globals_1.describe)('batch loading', () => {
        (0, globals_1.it)('should batch multiple entity requests into a single query', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            // Mock Neo4j response
            mockNeo4jSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'entity-1',
                                name: 'Entity 1',
                                tenantId: 'test-tenant',
                                createdAt: '2024-01-01',
                                updatedAt: '2024-01-01',
                            },
                            labels: ['Entity', 'Person'],
                        }),
                    },
                    {
                        get: () => ({
                            properties: {
                                id: 'entity-2',
                                name: 'Entity 2',
                                tenantId: 'test-tenant',
                                createdAt: '2024-01-01',
                                updatedAt: '2024-01-01',
                            },
                            labels: ['Entity', 'Organization'],
                        }),
                    },
                ],
            });
            // Request multiple entities simultaneously
            const [entity1, entity2] = await Promise.all([
                loader.load('entity-1'),
                loader.load('entity-2'),
            ]);
            // Should only call Neo4j once with both IDs
            (0, globals_1.expect)(mockNeo4jSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockNeo4jSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('WHERE n.id IN $ids'), globals_1.expect.objectContaining({
                ids: globals_1.expect.arrayContaining(['entity-1', 'entity-2']),
                tenantId: 'test-tenant',
            }));
            // Should return correct entities
            (0, globals_1.expect)(entity1).toMatchObject({
                id: 'entity-1',
                type: 'Person',
            });
            (0, globals_1.expect)(entity2).toMatchObject({
                id: 'entity-2',
                type: 'Organization',
            });
            // Session should be closed
            (0, globals_1.expect)(mockNeo4jSession.close).toHaveBeenCalled();
        });
        (0, globals_1.it)('should cache loaded entities', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            mockNeo4jSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'entity-1',
                                tenantId: 'test-tenant',
                                createdAt: '2024-01-01',
                                updatedAt: '2024-01-01',
                            },
                            labels: ['Entity', 'Person'],
                        }),
                    },
                ],
            });
            // Load same entity twice
            const entity1 = await loader.load('entity-1');
            const entity2 = await loader.load('entity-1');
            // Should only query once due to caching
            (0, globals_1.expect)(mockNeo4jSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(entity1).toBe(entity2);
        });
        (0, globals_1.it)('should return error for entities not found', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            mockNeo4jSession.run.mockResolvedValueOnce({
                records: [], // No entities found
            });
            await (0, globals_1.expect)(loader.load('non-existent')).rejects.toThrow('Entity not found');
        });
        (0, globals_1.it)('should respect maxBatchSize limit', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            // Mock response for multiple batches
            mockNeo4jSession.run.mockImplementation((_query, params) => {
                const ids = params?.ids || [];
                return Promise.resolve({
                    records: ids.map((id) => ({
                        get: () => ({
                            properties: {
                                id,
                                tenantId: 'test-tenant',
                                createdAt: '2024-01-01',
                                updatedAt: '2024-01-01',
                            },
                            labels: ['Entity'],
                        }),
                    })),
                });
            });
            // Request 150 entities (should be split into 2 batches of 100 and 1 batch of 50)
            const promises = Array.from({ length: 150 }, (_, i) => loader.load(`entity-${i}`));
            await Promise.all(promises);
            // Should be called at least twice due to batch size limit
            (0, globals_1.expect)(mockNeo4jSession.run.mock.calls.length).toBeGreaterThanOrEqual(2);
        });
    });
    (0, globals_1.describe)('error handling', () => {
        (0, globals_1.it)('should handle Neo4j errors gracefully', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            mockNeo4jSession.run.mockRejectedValueOnce(new Error('Neo4j error'));
            await (0, globals_1.expect)(loader.load('entity-1')).rejects.toThrow('Neo4j error');
            (0, globals_1.expect)(mockNeo4jSession.close).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('tenant isolation', () => {
        (0, globals_1.it)('should only load entities for the correct tenant', async () => {
            const loader = (0, entityLoader_js_1.createEntityLoader)(context);
            mockNeo4jSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'entity-1',
                                tenantId: 'test-tenant',
                                createdAt: '2024-01-01',
                                updatedAt: '2024-01-01',
                            },
                            labels: ['Entity'],
                        }),
                    },
                ],
            });
            await loader.load('entity-1');
            (0, globals_1.expect)(mockNeo4jSession.run).toHaveBeenCalledWith(globals_1.expect.anything(), globals_1.expect.objectContaining({
                tenantId: 'test-tenant',
            }));
        });
    });
});
