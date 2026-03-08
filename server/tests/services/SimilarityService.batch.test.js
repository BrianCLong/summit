"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Mock typing issues with @jest/globals
const globals_1 = require("@jest/globals");
const SimilarityService_js_1 = require("../../src/services/SimilarityService.js");
const database_js_1 = require("../../src/config/database.js");
const opentelemetry_js_1 = require("../../src/monitoring/opentelemetry.js");
const EmbeddingService_js_1 = __importDefault(require("../../src/services/EmbeddingService.js"));
// Mock dependencies
globals_1.jest.mock('../../src/config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/services/EmbeddingService.js', () => {
    return {
        __esModule: true,
        default: globals_1.jest.fn(),
    };
});
globals_1.jest.mock('../../src/monitoring/opentelemetry.js', () => ({
    __esModule: true,
    otelService: {
        wrapNeo4jOperation: globals_1.jest.fn(),
        addSpanAttributes: globals_1.jest.fn(),
    },
    default: {
        wrapNeo4jOperation: globals_1.jest.fn(),
        addSpanAttributes: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../src/monitoring/metrics.js', () => ({
    vectorQueriesTotal: { labels: () => ({ inc: globals_1.jest.fn() }) },
    vectorQueryDurationSeconds: { startTimer: () => globals_1.jest.fn() },
}));
(0, globals_1.describe)('SimilarityService Batch Optimization', () => {
    let service;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        opentelemetry_js_1.otelService.wrapNeo4jOperation.mockImplementation(((name, fn) => fn()));
        EmbeddingService_js_1.default.mockImplementation(() => ({
            generateEmbedding: globals_1.jest.fn().mockResolvedValue([0.1, 0.2]),
        }));
        mockClient = {
            query: globals_1.jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
            release: globals_1.jest.fn(),
        };
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
        };
        database_js_1.getPostgresPool.mockReturnValue(mockPool);
        service = new SimilarityService_js_1.SimilarityService();
    });
    (0, globals_1.it)('should use optimized batched query for embeddings', async () => {
        // Setup mocks
        // 1. getEntitiesEmbeddings (Batch fetch)
        mockClient.query.mockResolvedValueOnce({
            rows: [
                { entity_id: 'id1', embedding: '[0.1,0.2]' },
                { entity_id: 'id2', embedding: '[0.3,0.4]' }
            ]
        });
        // 2. performVectorSearch for id1
        mockClient.query.mockResolvedValueOnce({ rows: [] });
        // 3. performVectorSearch for id2
        mockClient.query.mockResolvedValueOnce({ rows: [] });
        await service.findSimilarBulk({
            investigationId: 'inv1',
            entityIds: ['id1', 'id2'],
            topK: 5,
            threshold: 0.7,
        });
        // Check expectation: 3 queries (1 batch fetch + 2 searches)
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledTimes(3);
        const calls = mockClient.query.mock.calls;
        // Verify first call is batch fetch
        (0, globals_1.expect)(calls[0][0]).toContain('WHERE entity_id = ANY($1)');
        // Verify params passed to query
        (0, globals_1.expect)(calls[0][1][0]).toEqual(['id1', 'id2']);
    });
});
