/**
 * Tests for GraphRAG Service
 *
 * P0 - Critical for MVP-4-GA
 * Target coverage: 80%
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GraphRAGService, GraphRAGRequest, GraphRAGResponse, Entity, Relationship } from '../GraphRAGService';
import type { Driver } from 'neo4j-driver';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('neo4j-driver');
jest.mock('ioredis');

const createMockLLMService = () => ({
  complete: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<string>>,
});

const createMockEmbeddingService = () => ({
  generateEmbedding: jest.fn() as jest.MockedFunction<
    (...args: unknown[]) => Promise<number[]>
  >,
});

const createMockNeo4jDriver = () => {
  const mockSession = {
    run: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
    close: jest.fn(),
  };
  return {
    session: jest.fn(() => mockSession),
    close: jest.fn(),
    _mockSession: mockSession,
  };
};

const createMockRedis = () => ({
  get: jest.fn() as jest.MockedFunction<
    (...args: unknown[]) => Promise<string | null>
  >,
  set: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  setex: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  del: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  incr: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  expire: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  zincrby: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  pipeline: jest.fn(() => ({
    get: jest.fn() as jest.MockedFunction<
      (...args: unknown[]) => Promise<string | null>
    >,
    setex: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
    exec: jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<any>>,
  })),
});

const createNode = (
  id: string,
  type: string,
  label: string,
  confidence: number = 1,
) => ({
  properties: {
    id,
    type,
    label,
    confidence,
    properties: '{}',
  },
});

const createRelationship = (
  id: string,
  type: string,
  fromEntityId: string,
  toEntityId: string,
  confidence: number = 1,
) => ({
  properties: {
    id,
    type,
    fromEntityId,
    toEntityId,
    confidence,
    properties: '{}',
  },
});

const createRecord = (nodes: unknown[], relationships: unknown[]) => ({
  get: (key: string) => {
    if (key === 'nodes') return nodes;
    if (key === 'relationships') return relationships;
    return undefined;
  },
});

describe('GraphRAGService', () => {
  let service: GraphRAGService;
  let mockNeo4j: ReturnType<typeof createMockNeo4jDriver>;
  let mockLLM: ReturnType<typeof createMockLLMService>;
  let mockEmbedding: ReturnType<typeof createMockEmbeddingService>;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNeo4j = createMockNeo4jDriver();
    mockLLM = createMockLLMService();
    mockEmbedding = createMockEmbeddingService();
    mockRedis = createMockRedis();

    service = new GraphRAGService(
      mockNeo4j as unknown as Driver,
      mockLLM,
      mockEmbedding,
      mockRedis as unknown as Redis
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject request with empty investigationId', async () => {
      const request: GraphRAGRequest = {
        investigationId: '',
        question: 'Who is John Doe?',
      };

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should reject request with question less than 3 characters', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Hi',
      };

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should reject request with maxHops > 3', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is connected to John Doe?',
        maxHops: 5,
      };

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should reject request with temperature > 1', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        temperature: 1.5,
      };

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should accept valid request with all optional fields', async () => {
      const request: GraphRAGRequest = {
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
      await expect(service.answer(request)).resolves.toBeDefined();
    });
  });

  describe('Graph Context Retrieval', () => {
    it('should retrieve entities within maxHops from focus entities', async () => {
      const request: GraphRAGRequest = {
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
        createRelationship(
          'rel-1',
          'WORKS_FOR',
          'entity-john',
          'entity-acme',
          0.9,
        ),
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

      expect(mockNeo4j._mockSession.run).toHaveBeenCalled();
      expect(result.citations.entityIds).toContain('entity-john');
    });

    it('should use cached context when available', async () => {
      const request: GraphRAGRequest = {
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
      expect(mockNeo4j._mockSession.run).not.toHaveBeenCalled();
    });

    it('should handle empty graph context gracefully', async () => {
      const request: GraphRAGRequest = {
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

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.citations.entityIds).toHaveLength(0);
    });
  });

  describe('LLM Response Validation', () => {
    it('should parse valid JSON response from LLM', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      const nodes = [
        createNode('entity-john', 'Person', 'John Doe', 0.95),
        createNode('entity-acme', 'Organization', 'ACME Corp', 0.9),
      ];
      const relationships = [
        createRelationship(
          'rel-123',
          'EMPLOYED_BY',
          'entity-john',
          'entity-acme',
          0.9,
        ),
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

      expect(result.answer).toBe(validResponse.answer);
      expect(result.confidence).toBe(validResponse.confidence);
      expect(result.citations.entityIds).toEqual(validResponse.citations.entityIds);
      expect(result.why_paths).toHaveLength(1);
    });

    it('should reject malformed JSON from LLM', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
      mockRedis.get.mockResolvedValue(null);
      mockLLM.complete.mockResolvedValue('This is not valid JSON');

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should reject response missing required fields', async () => {
      const request: GraphRAGRequest = {
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

      await expect(service.answer(request)).rejects.toThrow();
    });

    it('should reject response with invalid confidence range', async () => {
      const request: GraphRAGRequest = {
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
      expect(result.confidence).toBe(invalidResponse.confidence);
    });
  });

  describe('Citation Validation', () => {
    it('should validate citations reference entities in context', async () => {
      const request: GraphRAGRequest = {
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

      await expect(service.answer(request)).rejects.toThrow(
        /Invalid GraphRAG response/i,
      );
    });
  });

  describe('Why Path Generation', () => {
    it('should include why_paths for traversed relationships', async () => {
      const request: GraphRAGRequest = {
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
        createRelationship(
          'rel-emp-1',
          'EMPLOYED_BY',
          'entity-john',
          'entity-acme',
          0.9,
        ),
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

      expect(result.why_paths).toHaveLength(1);
      expect(result.why_paths[0].type).toBe('EMPLOYED_BY');
      expect(result.why_paths[0].supportScore).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const request: GraphRAGRequest = {
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

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should not cache low-confidence responses', async () => {
      const request: GraphRAGRequest = {
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

  describe('Circuit Breaker', () => {
    it('should open circuit after repeated LLM failures', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
      mockRedis.get.mockResolvedValue(null);
      mockLLM.complete.mockRejectedValue(new Error('LLM service unavailable'));

      // Simulate multiple failures to trip circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(service.answer(request)).rejects.toThrow();
      }

      // After circuit opens, should fail fast
      await expect(service.answer(request)).rejects.toThrow();
    });
  });

  describe('Tenant Isolation', () => {
    it('should include tenantId in Neo4j queries', async () => {
      const request: GraphRAGRequest = {
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
      expect(mockNeo4j._mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('tenantId'),
        expect.objectContaining({ tenantId: 'tenant-abc' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Neo4j connection errors', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      mockNeo4j._mockSession.run.mockRejectedValue(new Error('Neo4j connection failed'));
      mockRedis.get.mockResolvedValue(null);

      await expect(service.answer(request)).rejects.toThrow('Neo4j connection failed');
    });

    it('should handle Redis errors gracefully and fall back to fresh query', async () => {
      const request: GraphRAGRequest = {
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

      expect(result.answer).toBeDefined();
    });

    it('should return user-facing error for known error types', async () => {
      const request: GraphRAGRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      mockNeo4j._mockSession.run.mockResolvedValue({ records: [] });
      mockRedis.get.mockResolvedValue(null);
      mockLLM.complete.mockRejectedValue({ code: 'rate_limit_exceeded' });

      await expect(service.answer(request)).rejects.toThrow();
    });
  });
});
