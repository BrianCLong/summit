/**
 * Unit tests for SimilarityService duplicate detection
 *
 * Tests the modern pgvector-based findDuplicateCandidates implementation
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { DuplicateCandidate } from '../SimilarityService.js';

// Mock dependencies
jest.unstable_mockModule('../../config/database.js', () => ({}));
jest.unstable_mockModule('../../observability/tracer.js', () => ({
  getTracer: jest.fn(() => ({
    traceDbQuery: jest.fn((db: string, op: string, q: string, fn: () => any) => fn()),
    addAttributes: jest.fn(),
  })),
}));
jest.unstable_mockModule('../../monitoring/metrics.js', () => ({}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

describe('SimilarityService - Duplicate Detection', () => {
  let SimilarityService: typeof import('../SimilarityService.js').SimilarityService;
  let service: InstanceType<typeof SimilarityService>;
  let mockPool: any;
  let mockClient: any;

  beforeAll(async () => {
    const module = await import('../SimilarityService.js');
    SimilarityService = module.SimilarityService;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Create mock pool
    const mockPoolConnect = jest.fn();
    (mockPoolConnect as any).mockResolvedValue(mockClient);
    mockPool = {
      connect: mockPoolConnect,
    };

    // Inject mock pool
    service = new SimilarityService();
    (service as any).postgres = mockPool;
  });

  describe('calculateTopologySimilarity', () => {
    it('should calculate Jaccard similarity correctly', () => {
      const service = new SimilarityService();
      const neighbors1 = ['a', 'b', 'c'];
      const neighbors2 = ['b', 'c', 'd'];

      // Intersection: {b, c} = 2 elements
      // Union: {a, b, c, d} = 4 elements
      // Jaccard = 2/4 = 0.5

      const similarity = (service as any).calculateTopologySimilarity(
        neighbors1,
        neighbors2,
      );

      expect(similarity).toBe(0.5);
    });

    it('should return 0 for disjoint sets', () => {
      const service = new SimilarityService();
      const neighbors1 = ['a', 'b'];
      const neighbors2 = ['c', 'd'];

      const similarity = (service as any).calculateTopologySimilarity(
        neighbors1,
        neighbors2,
      );

      expect(similarity).toBe(0);
    });

    it('should return 1 for identical sets', () => {
      const service = new SimilarityService();
      const neighbors1 = ['a', 'b', 'c'];
      const neighbors2 = ['a', 'b', 'c'];

      const similarity = (service as any).calculateTopologySimilarity(
        neighbors1,
        neighbors2,
      );

      expect(similarity).toBe(1);
    });

    it('should handle empty arrays', () => {
      const service = new SimilarityService();

      const similarity = (service as any).calculateTopologySimilarity([], []);

      expect(similarity).toBe(0);
    });
  });

  describe('calculateProvenanceSimilarity', () => {
    it('should return 1 for matching sources', () => {
      const service = new SimilarityService();

      const similarity = (service as any).calculateProvenanceSimilarity(
        'source-a',
        'source-a',
      );

      expect(similarity).toBe(1);
    });

    it('should return 0 for different sources', () => {
      const service = new SimilarityService();

      const similarity = (service as any).calculateProvenanceSimilarity(
        'source-a',
        'source-b',
      );

      expect(similarity).toBe(0);
    });

    it('should return 0 for undefined sources', () => {
      const service = new SimilarityService();

      const similarity = (service as any).calculateProvenanceSimilarity(
        undefined,
        'source-a',
      );

      expect(similarity).toBe(0);
    });
  });

  describe('findDuplicateCandidates', () => {
    it('should find duplicate candidates with hybrid scoring', async () => {
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

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-123',
        threshold: 0.7,
        topK: 5,
      });

      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toMatchObject({
        entityA: {
          id: expect.any(String),
          label: expect.any(String),
        },
        entityB: {
          id: expect.any(String),
          label: expect.any(String),
        },
        similarity: expect.any(Number),
        scores: {
          semantic: expect.any(Number),
          topology: expect.any(Number),
          provenance: expect.any(Number),
        },
      });

      // Verify hybrid scoring:
      // Semantic: 0.9, Topology: 1/3 ≈ 0.33 (1 common neighbor out of 3 total)
      // Provenance: 1.0 (same source)
      // Overall: 0.9 * 0.6 + 0.33 * 0.3 + 1.0 * 0.1 = 0.54 + 0.1 + 0.1 = 0.74
      expect(candidates[0].similarity).toBeGreaterThanOrEqual(0.7);
      expect(candidates[0].scores.semantic).toBe(0.9);
      expect(candidates[0].scores.provenance).toBe(1);
    });

    it('should filter out pairs below threshold', async () => {
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

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-123',
        threshold: 0.8, // High threshold
        topK: 5,
      });

      // Should be empty because overall similarity is:
      // 0.3 * 0.6 + 0 * 0.3 + 0 * 0.1 = 0.18 < 0.8
      expect(candidates).toHaveLength(0);
    });

    it('should avoid duplicate pairs (symmetric handling)', async () => {
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

      const mockWrapNeo4jOperation = jest.fn((name: string, fn: () => any) =>
        fn(),
      );
      (service as any).otelService = {
        wrapNeo4jOperation: mockWrapNeo4jOperation,
        addSpanAttributes: jest.fn(),
      };

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-123',
        threshold: 0.7,
        topK: 5,
      });

      // Should only have ONE pair, not two (no duplicates)
      expect(candidates).toHaveLength(1);
    });

    it('should return empty array when no entities found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const mockWrapNeo4jOperation = jest.fn((name: string, fn: () => any) =>
        fn(),
      );
      (service as any).otelService = {
        wrapNeo4jOperation: mockWrapNeo4jOperation,
        addSpanAttributes: jest.fn(),
      };

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-empty',
        threshold: 0.7,
      });

      expect(candidates).toEqual([]);
    });

    it('should include reasons when requested', async () => {
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

      const mockWrapNeo4jOperation = jest.fn((name: string, fn: () => any) =>
        fn(),
      );
      (service as any).otelService = {
        wrapNeo4jOperation: mockWrapNeo4jOperation,
        addSpanAttributes: jest.fn(),
      };

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-123',
        threshold: 0.7,
        includeReasons: true,
      });

      expect(candidates).toHaveLength(1);
      expect(candidates[0].reasons).toBeDefined();
      expect(candidates[0].reasons).toContain('High semantic similarity');
      expect(candidates[0].reasons).toContain('Same source');
    });

    it('should sort candidates by similarity descending', async () => {
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

      const mockWrapNeo4jOperation = jest.fn((name: string, fn: () => any) =>
        fn(),
      );
      (service as any).otelService = {
        wrapNeo4jOperation: mockWrapNeo4jOperation,
        addSpanAttributes: jest.fn(),
      };

      const candidates = await service.findDuplicateCandidates({
        investigationId: 'inv-123',
        threshold: 0.5,
      });

      expect(candidates.length).toBeGreaterThan(0);

      // Should be sorted by similarity descending
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].similarity).toBeGreaterThanOrEqual(
          candidates[i].similarity,
        );
      }
    });
  });
});
