"use strict";
/**
 * Tests for GraphRetriever
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphRetriever_js_1 = require("../retrieval/GraphRetriever.js");
// Mock Neo4j driver
const mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: globals_1.jest.fn(() => mockSession),
};
(0, globals_1.describe)('GraphRetriever', () => {
    let retriever;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        retriever = new GraphRetriever_js_1.GraphRetriever(mockDriver, {
            maxHops: 3,
            maxNodes: 100,
            minRelevance: 0.3,
        });
    });
    (0, globals_1.describe)('retrieve', () => {
        (0, globals_1.it)('should return empty result when no seed entities found', async () => {
            mockSession.run.mockResolvedValueOnce({ records: [] });
            const result = await retriever.retrieve({
                query: 'test query',
                tenantId: 'tenant-1',
                maxHops: 3,
                maxNodes: 100,
                maxDocuments: 10,
                minRelevance: 0.3,
                includeCitations: true,
                includeGraphPaths: true,
                includeCounterfactuals: false,
            });
            (0, globals_1.expect)(result.evidenceChunks).toHaveLength(0);
            (0, globals_1.expect)(result.subgraph.nodes).toHaveLength(0);
            (0, globals_1.expect)(result.totalNodesTraversed).toBe(0);
        });
        (0, globals_1.it)('should retrieve subgraph from seed entities', async () => {
            // Mock seed entity search
            mockSession.run.mockResolvedValueOnce({
                records: [
                    { get: (key) => (key === 'id' ? 'entity-1' : 0.9) },
                    { get: (key) => (key === 'id' ? 'entity-2' : 0.8) },
                ],
            });
            // Mock subgraph expansion
            mockSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'n') {
                                return {
                                    properties: { id: 'entity-1', name: 'Test Entity' },
                                };
                            }
                            if (key === 'labels')
                                return ['Entity'];
                            return [];
                        },
                    },
                ],
            });
            // Mock GDS projection (may fail, that's ok)
            mockSession.run.mockRejectedValueOnce(new Error('GDS not available'));
            // Mock path extraction
            mockSession.run.mockResolvedValueOnce({ records: [] });
            // Mock document links
            mockSession.run.mockResolvedValueOnce({ records: [] });
            const result = await retriever.retrieve({
                query: 'test query',
                tenantId: 'tenant-1',
                maxHops: 3,
                maxNodes: 100,
                maxDocuments: 10,
                minRelevance: 0.3,
                includeCitations: true,
                includeGraphPaths: true,
                includeCounterfactuals: false,
            });
            (0, globals_1.expect)(result.query).toBe('test query');
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.processingTimeMs).toBeGreaterThanOrEqual(0);
        });
    });
    (0, globals_1.describe)('configuration', () => {
        (0, globals_1.it)('should use default config values', () => {
            const defaultRetriever = new GraphRetriever_js_1.GraphRetriever(mockDriver);
            (0, globals_1.expect)(defaultRetriever).toBeDefined();
        });
        (0, globals_1.it)('should merge provided config with defaults', () => {
            const customRetriever = new GraphRetriever_js_1.GraphRetriever(mockDriver, {
                maxHops: 5,
            });
            (0, globals_1.expect)(customRetriever).toBeDefined();
        });
    });
});
