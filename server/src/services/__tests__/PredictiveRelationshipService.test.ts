import { jest } from '@jest/globals';

// Create mock instances
const mockRun = jest.fn();
const mockClose = jest.fn();
const mockSession = jest.fn().mockReturnValue({
  run: mockRun,
  close: mockClose,
});
const mockDriver = {
  session: mockSession,
};

// Mock dependencies
jest.unstable_mockModule('../../config/database.js', () => ({
  getNeo4jDriver: jest.fn().mockReturnValue(mockDriver),
}));

const mockEmbeddingServiceInstance = {
  generateEmbedding: jest.fn(),
  cosineSimilarity: jest.fn(),
};

jest.unstable_mockModule('../EmbeddingService.js', () => ({
  default: jest.fn().mockImplementation(() => mockEmbeddingServiceInstance),
}));

const mockRelationshipServiceInstance = {
  suggestRelationshipTypes: jest.fn(),
  setDriver: jest.fn(),
};

// Since RelationshipService is required via createRequire, we can't easily mock it via unstable_mockModule for the require call.
// However, since we updated PredictiveRelationshipService to accept dependencies in constructor, we can pass mocks there.
// So we don't strictly need to mock the require if we inject the dependency.

// Import the class under test
const { PredictiveRelationshipService } = await import('../PredictiveRelationshipService.ts');

describe('PredictiveRelationshipService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PredictiveRelationshipService(
      mockEmbeddingServiceInstance as any,
      mockRelationshipServiceInstance,
      mockDriver as any
    );
  });

  describe('predictRelationships', () => {
    it('should predict relationships based on embeddings and heuristics', async () => {
      const entityId = 'source-1';
      const sourceProps = {
        id: entityId,
        label: 'Source Entity',
        type: 'Person',
        embedding: [0.1, 0.2]
      };

      const candidateProps = {
        id: 'target-1',
        label: 'Target Entity',
        type: 'Organization'
      };
      const candidateEmbedding = [0.15, 0.25]; // Similar

      // Mock Neo4j responses
      // 1. Fetch Source
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key) => ({ properties: sourceProps })
        }]
      });

      // 2. Fetch Candidates
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key) => {
            if (key === 'target') return { properties: candidateProps };
            if (key === 'embedding') return candidateEmbedding;
            return null;
          }
        }]
      });

      // Mock Embedding Service
      mockEmbeddingServiceInstance.cosineSimilarity.mockReturnValue(0.95);

      // Mock Relationship Service
      mockRelationshipServiceInstance.suggestRelationshipTypes.mockReturnValue([
        { type: 'EMPLOYMENT', weight: 0.8 }
      ]);

      const results = await service.predictRelationships(entityId);

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe(entityId);
      expect(results[0].targetId).toBe(candidateProps.id);
      expect(results[0].suggestedType).toBe('EMPLOYMENT');
      expect(results[0].similarity).toBe(0.95);

      // Check that neo4j was called correctly
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('should generate missing embeddings if requested', async () => {
      const entityId = 'source-2';
      const sourceProps = {
        id: entityId,
        label: 'Source No Embedding',
        type: 'Person',
        text: 'Some text content'
      };

      const newEmbedding = [0.5, 0.5];

      // 1. Fetch Source (no embedding)
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key) => ({ properties: sourceProps })
        }]
      });

      // 2. Mock generation and storage
      mockEmbeddingServiceInstance.generateEmbedding.mockResolvedValue(newEmbedding);

      // 3. Mock store embedding query
      mockRun.mockResolvedValueOnce({});

      // 4. Fetch Candidates (return empty for simplicity)
      mockRun.mockResolvedValueOnce({ records: [] });

      await service.predictRelationships(entityId);

      expect(mockEmbeddingServiceInstance.generateEmbedding).toHaveBeenCalledWith({
        text: expect.stringContaining('Some text content')
      });

      // Verify update query
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('SET e.embedding = $embedding'),
        expect.objectContaining({ id: entityId, embedding: newEmbedding })
      );
    });
  });
});
