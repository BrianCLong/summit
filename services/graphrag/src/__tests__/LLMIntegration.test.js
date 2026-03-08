"use strict";
/**
 * Tests for LLMIntegration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const LLMIntegration_js_1 = require("../llm/LLMIntegration.js");
// Mock OpenAI
globals_1.jest.mock('openai', () => {
    return {
        default: globals_1.jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: globals_1.jest.fn().mockResolvedValue({
                        choices: [
                            {
                                message: { content: 'Test answer with [1] citation.' },
                                finish_reason: 'stop',
                            },
                        ],
                        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
                    }),
                },
            },
            embeddings: {
                create: globals_1.jest.fn().mockResolvedValue({
                    data: [{ embedding: new Array(1536).fill(0.1) }],
                    usage: { total_tokens: 10 },
                }),
            },
        })),
    };
});
(0, globals_1.describe)('LLMIntegration', () => {
    let llm;
    const config = {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        embeddingModel: 'text-embedding-3-small',
        apiKey: 'test-api-key',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
        costPerInputToken: 0.00001,
        costPerOutputToken: 0.00003,
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        llm = new LLMIntegration_js_1.LLMIntegration(config);
    });
    (0, globals_1.describe)('generateAnswer', () => {
        (0, globals_1.it)('should generate an answer from evidence', async () => {
            const evidenceChunks = [
                {
                    id: 'chunk-1',
                    content: 'Entity A is located in New York.',
                    citations: [
                        {
                            id: 'c1',
                            documentId: 'doc-1',
                            documentTitle: 'Location Report',
                            spanStart: 0,
                            spanEnd: 33,
                            content: 'Entity A is located in New York.',
                            confidence: 0.9,
                            sourceType: 'document',
                        },
                    ],
                    graphPaths: [],
                    relevanceScore: 0.9,
                    tenantId: 'tenant-1',
                },
            ];
            const answer = await llm.generateAnswer('Where is Entity A located?', evidenceChunks);
            (0, globals_1.expect)(answer.id).toBeDefined();
            (0, globals_1.expect)(answer.answer).toBeDefined();
            (0, globals_1.expect)(answer.tokensUsed.total).toBe(150);
            (0, globals_1.expect)(answer.modelUsed).toBe('gpt-4-turbo-preview');
        });
        (0, globals_1.it)('should include reasoning when requested', async () => {
            const answer = await llm.generateAnswer('Test query', [], {
                includeReasoning: true,
            });
            (0, globals_1.expect)(answer).toBeDefined();
        });
    });
    (0, globals_1.describe)('embed', () => {
        (0, globals_1.it)('should generate embeddings for text', async () => {
            const result = await llm.embed('Test text for embedding');
            (0, globals_1.expect)(result.embedding).toHaveLength(1536);
            (0, globals_1.expect)(result.tokensUsed).toBe(10);
            (0, globals_1.expect)(result.cost).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('generateCypher', () => {
        (0, globals_1.it)('should generate Cypher from natural language', async () => {
            const result = await llm.generateCypher('Find all people connected to Entity A', {
                nodeTypes: ['Person', 'Entity'],
                relationshipTypes: ['KNOWS', 'WORKS_WITH'],
                properties: { Person: ['name', 'age'], Entity: ['name', 'type'] },
            });
            (0, globals_1.expect)(result.cypher).toBeDefined();
            (0, globals_1.expect)(result.explanation).toBeDefined();
            (0, globals_1.expect)(result.confidence).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.confidence).toBeLessThanOrEqual(1);
        });
    });
    (0, globals_1.describe)('cost tracking', () => {
        (0, globals_1.it)('should track total cost', async () => {
            llm.resetCostTracking();
            (0, globals_1.expect)(llm.getTotalCost()).toBe(0);
            await llm.embed('Test');
            (0, globals_1.expect)(llm.getTotalCost()).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should reset cost tracking', async () => {
            await llm.embed('Test');
            llm.resetCostTracking();
            (0, globals_1.expect)(llm.getTotalCost()).toBe(0);
        });
    });
    (0, globals_1.describe)('summarize', () => {
        (0, globals_1.it)('should summarize multiple evidence chunks', async () => {
            const chunks = [
                {
                    id: 'chunk-1',
                    content: 'First piece of evidence.',
                    citations: [],
                    graphPaths: [],
                    relevanceScore: 0.9,
                    tenantId: 'tenant-1',
                },
                {
                    id: 'chunk-2',
                    content: 'Second piece of evidence.',
                    citations: [],
                    graphPaths: [],
                    relevanceScore: 0.8,
                    tenantId: 'tenant-1',
                },
            ];
            const summary = await llm.summarize(chunks);
            (0, globals_1.expect)(summary).toBeDefined();
        });
    });
});
