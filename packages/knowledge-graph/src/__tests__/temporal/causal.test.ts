import { Driver } from 'neo4j-driver';
import { CausalIntelligenceEngine } from '../../temporal/causal/CausalIntelligenceEngine';

// Mock driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
} as unknown as Driver;

describe('CausalIntelligenceEngine', () => {
  let engine: CausalIntelligenceEngine;

  beforeEach(() => {
    engine = new CausalIntelligenceEngine(mockDriver);
    jest.clearAllMocks();
  });

  describe('buildCausalRelationship', () => {
    it('should create a causal relationship with correct properties', async () => {
      mockSession.run.mockResolvedValueOnce({});

      const result = await engine.buildCausalRelationship(
        'node1',
        'node2',
        'DIRECT',
        0.9,
        1000,
        { reason: 'test' },
        ['doc1']
      );

      expect(result.sourceId).toBe('node1');
      expect(result.targetId).toBe('node2');
      expect(result.causeType).toBe('DIRECT');
      expect(result.confidence).toBe(0.9);
      expect(mockSession.run).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateIntelligenceScore', () => {
    it('should calculate correct composite score with recency decay', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Node created 30 days ago (half-life)
      const score = engine.calculateIntelligenceScore(
        thirtyDaysAgo.toISOString(),
        now.toISOString(),
        0.8, // confidence
        0.9  // relevance
      );

      // Recency should be ~0.5
      expect(score.recency).toBeCloseTo(0.5, 1);

      // Composite: (0.9 * 0.4) + (0.8 * 0.4) + (0.5 * 0.2) = 0.36 + 0.32 + 0.1 = 0.78
      expect(score.compositeScore).toBeCloseTo(0.78, 1);
    });
  });
});
