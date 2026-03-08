"use strict";
/**
 * Context Planner Unit Tests
 *
 * Tests for:
 * - Token budget calculation
 * - Source scoring algorithms
 * - Context selection within budget
 * - Message construction
 * - Edge cases (empty inputs, large contexts)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const context_planner_js_1 = require("../../planner/context-planner.js");
// Mock embedding service
const mockEmbeddingService = {
    embed: globals_1.jest.fn().mockResolvedValue({
        embedding: new Array(1536).fill(0.1),
        tokenCount: 10,
        model: 'test',
        cached: false,
    }),
    embedBatch: globals_1.jest.fn().mockResolvedValue({
        embeddings: [],
        totalTokens: 0,
        cachedCount: 0,
        computedCount: 0,
    }),
    cosineSimilarity: globals_1.jest.fn().mockReturnValue(0.8),
};
(0, globals_1.describe)('ContextPlanner', () => {
    let planner;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        planner = new context_planner_js_1.ContextPlanner({
            maxTokenBudget: 8000,
            minReservedForResponse: 2000,
            embeddingService: mockEmbeddingService,
        });
        // Setup default batch embedding response
        mockEmbeddingService.embedBatch.mockImplementation(async (texts) => ({
            embeddings: texts.map(() => ({
                embedding: new Array(1536).fill(0.1),
                tokenCount: 10,
                model: 'test',
                cached: false,
            })),
            totalTokens: texts.length * 10,
            cachedCount: 0,
            computedCount: texts.length,
        }));
    });
    (0, globals_1.describe)('Token Estimation', () => {
        (0, globals_1.it)('should estimate tokens for simple text', () => {
            const tokens = planner.estimateTokens('Hello, world!');
            (0, globals_1.expect)(tokens).toBeGreaterThan(0);
            (0, globals_1.expect)(typeof tokens).toBe('number');
        });
        (0, globals_1.it)('should estimate higher tokens for longer text', () => {
            const shortTokens = planner.estimateTokens('Hello');
            const longTokens = planner.estimateTokens('Hello world, this is a much longer sentence with more words.');
            (0, globals_1.expect)(longTokens).toBeGreaterThan(shortTokens);
        });
        (0, globals_1.it)('should handle empty string', () => {
            const tokens = planner.estimateTokens('');
            (0, globals_1.expect)(tokens).toBe(0);
        });
        (0, globals_1.it)('should handle special characters', () => {
            const tokens = planner.estimateTokens('こんにちは世界 🌍');
            (0, globals_1.expect)(tokens).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Context Planning', () => {
        const baseTurns = [
            {
                id: 'turn-1',
                role: 'user',
                content: 'What is APT28?',
                tokenCount: 10,
                timestamp: new Date(),
            },
            {
                id: 'turn-2',
                role: 'assistant',
                content: 'APT28, also known as Fancy Bear, is a Russian cyber espionage group.',
                tokenCount: 20,
                timestamp: new Date(),
            },
        ];
        (0, globals_1.it)('should plan context with basic inputs', async () => {
            const result = await planner.planContext({
                query: 'Tell me more about APT28',
                turns: baseTurns,
                systemPrompt: 'You are an intelligence analyst.',
            });
            (0, globals_1.expect)(result.messages).toBeDefined();
            (0, globals_1.expect)(result.plan).toBeDefined();
            (0, globals_1.expect)(result.plan.totalTokens).toBeGreaterThan(0);
            (0, globals_1.expect)(result.plan.budgetRemaining).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should include system prompt in messages', async () => {
            const systemPrompt = 'You are an intelligence analyst assistant.';
            const result = await planner.planContext({
                query: 'Test query',
                turns: [],
                systemPrompt,
            });
            const systemMessage = result.messages.find(m => m.role === 'system');
            (0, globals_1.expect)(systemMessage).toBeDefined();
            (0, globals_1.expect)(systemMessage?.content).toContain('intelligence analyst');
        });
        (0, globals_1.it)('should respect token budget', async () => {
            const result = await planner.planContext({
                query: 'Test',
                turns: baseTurns,
                systemPrompt: 'System prompt',
            });
            // Budget is 8000 - 2000 = 6000 tokens
            (0, globals_1.expect)(result.plan.totalTokens).toBeLessThanOrEqual(6000);
        });
        (0, globals_1.it)('should exclude low-relevance sources', async () => {
            // Mock low relevance
            mockEmbeddingService.cosineSimilarity.mockReturnValue(0.3);
            const result = await planner.planContext({
                query: 'Completely unrelated query',
                turns: baseTurns,
                systemPrompt: 'System',
            });
            // Check excluded sources
            const excludedForRelevance = result.plan.excludedSources.filter(e => e.reason === 'below_relevance_threshold');
            (0, globals_1.expect)(excludedForRelevance.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should include investigation context when provided', async () => {
            const result = await planner.planContext({
                query: 'What connections exist?',
                turns: [],
                systemPrompt: 'System',
                investigation: {
                    id: 'inv-1',
                    name: 'Operation Storm',
                    description: 'Investigation into APT activity',
                    phase: 'analysis',
                },
            });
            const systemMessage = result.messages.find(m => m.role === 'system');
            (0, globals_1.expect)(systemMessage?.content).toContain('Operation Storm');
            (0, globals_1.expect)(systemMessage?.content).toContain('Active Investigation');
        });
        (0, globals_1.it)('should include entity context', async () => {
            const entities = [
                {
                    type: 'threat_actor',
                    value: 'APT28',
                    confidence: 0.95,
                    source: 'test',
                },
                {
                    type: 'malware',
                    value: 'X-Agent',
                    confidence: 0.88,
                    source: 'test',
                },
            ];
            const result = await planner.planContext({
                query: 'What do we know?',
                turns: [],
                systemPrompt: 'System',
                entities,
            });
            const systemMessage = result.messages.find(m => m.role === 'system');
            (0, globals_1.expect)(systemMessage?.content).toContain('APT28');
            (0, globals_1.expect)(systemMessage?.content).toContain('X-Agent');
        });
        (0, globals_1.it)('should include tool documentation', async () => {
            const tools = [
                { name: 'graph_query', description: 'Query the knowledge graph' },
                { name: 'entity_lookup', description: 'Look up entity details' },
            ];
            const result = await planner.planContext({
                query: 'How can I search?',
                turns: [],
                systemPrompt: 'System',
                toolDefinitions: tools,
            });
            const systemMessage = result.messages.find(m => m.role === 'system');
            (0, globals_1.expect)(systemMessage?.content).toContain('graph_query');
            (0, globals_1.expect)(systemMessage?.content).toContain('Available Tools');
        });
    });
    (0, globals_1.describe)('Budget Allocation', () => {
        (0, globals_1.it)('should allocate budget across categories', async () => {
            const result = await planner.planContext({
                query: 'Test',
                turns: [],
                systemPrompt: 'System prompt',
            });
            (0, globals_1.expect)(result.plan.statistics).toBeDefined();
            (0, globals_1.expect)(result.plan.statistics.systemTokens).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should allow custom budget allocation', async () => {
            const result = await planner.planContext({
                query: 'Test',
                turns: [],
                systemPrompt: 'System',
                customBudget: {
                    system: 1000,
                    conversation: 2000,
                    memory: 1000,
                    entity: 500,
                    tools: 500,
                },
            });
            (0, globals_1.expect)(result.plan.statistics.systemTokens).toBeLessThanOrEqual(1000);
        });
    });
    (0, globals_1.describe)('Adaptive Strategies', () => {
        (0, globals_1.it)('should provide investigation strategy', () => {
            const strategy = context_planner_js_1.AdaptiveContextStrategy.investigation();
            (0, globals_1.expect)(strategy.investigation).toBe(1.0);
            (0, globals_1.expect)(strategy.entityContext).toBeGreaterThan(0.8);
        });
        (0, globals_1.it)('should provide Q&A strategy', () => {
            const strategy = context_planner_js_1.AdaptiveContextStrategy.questionAnswering();
            (0, globals_1.expect)(strategy.recentTurns).toBe(1.0);
            (0, globals_1.expect)(strategy.facts).toBeGreaterThan(0.8);
        });
        (0, globals_1.it)('should provide entity exploration strategy', () => {
            const strategy = context_planner_js_1.AdaptiveContextStrategy.entityExploration();
            (0, globals_1.expect)(strategy.entityContext).toBe(1.0);
        });
        (0, globals_1.it)('should provide threat analysis strategy', () => {
            const strategy = context_planner_js_1.AdaptiveContextStrategy.threatAnalysis();
            (0, globals_1.expect)(strategy.facts).toBe(1.0);
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle empty turns array', async () => {
            const result = await planner.planContext({
                query: 'Test',
                turns: [],
                systemPrompt: 'System',
            });
            (0, globals_1.expect)(result.messages.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should handle very long system prompt', async () => {
            const longPrompt = 'System instructions. '.repeat(500);
            const result = await planner.planContext({
                query: 'Test',
                turns: [],
                systemPrompt: longPrompt,
            });
            (0, globals_1.expect)(result.plan.totalTokens).toBeLessThanOrEqual(6000);
        });
        (0, globals_1.it)('should handle many turns', async () => {
            const manyTurns = Array.from({ length: 100 }, (_, i) => ({
                id: `turn-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `This is turn number ${i}`,
                tokenCount: 10,
                timestamp: new Date(Date.now() - i * 1000),
            }));
            const result = await planner.planContext({
                query: 'Summarize our conversation',
                turns: manyTurns,
                systemPrompt: 'System',
            });
            (0, globals_1.expect)(result.plan.totalTokens).toBeLessThanOrEqual(6000);
            // Should have excluded some turns
            (0, globals_1.expect)(result.plan.excludedSources.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should handle empty query', async () => {
            const result = await planner.planContext({
                query: '',
                turns: [],
                systemPrompt: 'System',
            });
            (0, globals_1.expect)(result.messages).toBeDefined();
        });
    });
});
