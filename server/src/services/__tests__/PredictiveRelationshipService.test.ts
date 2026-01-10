import { jest, beforeAll } from '@jest/globals';

const mockRun = jest.fn<any>();
const mockClose = jest.fn<any>();
const mockSession = jest.fn<any>().mockReturnValue({
  run: mockRun,
  close: mockClose,
});
const mockDriver = {
  session: mockSession,
};

const mockEmbeddingServiceInstance = {
  generateEmbedding: jest.fn<any>(),
  cosineSimilarity: jest.fn<any>(),
};

const mockRelationshipServiceInstance = {
  suggestRelationshipTypes: jest.fn<any>(),
  setDriver: jest.fn<any>(),
};

let PredictiveRelationshipService: typeof import('../PredictiveRelationshipService.js').PredictiveRelationshipService;

beforeAll(async () => {
  const jestAny = jest as any;

  await jestAny.unstable_mockModule('../../config/database.js', () => ({
    getNeo4jDriver: jest.fn().mockReturnValue(mockDriver),
  }));

  await jestAny.unstable_mockModule('../EmbeddingService.js', () => ({
    default: jest.fn().mockImplementation(() => mockEmbeddingServiceInstance),
  }));

  ({ PredictiveRelationshipService } = await import('../PredictiveRelationshipService.js'));
});

describe('PredictiveRelationshipService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockReturnValue({
      run: mockRun,
      close: mockClose,
    });
    service = new PredictiveRelationshipService(
      mockEmbeddingServiceInstance as any,
      mockRelationshipServiceInstance as any,
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
          get: (key: string) => ({ properties: sourceProps })
        }]
      });

      // 2. Fetch Candidates
      mockRun.mockResolvedValueOnce({
        records: [{
          get: (key: string) => {
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
          get: (key: string) => ({ properties: sourceProps })
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
