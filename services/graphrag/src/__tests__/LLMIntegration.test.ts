/**
 * Tests for LLMIntegration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LLMIntegration, LLMConfig } from '../llm/LLMIntegration.js';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
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
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }],
          usage: { total_tokens: 10 },
        }),
      },
    })),
  };
});

describe('LLMIntegration', () => {
  let llm: LLMIntegration;
  const config: LLMConfig = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    llm = new LLMIntegration(config);
  });

  describe('generateAnswer', () => {
    it('should generate an answer from evidence', async () => {
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
              sourceType: 'document' as const,
            },
          ],
          graphPaths: [],
          relevanceScore: 0.9,
          tenantId: 'tenant-1',
        },
      ];

      const answer = await llm.generateAnswer(
        'Where is Entity A located?',
        evidenceChunks,
      );

      expect(answer.id).toBeDefined();
      expect(answer.answer).toBeDefined();
      expect(answer.tokensUsed.total).toBe(150);
      expect(answer.modelUsed).toBe('gpt-4-turbo-preview');
    });

    it('should include reasoning when requested', async () => {
      const answer = await llm.generateAnswer('Test query', [], {
        includeReasoning: true,
      });

      expect(answer).toBeDefined();
    });
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const result = await llm.embed('Test text for embedding');

      expect(result.embedding).toHaveLength(1536);
      expect(result.tokensUsed).toBe(10);
      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('generateCypher', () => {
    it('should generate Cypher from natural language', async () => {
      const result = await llm.generateCypher(
        'Find all people connected to Entity A',
        {
          nodeTypes: ['Person', 'Entity'],
          relationshipTypes: ['KNOWS', 'WORKS_WITH'],
          properties: { Person: ['name', 'age'], Entity: ['name', 'type'] },
        },
      );

      expect(result.cypher).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('cost tracking', () => {
    it('should track total cost', async () => {
      llm.resetCostTracking();
      expect(llm.getTotalCost()).toBe(0);

      await llm.embed('Test');
      expect(llm.getTotalCost()).toBeGreaterThan(0);
    });

    it('should reset cost tracking', async () => {
      await llm.embed('Test');
      llm.resetCostTracking();
      expect(llm.getTotalCost()).toBe(0);
    });
  });

  describe('summarize', () => {
    it('should summarize multiple evidence chunks', async () => {
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
      expect(summary).toBeDefined();
    });
  });
});
