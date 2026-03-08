import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EntityResolutionService } from '../src/services/EntityResolutionService';
import { ConflictResolutionService, ConflictResolutionStrategy } from '../src/services/ConflictResolutionService';
import { resolveEntities } from '../src/services/HybridEntityResolutionService';

// Mock dependencies
jest.mock('../src/services/HybridEntityResolutionService', () => ({
  resolveEntities: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn()
  })),
  getNeo4jDriver: jest.fn()
}));

// Mock Metrics
jest.mock('prom-client', () => ({
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn()
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn()
  })),
  Registry: jest.fn(),
  collectDefaultMetrics: jest.fn()
}));

describe('Entity Resolution & Deduplication System', () => {
  let erService: EntityResolutionService;
  let conflictResolver: ConflictResolutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    erService = new EntityResolutionService();
    conflictResolver = new ConflictResolutionService();
  });

  // TODO: Re-enable once resolveWithML method is implemented
  describe.skip('ML-based Similarity Scoring', () => {
    it('should correctly interpret high similarity from ML service', async () => {
      const mockEntityA = { name: 'John Doe', email: 'john@example.com' };
      const mockEntityB = { name: 'Jon Doe', email: 'john@example.com' };

      (resolveEntities as jest.Mock).mockResolvedValue({
        match: true,
        score: 0.95,
        explanation: { name: 0.9, email: 1.0 },
        confidence: 'high'
      });

      const result = await (erService as any).resolveWithML(mockEntityA, mockEntityB);

      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.confidence).toBe('high');
      expect(resolveEntities).toHaveBeenCalledWith(
        JSON.stringify(mockEntityA),
        JSON.stringify(mockEntityB)
      );
    });

    it('should correctly interpret low similarity', async () => {
      const mockEntityA = { name: 'John Doe' };
      const mockEntityB = { name: 'Alice Smith' };

      (resolveEntities as jest.Mock).mockResolvedValue({
        match: false,
        score: 0.1,
        explanation: { name: 0.1 },
        confidence: 'low'
      });

      const result = await (erService as any).resolveWithML(mockEntityA, mockEntityB);

      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe('low');
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using LATEST_WINS strategy', () => {
      const target = {
        name: 'Old Name',
        email: 'test@example.com',
        updatedAt: '2023-01-01T00:00:00Z'
      };
      const source = {
        name: 'New Name',
        email: 'test@example.com', // Same email
        updatedAt: '2023-06-01T00:00:00Z'
      };

      const result = conflictResolver.resolveConflicts(
        target,
        source,
        ConflictResolutionStrategy.LATEST_WINS
      );

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('test@example.com');
    });

    it('should merge arrays regardless of strategy', () => {
        const target = { tags: ['tag1', 'tag2'] };
        const source = { tags: ['tag2', 'tag3'] };

        const result = conflictResolver.resolveConflicts(
          target,
          source,
          ConflictResolutionStrategy.LATEST_WINS
        );

        expect(result.tags).toHaveLength(3);
        expect(result.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    });

    it('should prioritize Source A if Source B is older in LATEST_WINS', () => {
        const target = {
          title: 'Correct Title',
          updatedAt: '2023-12-01T00:00:00Z'
        };
        const source = {
          title: 'Old Title',
          updatedAt: '2023-01-01T00:00:00Z'
        };

        const result = conflictResolver.resolveConflicts(
          target,
          source,
          ConflictResolutionStrategy.LATEST_WINS
        );

        expect(result.title).toBe('Correct Title');
    });

    it('should use SOURCE_PRIORITY strategy', () => {
        const target = {
            status: 'active',
            source: 'twitter'
        };
        const source = {
            status: 'inactive',
            source: 'linkedin'
        };

        // Priority: linkedin > twitter
        const priority = ['linkedin', 'twitter'];

        const result = conflictResolver.resolveConflicts(
            target,
            source,
            ConflictResolutionStrategy.SOURCE_PRIORITY,
            priority
        );

        expect(result.status).toBe('inactive'); // LinkedIn wins
    });
  });
});
