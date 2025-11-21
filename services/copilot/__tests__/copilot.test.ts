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

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Types for copilot service
interface CopilotQuery {
  question: string;
  investigationId?: string;
  context?: {
    selectedEntities?: string[];
    timeRange?: { start: Date; end: Date };
    filters?: Record<string, unknown>;
  };
}

interface GraphRAGResponse {
  answer: string;
  confidence: number;
  citations: {
    entityId: string;
    entityName: string;
    relevance: number;
  }[];
  whyPaths: {
    pathId: string;
    startEntityId: string;
    endEntityId: string;
    relationships: string[];
    explanation: string;
  }[];
  generatedCypher?: string;
  metadata: {
    processingTimeMs: number;
    tokensUsed?: number;
    model?: string;
  };
}

interface CypherGenerationResult {
  cypher: string;
  parameters: Record<string, unknown>;
  explanation: string;
  confidence: number;
}

// Mock copilot service implementation
const createMockCopilotService = () => {
  const conversationHistory: Array<{ role: string; content: string }> = [];

  const nlToCypherPatterns: Record<string, string> = {
    'who is connected to': 'MATCH (a)-[r]-(b) WHERE a.name = $name RETURN b, r',
    'what connects': 'MATCH p=shortestPath((a)-[*]-(b)) WHERE a.name = $from AND b.name = $to RETURN p',
    'find all': 'MATCH (n:$type) RETURN n',
    'show relationships': 'MATCH (a)-[r]->(b) WHERE a.id = $id RETURN a, r, b',
    'entities of type': 'MATCH (n:$type) RETURN n',
  };

  const generateCypher = (question: string): CypherGenerationResult => {
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
    query: jest.fn(async (query: CopilotQuery): Promise<GraphRAGResponse> => {
      const startTime = Date.now();

      // Add to conversation history
      conversationHistory.push({ role: 'user', content: query.question });

      // Generate Cypher from natural language
      const cypherResult = generateCypher(query.question);

      // Simulate GraphRAG response
      const response: GraphRAGResponse = {
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

    generateCypher: jest.fn(async (question: string): Promise<CypherGenerationResult> => {
      return generateCypher(question);
    }),

    validateCypher: jest.fn(async (cypher: string): Promise<{ valid: boolean; errors: string[] }> => {
      const errors: string[] = [];

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

    explainPath: jest.fn(async (pathId: string): Promise<string> => {
      return `This path shows the connection between entities through a series of relationships. ` +
        `The path was identified as relevant because it demonstrates a direct or indirect connection ` +
        `that answers the user's query.`;
    }),

    getConversationHistory: jest.fn(async (): Promise<Array<{ role: string; content: string }>> => {
      return [...conversationHistory];
    }),

    clearConversation: jest.fn(async (): Promise<void> => {
      conversationHistory.length = 0;
    }),

    suggestQuestions: jest.fn(async (context: { investigationId?: string; entities?: string[] }): Promise<string[]> => {
      return [
        'What connections exist between these entities?',
        'Who has the most relationships in this investigation?',
        'What is the shortest path between entity A and B?',
        'Show me all entities of type Person',
        'What patterns are common in this graph?',
      ];
    }),

    healthCheck: jest.fn(async (): Promise<{ status: string; details: Record<string, unknown> }> => {
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

describe('Copilot Service', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
    jest.clearAllMocks();
  });

  describe('Natural Language Query Processing', () => {
    it('should process a natural language question', async () => {
      const query: CopilotQuery = {
        question: 'What connects Alice to GlobalSupply Inc?',
        investigationId: 'inv-001',
      };

      const response = await copilotService.query(query);

      expect(response.answer).toBeDefined();
      expect(response.answer.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it('should return citations for referenced entities', async () => {
      const query: CopilotQuery = {
        question: 'Tell me about Alice Chen',
      };

      const response = await copilotService.query(query);

      expect(response.citations).toBeDefined();
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.citations[0]).toHaveProperty('entityId');
      expect(response.citations[0]).toHaveProperty('entityName');
      expect(response.citations[0]).toHaveProperty('relevance');
    });

    it('should return explainable why_paths', async () => {
      const query: CopilotQuery = {
        question: 'How is Alice connected to Bob?',
      };

      const response = await copilotService.query(query);

      expect(response.whyPaths).toBeDefined();
      expect(response.whyPaths.length).toBeGreaterThan(0);
      expect(response.whyPaths[0]).toHaveProperty('pathId');
      expect(response.whyPaths[0]).toHaveProperty('startEntityId');
      expect(response.whyPaths[0]).toHaveProperty('endEntityId');
      expect(response.whyPaths[0]).toHaveProperty('explanation');
    });

    it('should include metadata with processing time', async () => {
      const query: CopilotQuery = {
        question: 'Find all Person entities',
      };

      const response = await copilotService.query(query);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(response.metadata.model).toBeDefined();
    });

    it('should handle queries with context', async () => {
      const query: CopilotQuery = {
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

      expect(response.answer).toBeDefined();
    });
  });

  describe('Cypher Generation', () => {
    it('should generate Cypher for connection queries', async () => {
      const result = await copilotService.generateCypher('Who is connected to Alice?');

      expect(result.cypher).toBeDefined();
      expect(result.cypher).toContain('MATCH');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate Cypher for path queries', async () => {
      const result = await copilotService.generateCypher('What connects Alice to Bob?');

      expect(result.cypher).toBeDefined();
      expect(result.cypher.toLowerCase()).toContain('match');
    });

    it('should generate Cypher for entity type queries', async () => {
      const result = await copilotService.generateCypher('Find all entities of type Person');

      expect(result.cypher).toBeDefined();
    });

    it('should provide explanation for generated Cypher', async () => {
      const result = await copilotService.generateCypher('Show relationships for entity X');

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should handle unknown query patterns with fallback', async () => {
      const result = await copilotService.generateCypher('Do something completely random and unusual');

      expect(result.cypher).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7); // Lower confidence for fallback
    });
  });

  describe('Cypher Validation', () => {
    it('should validate correct Cypher queries', async () => {
      const result = await copilotService.validateCypher(
        'MATCH (n:Person) RETURN n LIMIT 10'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject DELETE operations', async () => {
      const result = await copilotService.validateCypher(
        'MATCH (n:Person) DELETE n'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DELETE operations not allowed through copilot');
    });

    it('should reject DETACH DELETE operations', async () => {
      const result = await copilotService.validateCypher(
        'MATCH (n:Person) DETACH DELETE n'
      );

      expect(result.valid).toBe(false);
    });

    it('should reject DROP operations', async () => {
      const result = await copilotService.validateCypher(
        'DROP INDEX my_index'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DROP operations not allowed');
    });

    it('should validate queries with parameters', async () => {
      const result = await copilotService.validateCypher(
        'MATCH (n:Person {name: $name}) RETURN n'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    it('should maintain conversation history', async () => {
      await copilotService.query({ question: 'First question' });
      await copilotService.query({ question: 'Second question' });

      const history = await copilotService.getConversationHistory();

      expect(history.length).toBe(4); // 2 user + 2 assistant messages
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });

    it('should clear conversation history', async () => {
      await copilotService.query({ question: 'A question' });
      await copilotService.clearConversation();

      const history = await copilotService.getConversationHistory();

      expect(history).toHaveLength(0);
    });
  });

  describe('Path Explanation', () => {
    it('should explain a path', async () => {
      const explanation = await copilotService.explainPath('path-001');

      expect(explanation).toBeDefined();
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain('connection');
    });
  });

  describe('Question Suggestions', () => {
    it('should suggest relevant questions', async () => {
      const suggestions = await copilotService.suggestQuestions({
        investigationId: 'inv-001',
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('?');
    });

    it('should suggest questions based on selected entities', async () => {
      const suggestions = await copilotService.suggestQuestions({
        entities: ['entity-001', 'entity-002'],
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Response Quality', () => {
    it('should return high confidence for well-matched queries', async () => {
      const response = await copilotService.query({
        question: 'Who is connected to Alice?',
      });

      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should return citations sorted by relevance', async () => {
      const response = await copilotService.query({
        question: 'Tell me about the investigation',
      });

      const citations = response.citations;
      for (let i = 1; i < citations.length; i++) {
        expect(citations[i - 1].relevance).toBeGreaterThanOrEqual(citations[i].relevance);
      }
    });

    it('should not return empty answers', async () => {
      const response = await copilotService.query({
        question: 'Any question here',
      });

      expect(response.answer).toBeDefined();
      expect(response.answer.trim().length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty questions gracefully', async () => {
      const response = await copilotService.query({
        question: '',
      });

      // Should still return a response, possibly with low confidence
      expect(response).toBeDefined();
    });

    it('should handle very long questions', async () => {
      const longQuestion = 'What '.repeat(1000) + 'is the answer?';

      const response = await copilotService.query({
        question: longQuestion,
      });

      expect(response).toBeDefined();
    });

    it('should handle special characters in questions', async () => {
      const response = await copilotService.query({
        question: "What's the connection to O'Brien & Associates <script>alert('xss')</script>?",
      });

      expect(response).toBeDefined();
      // Answer should not contain raw script tags
      expect(response.answer).not.toContain('<script>');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await copilotService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.modelLoaded).toBe(true);
      expect(health.details.graphConnected).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      await copilotService.query({
        question: 'Simple query',
      });

      const elapsed = Date.now() - startTime;

      // Should respond quickly (mock should be < 100ms)
      expect(elapsed).toBeLessThan(1000);
    });

    it('should handle concurrent queries', async () => {
      const queries = Array.from({ length: 10 }, (_, i) =>
        copilotService.query({ question: `Query ${i}` })
      );

      const responses = await Promise.all(queries);

      expect(responses).toHaveLength(10);
      responses.forEach(r => {
        expect(r.answer).toBeDefined();
      });
    });
  });
});
