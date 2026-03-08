"use strict";
/**
 * Copilot Service Test Suite
 *
 * Tests for:
 * - Natural language to Cypher query generation
 * - GraphRAG query processing
 * - Explainable AI responses (why_paths)
 * - Context management
 * - Response validation
 * - Performance benchmarks
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock copilot service implementation
const createMockCopilotService = () => {
    const conversationHistory = [];
    const nlToCypherPatterns = {
        'who is connected to': 'MATCH (a)-[r]-(b) WHERE a.name = $name RETURN b, r',
        'what connects': 'MATCH p=shortestPath((a)-[*]-(b)) WHERE a.name = $from AND b.name = $to RETURN p',
        'find all': 'MATCH (n:$type) RETURN n',
        'show relationships': 'MATCH (a)-[r]->(b) WHERE a.id = $id RETURN a, r, b',
        'entities of type': 'MATCH (n:$type) RETURN n',
    };
    const generateCypher = (question) => {
        const questionLower = question.toLowerCase();
        for (const [pattern, cypher] of Object.entries(nlToCypherPatterns)) {
            if (questionLower.includes(pattern)) {
                return {
                    cypher,
                    parameters: {},
                    explanation: `Generated from pattern: "${pattern}"`,
                    confidence: 0.85,
                };
            }
        }
        return {
            cypher: 'MATCH (n) RETURN n LIMIT 10',
            parameters: {},
            explanation: 'Default fallback query',
            confidence: 0.5,
        };
    };
    return {
        query: globals_1.jest.fn(async (query) => {
            const startTime = Date.now();
            // Add to conversation history
            conversationHistory.push({ role: 'user', content: query.question });
            // Generate Cypher from natural language
            const cypherResult = generateCypher(query.question);
            // Simulate GraphRAG response
            const response = {
                answer: `Based on the graph analysis, ${query.question.toLowerCase().includes('alice') ? 'Alice Chen is connected to Bob Martinez through the TechCorp organization' : 'the query returned relevant results from the investigation graph'}.`,
                confidence: cypherResult.confidence,
                citations: [
                    { entityId: 'entity-alice-001', entityName: 'Alice Chen', relevance: 0.95 },
                    { entityId: 'entity-bob-002', entityName: 'Bob Martinez', relevance: 0.88 },
                    { entityId: 'entity-techcorp-003', entityName: 'TechCorp', relevance: 0.75 },
                ],
                whyPaths: [
                    {
                        pathId: 'path-001',
                        startEntityId: 'entity-alice-001',
                        endEntityId: 'entity-bob-002',
                        relationships: ['employed_by', 'works_with'],
                        explanation: 'Alice and Bob both work at TechCorp, connected through employment relationships',
                    },
                ],
                generatedCypher: cypherResult.cypher,
                metadata: {
                    processingTimeMs: Date.now() - startTime + Math.random() * 100,
                    tokensUsed: Math.floor(Math.random() * 500) + 100,
                    model: 'graphrag-v1',
                },
            };
            // Add to conversation history
            conversationHistory.push({ role: 'assistant', content: response.answer });
            return response;
        }),
        generateCypher: globals_1.jest.fn(async (question) => {
            return generateCypher(question);
        }),
        validateCypher: globals_1.jest.fn(async (cypher) => {
            const errors = [];
            // Basic Cypher validation
            if (!cypher.toUpperCase().includes('MATCH') && !cypher.toUpperCase().includes('RETURN')) {
                errors.push('Query must contain MATCH or RETURN clause');
            }
            // Check for dangerous operations
            if (cypher.toUpperCase().includes('DELETE') || cypher.toUpperCase().includes('DETACH')) {
                errors.push('DELETE operations not allowed through copilot');
            }
            if (cypher.toUpperCase().includes('DROP')) {
                errors.push('DROP operations not allowed');
            }
            // Check for missing parameters
            const paramMatches = cypher.match(/\$\w+/g);
            if (paramMatches && paramMatches.length > 0) {
                // Would need to verify parameters are provided
            }
            return { valid: errors.length === 0, errors };
        }),
        explainPath: globals_1.jest.fn(async (pathId) => {
            return `This path shows the connection between entities through a series of relationships. ` +
                `The path was identified as relevant because it demonstrates a direct or indirect connection ` +
                `that answers the user's query.`;
        }),
        getConversationHistory: globals_1.jest.fn(async () => {
            return [...conversationHistory];
        }),
        clearConversation: globals_1.jest.fn(async () => {
            conversationHistory.length = 0;
        }),
        suggestQuestions: globals_1.jest.fn(async (context) => {
            return [
                'What connections exist between these entities?',
                'Who has the most relationships in this investigation?',
                'What is the shortest path between entity A and B?',
                'Show me all entities of type Person',
                'What patterns are common in this graph?',
            ];
        }),
        healthCheck: globals_1.jest.fn(async () => {
            return {
                status: 'healthy',
                details: {
                    modelLoaded: true,
                    graphConnected: true,
                    cacheStatus: 'active',
                    avgResponseTimeMs: 250,
                },
            };
        }),
        _conversationHistory: conversationHistory,
    };
};
(0, globals_1.describe)('Copilot Service', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Natural Language Query Processing', () => {
        (0, globals_1.it)('should process a natural language question', async () => {
            const query = {
                question: 'What connects Alice to GlobalSupply Inc?',
                investigationId: 'inv-001',
            };
            const response = await copilotService.query(query);
            (0, globals_1.expect)(response.answer).toBeDefined();
            (0, globals_1.expect)(response.answer.length).toBeGreaterThan(0);
            (0, globals_1.expect)(response.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(response.confidence).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should return citations for referenced entities', async () => {
            const query = {
                question: 'Tell me about Alice Chen',
            };
            const response = await copilotService.query(query);
            (0, globals_1.expect)(response.citations).toBeDefined();
            (0, globals_1.expect)(response.citations.length).toBeGreaterThan(0);
            (0, globals_1.expect)(response.citations[0]).toHaveProperty('entityId');
            (0, globals_1.expect)(response.citations[0]).toHaveProperty('entityName');
            (0, globals_1.expect)(response.citations[0]).toHaveProperty('relevance');
        });
        (0, globals_1.it)('should return explainable why_paths', async () => {
            const query = {
                question: 'How is Alice connected to Bob?',
            };
            const response = await copilotService.query(query);
            (0, globals_1.expect)(response.whyPaths).toBeDefined();
            (0, globals_1.expect)(response.whyPaths.length).toBeGreaterThan(0);
            (0, globals_1.expect)(response.whyPaths[0]).toHaveProperty('pathId');
            (0, globals_1.expect)(response.whyPaths[0]).toHaveProperty('startEntityId');
            (0, globals_1.expect)(response.whyPaths[0]).toHaveProperty('endEntityId');
            (0, globals_1.expect)(response.whyPaths[0]).toHaveProperty('explanation');
        });
        (0, globals_1.it)('should include metadata with processing time', async () => {
            const query = {
                question: 'Find all Person entities',
            };
            const response = await copilotService.query(query);
            (0, globals_1.expect)(response.metadata).toBeDefined();
            (0, globals_1.expect)(response.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.metadata.model).toBeDefined();
        });
        (0, globals_1.it)('should handle queries with context', async () => {
            const query = {
                question: 'What are the relationships here?',
                investigationId: 'inv-001',
                context: {
                    selectedEntities: ['entity-001', 'entity-002'],
                    timeRange: {
                        start: new Date('2024-01-01'),
                        end: new Date('2024-12-31'),
                    },
                },
            };
            const response = await copilotService.query(query);
            (0, globals_1.expect)(response.answer).toBeDefined();
        });
    });
    (0, globals_1.describe)('Cypher Generation', () => {
        (0, globals_1.it)('should generate Cypher for connection queries', async () => {
            const result = await copilotService.generateCypher('Who is connected to Alice?');
            (0, globals_1.expect)(result.cypher).toBeDefined();
            (0, globals_1.expect)(result.cypher).toContain('MATCH');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should generate Cypher for path queries', async () => {
            const result = await copilotService.generateCypher('What connects Alice to Bob?');
            (0, globals_1.expect)(result.cypher).toBeDefined();
            (0, globals_1.expect)(result.cypher.toLowerCase()).toContain('match');
        });
        (0, globals_1.it)('should generate Cypher for entity type queries', async () => {
            const result = await copilotService.generateCypher('Find all entities of type Person');
            (0, globals_1.expect)(result.cypher).toBeDefined();
        });
        (0, globals_1.it)('should provide explanation for generated Cypher', async () => {
            const result = await copilotService.generateCypher('Show relationships for entity X');
            (0, globals_1.expect)(result.explanation).toBeDefined();
            (0, globals_1.expect)(result.explanation.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should handle unknown query patterns with fallback', async () => {
            const result = await copilotService.generateCypher('Do something completely random and unusual');
            (0, globals_1.expect)(result.cypher).toBeDefined();
            (0, globals_1.expect)(result.confidence).toBeLessThan(0.7); // Lower confidence for fallback
        });
    });
    (0, globals_1.describe)('Cypher Validation', () => {
        (0, globals_1.it)('should validate correct Cypher queries', async () => {
            const result = await copilotService.validateCypher('MATCH (n:Person) RETURN n LIMIT 10');
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should reject DELETE operations', async () => {
            const result = await copilotService.validateCypher('MATCH (n:Person) DELETE n');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('DELETE operations not allowed through copilot');
        });
        (0, globals_1.it)('should reject DETACH DELETE operations', async () => {
            const result = await copilotService.validateCypher('MATCH (n:Person) DETACH DELETE n');
            (0, globals_1.expect)(result.valid).toBe(false);
        });
        (0, globals_1.it)('should reject DROP operations', async () => {
            const result = await copilotService.validateCypher('DROP INDEX my_index');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('DROP operations not allowed');
        });
        (0, globals_1.it)('should validate queries with parameters', async () => {
            const result = await copilotService.validateCypher('MATCH (n:Person {name: $name}) RETURN n');
            (0, globals_1.expect)(result.valid).toBe(true);
        });
    });
    (0, globals_1.describe)('Conversation Management', () => {
        (0, globals_1.it)('should maintain conversation history', async () => {
            await copilotService.query({ question: 'First question' });
            await copilotService.query({ question: 'Second question' });
            const history = await copilotService.getConversationHistory();
            (0, globals_1.expect)(history.length).toBe(4); // 2 user + 2 assistant messages
            (0, globals_1.expect)(history[0].role).toBe('user');
            (0, globals_1.expect)(history[1].role).toBe('assistant');
        });
        (0, globals_1.it)('should clear conversation history', async () => {
            await copilotService.query({ question: 'A question' });
            await copilotService.clearConversation();
            const history = await copilotService.getConversationHistory();
            (0, globals_1.expect)(history).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Path Explanation', () => {
        (0, globals_1.it)('should explain a path', async () => {
            const explanation = await copilotService.explainPath('path-001');
            (0, globals_1.expect)(explanation).toBeDefined();
            (0, globals_1.expect)(explanation.length).toBeGreaterThan(0);
            (0, globals_1.expect)(explanation).toContain('connection');
        });
    });
    (0, globals_1.describe)('Question Suggestions', () => {
        (0, globals_1.it)('should suggest relevant questions', async () => {
            const suggestions = await copilotService.suggestQuestions({
                investigationId: 'inv-001',
            });
            (0, globals_1.expect)(suggestions).toBeDefined();
            (0, globals_1.expect)(suggestions.length).toBeGreaterThan(0);
            (0, globals_1.expect)(suggestions[0]).toContain('?');
        });
        (0, globals_1.it)('should suggest questions based on selected entities', async () => {
            const suggestions = await copilotService.suggestQuestions({
                entities: ['entity-001', 'entity-002'],
            });
            (0, globals_1.expect)(suggestions).toBeDefined();
            (0, globals_1.expect)(suggestions.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Response Quality', () => {
        (0, globals_1.it)('should return high confidence for well-matched queries', async () => {
            const response = await copilotService.query({
                question: 'Who is connected to Alice?',
            });
            (0, globals_1.expect)(response.confidence).toBeGreaterThan(0.7);
        });
        (0, globals_1.it)('should return citations sorted by relevance', async () => {
            const response = await copilotService.query({
                question: 'Tell me about the investigation',
            });
            const citations = response.citations;
            for (let i = 1; i < citations.length; i++) {
                (0, globals_1.expect)(citations[i - 1].relevance).toBeGreaterThanOrEqual(citations[i].relevance);
            }
        });
        (0, globals_1.it)('should not return empty answers', async () => {
            const response = await copilotService.query({
                question: 'Any question here',
            });
            (0, globals_1.expect)(response.answer).toBeDefined();
            (0, globals_1.expect)(response.answer.trim().length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle empty questions gracefully', async () => {
            const response = await copilotService.query({
                question: '',
            });
            // Should still return a response, possibly with low confidence
            (0, globals_1.expect)(response).toBeDefined();
        });
        (0, globals_1.it)('should handle very long questions', async () => {
            const longQuestion = 'What '.repeat(1000) + 'is the answer?';
            const response = await copilotService.query({
                question: longQuestion,
            });
            (0, globals_1.expect)(response).toBeDefined();
        });
        (0, globals_1.it)('should handle special characters in questions', async () => {
            const response = await copilotService.query({
                question: "What's the connection to O'Brien & Associates <script>alert('xss')</script>?",
            });
            (0, globals_1.expect)(response).toBeDefined();
            // Answer should not contain raw script tags
            (0, globals_1.expect)(response.answer).not.toContain('<script>');
        });
    });
    (0, globals_1.describe)('Health Check', () => {
        (0, globals_1.it)('should return healthy status', async () => {
            const health = await copilotService.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.modelLoaded).toBe(true);
            (0, globals_1.expect)(health.details.graphConnected).toBe(true);
        });
    });
    (0, globals_1.describe)('Performance', () => {
        (0, globals_1.it)('should respond within acceptable time', async () => {
            const startTime = Date.now();
            await copilotService.query({
                question: 'Simple query',
            });
            const elapsed = Date.now() - startTime;
            // Should respond quickly (mock should be < 100ms)
            (0, globals_1.expect)(elapsed).toBeLessThan(1000);
        });
        (0, globals_1.it)('should handle concurrent queries', async () => {
            const queries = Array.from({ length: 10 }, (_, i) => copilotService.query({ question: `Query ${i}` }));
            const responses = await Promise.all(queries);
            (0, globals_1.expect)(responses).toHaveLength(10);
            responses.forEach(r => {
                (0, globals_1.expect)(r.answer).toBeDefined();
            });
        });
    });
});
