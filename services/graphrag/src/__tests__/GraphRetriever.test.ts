/**
 * Tests for GraphRetriever
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GraphRetriever } from '../retrieval/GraphRetriever.js';

// Mock Neo4j driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
};

describe('GraphRetriever', () => {
  let retriever: GraphRetriever;

  beforeEach(() => {
    jest.clearAllMocks();
    retriever = new GraphRetriever(mockDriver as any, {
      maxHops: 3,
      maxNodes: 100,
      minRelevance: 0.3,
    });
  });

  describe('retrieve', () => {
    it('should return empty result when no seed entities found', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const result = await retriever.retrieve({
        query: 'test query',
        tenantId: 'tenant-1',
        maxHops: 3,
        maxNodes: 100,
        maxDocuments: 10,
        minRelevance: 0.3,
        includeCitations: true,
        includeGraphPaths: true,
        includeCounterfactuals: false,
      });

      expect(result.evidenceChunks).toHaveLength(0);
      expect(result.subgraph.nodes).toHaveLength(0);
      expect(result.totalNodesTraversed).toBe(0);
    });

    it('should retrieve subgraph from seed entities', async () => {
      // Mock seed entity search
      mockSession.run.mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? 'entity-1' : 0.9) },
          { get: (key: string) => (key === 'id' ? 'entity-2' : 0.8) },
        ],
      });

      // Mock subgraph expansion
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'n') {
                return {
                  properties: { id: 'entity-1', name: 'Test Entity' },
                };
              }
              if (key === 'labels') return ['Entity'];
              return [];
            },
          },
        ],
      });

      // Mock GDS projection (may fail, that's ok)
      mockSession.run.mockRejectedValueOnce(new Error('GDS not available'));

      // Mock path extraction
      mockSession.run.mockResolvedValueOnce({ records: [] });

      // Mock document links
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const result = await retriever.retrieve({
        query: 'test query',
        tenantId: 'tenant-1',
        maxHops: 3,
        maxNodes: 100,
        maxDocuments: 10,
        minRelevance: 0.3,
        includeCitations: true,
        includeGraphPaths: true,
        includeCounterfactuals: false,
      });

      expect(result.query).toBe('test query');
      expect(result.id).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration', () => {
    it('should use default config values', () => {
      const defaultRetriever = new GraphRetriever(mockDriver as any);
      expect(defaultRetriever).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const customRetriever = new GraphRetriever(mockDriver as any, {
        maxHops: 5,
      });
      expect(customRetriever).toBeDefined();
    });
  });
});
