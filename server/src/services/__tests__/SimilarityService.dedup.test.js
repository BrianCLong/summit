"use strict";
/**
 * Unit tests for SimilarityService duplicate detection
 *
 * Tests the modern pgvector-based findDuplicateCandidates implementation
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
// Mock dependencies
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: () => null,
}));
globals_1.jest.unstable_mockModule('../../monitoring/opentelemetry.js', () => ({
    otelService: {
        wrapNeo4jOperation: (_name, fn) => fn(),
        addSpanAttributes: () => { },
    },
}));
globals_1.jest.unstable_mockModule('../../monitoring/metrics.js', () => {
    const counter = {
        labels: () => ({ inc: () => { } }),
        inc: () => { },
        reset: () => { },
        get: () => ({ values: [] }),
    };
    const histogram = {
        startTimer: () => () => { },
        labels: () => ({ observe: () => { } }),
        observe: () => { },
        reset: () => { },
        get: () => ({ values: [] }),
    };
    return {
        applicationErrors: counter,
        vectorQueriesTotal: counter,
        vectorQueryDurationSeconds: histogram,
    };
});
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    logger: {
        child: () => ({
            info: () => { },
            debug: () => { },
            warn: () => { },
            error: () => { },
        }),
        info: () => { },
        debug: () => { },
        warn: () => { },
        error: () => { },
    },
    default: {
        child: () => ({
            info: () => { },
            debug: () => { },
            warn: () => { },
            error: () => { },
        }),
        info: () => { },
        debug: () => { },
        warn: () => { },
        error: () => { },
    },
}));
(0, globals_1.describe)('SimilarityService - Duplicate Detection', () => {
    let SimilarityService;
    let service;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../SimilarityService.js')));
        SimilarityService = module.SimilarityService;
    });
    (0, globals_1.beforeEach)(() => {
        // Reset mocks
        globals_1.jest.clearAllMocks();
        // Create mock client
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        // Create mock pool
        const mockPoolConnect = globals_1.jest.fn();
        mockPoolConnect.mockResolvedValue(mockClient);
        mockPool = {
            connect: mockPoolConnect,
        };
        // Inject mock pool
        service = new SimilarityService();
        service.postgres = mockPool;
    });
    (0, globals_1.describe)('calculateTopologySimilarity', () => {
        (0, globals_1.it)('should calculate Jaccard similarity correctly', () => {
            const service = new SimilarityService();
            const neighbors1 = ['a', 'b', 'c'];
            const neighbors2 = ['b', 'c', 'd'];
            // Intersection: {b, c} = 2 elements
            // Union: {a, b, c, d} = 4 elements
            // Jaccard = 2/4 = 0.5
            const similarity = service.calculateTopologySimilarity(neighbors1, neighbors2);
            (0, globals_1.expect)(similarity).toBe(0.5);
        });
        (0, globals_1.it)('should return 0 for disjoint sets', () => {
            const service = new SimilarityService();
            const neighbors1 = ['a', 'b'];
            const neighbors2 = ['c', 'd'];
            const similarity = service.calculateTopologySimilarity(neighbors1, neighbors2);
            (0, globals_1.expect)(similarity).toBe(0);
        });
        (0, globals_1.it)('should return 1 for identical sets', () => {
            const service = new SimilarityService();
            const neighbors1 = ['a', 'b', 'c'];
            const neighbors2 = ['a', 'b', 'c'];
            const similarity = service.calculateTopologySimilarity(neighbors1, neighbors2);
            (0, globals_1.expect)(similarity).toBe(1);
        });
        (0, globals_1.it)('should handle empty arrays', () => {
            const service = new SimilarityService();
            const similarity = service.calculateTopologySimilarity([], []);
            (0, globals_1.expect)(similarity).toBe(0);
        });
    });
    (0, globals_1.describe)('calculateProvenanceSimilarity', () => {
        (0, globals_1.it)('should return 1 for matching sources', () => {
            const service = new SimilarityService();
            const similarity = service.calculateProvenanceSimilarity('source-a', 'source-a');
            (0, globals_1.expect)(similarity).toBe(1);
        });
        (0, globals_1.it)('should return 0 for different sources', () => {
            const service = new SimilarityService();
            const similarity = service.calculateProvenanceSimilarity('source-a', 'source-b');
            (0, globals_1.expect)(similarity).toBe(0);
        });
        (0, globals_1.it)('should return 0 for undefined sources', () => {
            const service = new SimilarityService();
            const similarity = service.calculateProvenanceSimilarity(undefined, 'source-a');
            (0, globals_1.expect)(similarity).toBe(0);
        });
    });
    (0, globals_1.describe)('findDuplicateCandidates', () => {
        (0, globals_1.it)('should find duplicate candidates with hybrid scoring', async () => {
            // Mock entity embeddings query
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        entity_id: 'entity-1',
                        embedding: '[0.1, 0.2, 0.3]',
                        text: 'John Smith',
                        metadata: {
                            neighbor_ids: ['n1', 'n2'],
                            source_system: 'source-a',
                        },
                    },
                    {
                        entity_id: 'entity-2',
                        embedding: '[0.15, 0.22, 0.31]',
                        text: 'John Smith Jr',
                        metadata: {
                            neighbor_ids: ['n2', 'n3'],
                            source_system: 'source-a',
                        },
                    },
                ],
            });
            // Mock vector search results
            mockClient.query
                .mockResolvedValueOnce({
                // Search for entity-1
                rows: [
                    {
                        entity_id: 'entity-2',
                        similarity: 0.9, // High semantic similarity
                    },
                ],
            })
                .mockResolvedValueOnce({
                // Search for entity-2
                rows: [
                    {
                        entity_id: 'entity-1',
                        similarity: 0.9,
                    },
                ],
            });
            // Mock telemetry
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            const mockAddSpanAttributes = globals_1.jest.fn();
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: mockAddSpanAttributes,
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-123',
                threshold: 0.7,
                topK: 5,
            });
            (0, globals_1.expect)(candidates).toHaveLength(1);
            (0, globals_1.expect)(candidates[0]).toMatchObject({
                entityA: {
                    id: globals_1.expect.any(String),
                    label: globals_1.expect.any(String),
                },
                entityB: {
                    id: globals_1.expect.any(String),
                    label: globals_1.expect.any(String),
                },
                similarity: globals_1.expect.any(Number),
                scores: {
                    semantic: globals_1.expect.any(Number),
                    topology: globals_1.expect.any(Number),
                    provenance: globals_1.expect.any(Number),
                },
            });
            // Verify hybrid scoring:
            // Semantic: 0.9, Topology: 1/3 ≈ 0.33 (1 common neighbor out of 3 total)
            // Provenance: 1.0 (same source)
            // Overall: 0.9 * 0.6 + 0.33 * 0.3 + 1.0 * 0.1 = 0.54 + 0.1 + 0.1 = 0.74
            (0, globals_1.expect)(candidates[0].similarity).toBeGreaterThanOrEqual(0.7);
            (0, globals_1.expect)(candidates[0].scores.semantic).toBe(0.9);
            (0, globals_1.expect)(candidates[0].scores.provenance).toBe(1);
        });
        (0, globals_1.it)('should filter out pairs below threshold', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        entity_id: 'entity-1',
                        embedding: '[0.1, 0.2, 0.3]',
                        text: 'John Smith',
                        metadata: { neighbor_ids: [], source_system: 'source-a' },
                    },
                    {
                        entity_id: 'entity-2',
                        embedding: '[0.9, 0.8, 0.7]',
                        text: 'Jane Doe',
                        metadata: { neighbor_ids: [], source_system: 'source-b' },
                    },
                ],
            });
            // Low similarity - should be filtered out
            mockClient.query
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-2', similarity: 0.3 }],
            })
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-1', similarity: 0.3 }],
            });
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: globals_1.jest.fn(),
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-123',
                threshold: 0.8, // High threshold
                topK: 5,
            });
            // Should be empty because overall similarity is:
            // 0.3 * 0.6 + 0 * 0.3 + 0 * 0.1 = 0.18 < 0.8
            (0, globals_1.expect)(candidates).toHaveLength(0);
        });
        (0, globals_1.it)('should avoid duplicate pairs (symmetric handling)', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        entity_id: 'entity-1',
                        embedding: '[0.1, 0.2, 0.3]',
                        text: 'Test',
                        metadata: { neighbor_ids: ['n1'], source_system: 'src' },
                    },
                    {
                        entity_id: 'entity-2',
                        embedding: '[0.1, 0.2, 0.3]',
                        text: 'Test',
                        metadata: { neighbor_ids: ['n1'], source_system: 'src' },
                    },
                ],
            });
            // Both entities find each other
            mockClient.query
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-2', similarity: 0.95 }],
            })
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-1', similarity: 0.95 }],
            });
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: globals_1.jest.fn(),
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-123',
                threshold: 0.7,
                topK: 5,
            });
            // Should only have ONE pair, not two (no duplicates)
            (0, globals_1.expect)(candidates).toHaveLength(1);
        });
        (0, globals_1.it)('should return empty array when no entities found', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [],
            });
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: globals_1.jest.fn(),
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-empty',
                threshold: 0.7,
            });
            (0, globals_1.expect)(candidates).toEqual([]);
        });
        (0, globals_1.it)('should include reasons when requested', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        entity_id: 'entity-1',
                        embedding: '[0.1, 0.2]',
                        text: 'Test',
                        metadata: { neighbor_ids: ['n1'], source_system: 'src' },
                    },
                    {
                        entity_id: 'entity-2',
                        embedding: '[0.1, 0.2]',
                        text: 'Test',
                        metadata: { neighbor_ids: ['n1'], source_system: 'src' },
                    },
                ],
            });
            mockClient.query
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-2', similarity: 0.85 }],
            })
                .mockResolvedValueOnce({
                rows: [{ entity_id: 'entity-1', similarity: 0.85 }],
            });
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: globals_1.jest.fn(),
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-123',
                threshold: 0.7,
                includeReasons: true,
            });
            (0, globals_1.expect)(candidates).toHaveLength(1);
            (0, globals_1.expect)(candidates[0].reasons).toBeDefined();
            (0, globals_1.expect)(candidates[0].reasons).toContain('High semantic similarity');
            (0, globals_1.expect)(candidates[0].reasons).toContain('Same source');
        });
        (0, globals_1.it)('should sort candidates by similarity descending', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        entity_id: 'entity-1',
                        embedding: '[0.1]',
                        text: 'Test',
                        metadata: { neighbor_ids: [], source_system: 'src' },
                    },
                    {
                        entity_id: 'entity-2',
                        embedding: '[0.2]',
                        text: 'Test',
                        metadata: { neighbor_ids: [], source_system: 'src' },
                    },
                    {
                        entity_id: 'entity-3',
                        embedding: '[0.3]',
                        text: 'Test',
                        metadata: { neighbor_ids: [], source_system: 'src' },
                    },
                ],
            });
            // entity-1 finds entity-2 (0.75) and entity-3 (0.9)
            mockClient.query
                .mockResolvedValueOnce({
                rows: [
                    { entity_id: 'entity-2', similarity: 0.75 },
                    { entity_id: 'entity-3', similarity: 0.9 },
                ],
            })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });
            const mockWrapNeo4jOperation = globals_1.jest.fn((name, fn) => fn());
            service.otelService = {
                wrapNeo4jOperation: mockWrapNeo4jOperation,
                addSpanAttributes: globals_1.jest.fn(),
            };
            const candidates = await service.findDuplicateCandidates({
                investigationId: 'inv-123',
                threshold: 0.5,
            });
            (0, globals_1.expect)(candidates.length).toBeGreaterThan(0);
            // Should be sorted by similarity descending
            for (let i = 1; i < candidates.length; i++) {
                (0, globals_1.expect)(candidates[i - 1].similarity).toBeGreaterThanOrEqual(candidates[i].similarity);
            }
        });
    });
});
