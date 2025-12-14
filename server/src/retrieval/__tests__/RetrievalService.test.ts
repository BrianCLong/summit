import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RetrievalService } from '../RetrievalService.js';
import { KnowledgeRepository } from '../KnowledgeRepository.js';
import { KnowledgeObject, RetrievalQuery } from '../types.js';
import { Pool } from 'pg';

// Mock KnowledgeRepository and EmbeddingService
jest.mock('../KnowledgeRepository.js');
jest.mock('../../services/EmbeddingService.js', () => {
  return jest.fn().mockImplementation(() => ({
    config: { provider: 'test', model: 'test-model' },
    generateEmbedding: jest.fn()
  }));
});

// Mock DB Pool
const mockPool = new Pool();

describe('RetrievalService', () => {
  let service: RetrievalService;
  let mockRepo: jest.Mocked<KnowledgeRepository>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize service (which mocks EmbeddingService inside)
    service = new RetrievalService(mockPool);

    // Manually mock the method on the instance
    (service as any).embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

    // Access the mocked repository instance
    // @ts-ignore
    mockRepo = service.repo;
  });

  describe('search', () => {
    it('should route semantic queries to searchVector', async () => {
      const query: RetrievalQuery = {
        tenantId: 'tenant-1',
        queryKind: 'semantic',
        queryText: 'test query'
      };

      // Mock repo response
      mockRepo.searchVector.mockResolvedValue([
        {
          object: { id: 'obj-1', title: 'Test' } as any,
          score: 0.9
        }
      ]);

      const result = await service.search(query);

      expect(result.items).toHaveLength(1);
      expect(mockRepo.searchVector).toHaveBeenCalled();
      expect(mockRepo.searchKeyword).not.toHaveBeenCalled();
    });

    it('should route keyword queries to searchKeyword', async () => {
      const query: RetrievalQuery = {
        tenantId: 'tenant-1',
        queryKind: 'keyword',
        queryText: 'test query'
      };

      mockRepo.searchKeyword.mockResolvedValue([
        {
          object: { id: 'obj-2', title: 'Test 2' } as any,
          score: 0.5
        }
      ]);

      const result = await service.search(query);

      expect(result.items).toHaveLength(1);
      expect(mockRepo.searchKeyword).toHaveBeenCalled();
      expect(mockRepo.searchVector).not.toHaveBeenCalled();
    });
  });

  describe('indexObject', () => {
    it('should upsert object and generate embedding if body exists', async () => {
      const obj: KnowledgeObject = {
        id: 'obj-1',
        tenantId: 'tenant-1',
        kind: 'document',
        title: 'Test Doc',
        body: 'This is a test document.',
        metadata: {},
        source: {},
        timestamps: { createdAt: new Date().toISOString() }
      } as any;

      await service.indexObject(obj);

      expect(mockRepo.upsertKnowledgeObject).toHaveBeenCalledWith(obj);
      // We expect upsertEmbedding to be called because body is present
      expect(mockRepo.upsertEmbedding).toHaveBeenCalled();
    });

    it('should not generate embedding if body is empty', async () => {
      const obj: KnowledgeObject = {
        id: 'obj-1',
        tenantId: 'tenant-1',
        kind: 'graph_entity',
        title: 'Entity',
        metadata: {},
        source: {},
        timestamps: { createdAt: new Date().toISOString() }
      } as any;

      await service.indexObject(obj);

      expect(mockRepo.upsertKnowledgeObject).toHaveBeenCalledWith(obj);
      expect(mockRepo.upsertEmbedding).not.toHaveBeenCalled();
    });
  });
});
