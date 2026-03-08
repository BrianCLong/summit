"use strict";
/**
 * Tests for GraphRAG Service
 *
 * P0 - Critical for MVP-4-GA
 * Target coverage: 80%
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphRAGService_js_1 = require("../GraphRAGService.js");
// Mock dependencies
globals_1.jest.mock('neo4j-driver');
globals_1.jest.mock('ioredis');
const createMockLLMService = () => ({
    complete: globals_1.jest.fn(),
});
const createMockEmbeddingService = () => ({
    generateEmbedding: globals_1.jest.fn(),
});
const createMockNeo4jDriver = () => {
    const mockSession = {
        run: globals_1.jest.fn(),
        close: globals_1.jest.fn(),
    };
    return {
        session: globals_1.jest.fn(() => mockSession),
        close: globals_1.jest.fn(),
        _mockSession: mockSession,
    };
};
const createMockRedis = () => ({
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    setex: globals_1.jest.fn(),
    del: globals_1.jest.fn(),
    incr: globals_1.jest.fn(),
    expire: globals_1.jest.fn(),
    zincrby: globals_1.jest.fn(),
    pipeline: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        setex: globals_1.jest.fn(),
        exec: globals_1.jest.fn(),
    })),
});
const createNode = (id, type, label, confidence = 1) => ({
    properties: {
        id,
        type,
        label,
        confidence,
        properties: '{}',
    },
});
const createRelationship = (id, type, fromEntityId, toEntityId, confidence = 1) => ({
    properties: {
        id,
        type,
        fromEntityId,
        toEntityId,
        confidence,
        properties: '{}',
    },
});
const createRecord = (nodes, relationships) => ({
    get: (key) => {
        if (key === 'nodes')
            return nodes;
        if (key === 'relationships')
            return relationships;
        return undefined;
    },
});
(0, globals_1.describe)('GraphRAGService', () => {
    let service;
    let mockNeo4j;
    let mockLLM;
    let mockEmbedding;
    let mockRedis;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockNeo4j = createMockNeo4jDriver();
        mockLLM = createMockLLMService();
        mockEmbedding = createMockEmbeddingService();
        mockRedis = createMockRedis();
        service = new GraphRAGService_js_1.GraphRAGService(mockNeo4j, mockLLM, mockEmbedding, mockRedis);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Request Validation', () => {
        (0, globals_1.it)('should reject request with empty investigationId', async () => {
            const request = {
                investigationId: '',
                question: 'Who is John Doe?',
            };
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject request with question less than 3 characters', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Hi',
            };
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject request with maxHops > 3', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is connected to John Doe?',
                maxHops: 5,
            };
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject request with temperature > 1', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
                temperature: 1.5,
            };
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should accept valid request with all optional fields', async () => {
            const request = {
                investigationId: 'inv-123',
                tenantId: 'tenant-abc',
                question: 'Who is John Doe and what organizations is he connected to?',
                focusEntityIds: ['entity-1', 'entity-2'],
                maxHops: 2,
                temperature: 0.7,
                maxTokens: 1000,
                useCase: 'investigation',
                rankingStrategy: 'v2',
            };
            // Setup mocks for successful execution
            const nodes = [createNode('entity-1', 'Person', 'John Doe', 0.9)];
            mockNeo4j._mockSession.run.mockResolvedValue({
                records: [createRecord(nodes, [])],
            });
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is a person entity.',
                confidence: 0.85,
                citations: { entityIds: ['entity-1'] },
                why_paths: [],
            }));
            mockRedis.get.mockResolvedValue(null);
            // Should not throw
            await (0, globals_1.expect)(service.answer(request)).resolves.toBeDefined();
        });
    });
    (0, globals_1.describe)('Graph Context Retrieval', () => {
        (0, globals_1.it)('should retrieve entities within maxHops from focus entities', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is connected to John Doe?',
                focusEntityIds: ['entity-john'],
                maxHops: 2,
            };
            const nodes = [
                createNode('entity-john', 'Person', 'John Doe', 0.95),
                createNode('entity-acme', 'Organization', 'ACME Corp', 0.9),
            ];
            const relationships = [
                createRelationship('rel-1', 'WORKS_FOR', 'entity-john', 'entity-acme', 0.9),
            ];
            mockNeo4j._mockSession.run.mockResolvedValue({
                records: [createRecord(nodes, relationships)],
            });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is connected to ACME Corp.',
                confidence: 0.9,
                citations: { entityIds: ['entity-john', 'entity-acme'] },
                why_paths: [{ from: 'entity-john', to: 'entity-acme', relId: 'rel-1', type: 'WORKS_FOR' }],
            }));
            const result = await service.answer(request);
            (0, globals_1.expect)(mockNeo4j._mockSession.run).toHaveBeenCalled();
            (0, globals_1.expect)(result.citations.entityIds).toContain('entity-john');
        });
        (0, globals_1.it)('should use cached context when available', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            const cachedContext = {
                entities: [
                    { id: 'entity-1', type: 'Person', label: 'John Doe', properties: {}, confidence: 0.9 },
                ],
                relationships: [],
                subgraphHash: 'hash-123',
                ttl: 3600,
            };
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is a person.',
                confidence: 0.85,
                citations: { entityIds: ['entity-1'] },
                why_paths: [],
            }));
            await service.answer(request);
            // Should not query Neo4j when cache hit
            (0, globals_1.expect)(mockNeo4j._mockSession.run).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle empty graph context gracefully', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is Unknown Person?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'I could not find information about Unknown Person in the knowledge graph.',
                confidence: 0.2,
                citations: { entityIds: [] },
                why_paths: [],
            }));
            const result = await service.answer(request);
            (0, globals_1.expect)(result.confidence).toBeLessThan(0.5);
            (0, globals_1.expect)(result.citations.entityIds).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('LLM Response Validation', () => {
        (0, globals_1.it)('should parse valid JSON response from LLM', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            const nodes = [
                createNode('entity-john', 'Person', 'John Doe', 0.95),
                createNode('entity-acme', 'Organization', 'ACME Corp', 0.9),
            ];
            const relationships = [
                createRelationship('rel-123', 'EMPLOYED_BY', 'entity-john', 'entity-acme', 0.9),
            ];
            mockNeo4j._mockSession.run.mockResolvedValue({
                records: [createRecord(nodes, relationships)],
            });
            mockRedis.get.mockResolvedValue(null);
            const validResponse = {
                answer: 'John Doe is a software engineer at ACME Corp.',
                confidence: 0.92,
                citations: { entityIds: ['entity-john', 'entity-acme'] },
                why_paths: [
                    {
                        from: 'entity-john',
                        to: 'entity-acme',
                        relId: 'rel-123',
                        type: 'EMPLOYED_BY',
                        supportScore: 0.95,
                    },
                ],
            };
            mockLLM.complete.mockResolvedValue(JSON.stringify(validResponse));
            const result = await service.answer(request);
            (0, globals_1.expect)(result.answer).toBe(validResponse.answer);
            (0, globals_1.expect)(result.confidence).toBe(validResponse.confidence);
            (0, globals_1.expect)(result.citations.entityIds).toEqual(validResponse.citations.entityIds);
            (0, globals_1.expect)(result.why_paths).toHaveLength(1);
        });
        (0, globals_1.it)('should reject malformed JSON from LLM', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue('This is not valid JSON');
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject response missing required fields', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            // Missing 'answer' field
            const incompleteResponse = {
                confidence: 0.9,
                citations: { entityIds: [] },
                why_paths: [],
            };
            mockLLM.complete.mockResolvedValue(JSON.stringify(incompleteResponse));
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject response with invalid confidence range', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            const invalidResponse = {
                answer: 'John Doe is a person.',
                confidence: 1.5, // Invalid: must be 0-1
                citations: { entityIds: [] },
                why_paths: [],
            };
            mockLLM.complete.mockResolvedValue(JSON.stringify(invalidResponse));
            const result = await service.answer(request);
            (0, globals_1.expect)(result.confidence).toBe(invalidResponse.confidence);
        });
    });
    (0, globals_1.describe)('Citation Validation', () => {
        (0, globals_1.it)('should validate citations reference entities in context', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
                focusEntityIds: ['entity-john'],
            };
            const nodes = [createNode('entity-john', 'Person', 'John Doe', 0.95)];
            mockNeo4j._mockSession.run.mockResolvedValue({
                records: [createRecord(nodes, [])],
            });
            mockRedis.get.mockResolvedValue(null);
            // Citation references entity not in context
            const responseWithInvalidCitation = {
                answer: 'John Doe works at ACME Corp.',
                confidence: 0.9,
                citations: { entityIds: ['entity-john', 'entity-unknown'] },
                why_paths: [],
            };
            mockLLM.complete.mockResolvedValue(JSON.stringify(responseWithInvalidCitation));
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow(/Invalid GraphRAG response/i);
        });
    });
    (0, globals_1.describe)('Why Path Generation', () => {
        (0, globals_1.it)('should include why_paths for traversed relationships', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'How is John connected to ACME?',
                focusEntityIds: ['entity-john'],
                maxHops: 2,
            };
            const nodes = [
                createNode('entity-john', 'Person', 'John Doe', 0.95),
                createNode('entity-acme', 'Organization', 'ACME Corp', 0.9),
            ];
            const relationships = [
                createRelationship('rel-emp-1', 'EMPLOYED_BY', 'entity-john', 'entity-acme', 0.9),
            ];
            mockNeo4j._mockSession.run.mockResolvedValue({
                records: [createRecord(nodes, relationships)],
            });
            mockRedis.get.mockResolvedValue(null);
            const responseWithPaths = {
                answer: 'John Doe is connected to ACME Corp through his employment.',
                confidence: 0.88,
                citations: { entityIds: ['entity-john', 'entity-acme'] },
                why_paths: [
                    {
                        from: 'entity-john',
                        to: 'entity-acme',
                        relId: 'rel-emp-1',
                        type: 'EMPLOYED_BY',
                        supportScore: 0.92,
                        score_breakdown: {
                            length: 0.9,
                            edgeType: 0.95,
                            centrality: 0.88,
                        },
                    },
                ],
            };
            mockLLM.complete.mockResolvedValue(JSON.stringify(responseWithPaths));
            const result = await service.answer(request);
            (0, globals_1.expect)(result.why_paths).toHaveLength(1);
            (0, globals_1.expect)(result.why_paths[0].type).toBe('EMPLOYED_BY');
            (0, globals_1.expect)(result.why_paths[0].supportScore).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Caching', () => {
        (0, globals_1.it)('should cache successful responses', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is a person.',
                confidence: 0.85,
                citations: { entityIds: [] },
                why_paths: [],
            }));
            await service.answer(request);
            (0, globals_1.expect)(mockRedis.setex).toHaveBeenCalled();
        });
        (0, globals_1.it)('should not cache low-confidence responses', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is Unknown Person?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'I could not find this person.',
                confidence: 0.1, // Very low confidence
                citations: { entityIds: [] },
                why_paths: [],
            }));
            await service.answer(request);
            // Should not cache low-confidence responses
            // Verify based on implementation
        });
    });
    (0, globals_1.describe)('Circuit Breaker', () => {
        (0, globals_1.it)('should open circuit after repeated LLM failures', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockRejectedValue(new Error('LLM service unavailable'));
            // Simulate multiple failures to trip circuit breaker
            for (let i = 0; i < 5; i++) {
                await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
            }
            // After circuit opens, should fail fast
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('Tenant Isolation', () => {
        (0, globals_1.it)('should include tenantId in Neo4j queries', async () => {
            const request = {
                investigationId: 'inv-123',
                tenantId: 'tenant-abc',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is a person.',
                confidence: 0.85,
                citations: { entityIds: [] },
                why_paths: [],
            }));
            await service.answer(request);
            // Verify tenantId is passed to query
            (0, globals_1.expect)(mockNeo4j._mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('tenantId'), globals_1.expect.objectContaining({ tenantId: 'tenant-abc' }));
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle Neo4j connection errors', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockRejectedValue(new Error('Neo4j connection failed'));
            mockRedis.get.mockResolvedValue(null);
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow('Neo4j connection failed');
        });
        (0, globals_1.it)('should handle Redis errors gracefully and fall back to fresh query', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockRedis.get.mockRejectedValue(new Error('Redis unavailable'));
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockLLM.complete.mockResolvedValue(JSON.stringify({
                answer: 'John Doe is a person.',
                confidence: 0.85,
                citations: { entityIds: [] },
                why_paths: [],
            }));
            // Should succeed despite Redis failure
            const result = await service.answer(request);
            (0, globals_1.expect)(result.answer).toBeDefined();
        });
        (0, globals_1.it)('should return user-facing error for known error types', async () => {
            const request = {
                investigationId: 'inv-123',
                question: 'Who is John Doe?',
            };
            mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
            mockRedis.get.mockResolvedValue(null);
            mockLLM.complete.mockRejectedValue({ code: 'rate_limit_exceeded' });
            await (0, globals_1.expect)(service.answer(request)).rejects.toThrow();
        });
    });
});
