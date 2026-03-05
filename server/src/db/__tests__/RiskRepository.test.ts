import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ESM mocking
jest.unstable_mockModule('../pg.js', () => ({
  pg: {
    transaction: jest.fn(),
    oneOrNone: jest.fn(),
    readMany: jest.fn(),
    many: jest.fn(),
  },
}));

const { RiskRepository } = await import('../repositories/RiskRepository.js');
const { pg } = await import('../pg.js');

describe('RiskRepository', () => {
  let repository: RiskRepository;

  beforeEach(() => {
    repository = new RiskRepository();
    jest.clearAllMocks();
  });

  describe('saveRiskScore', () => {
    it('should insert signals in batches (verifying improvement)', async () => {
      const mockTx = {
        query: jest.fn(),
      };

      (pg.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      // Mock score insert
      mockTx.query.mockResolvedValueOnce([{
        id: 'score-1',
        tenant_id: 't1',
        entity_id: 'e1',
        entity_type: 'person',
        score: '10',
        level: 'low',
        window: '24h',
        model_version: '1.0',
        rationale: 'test',
        created_at: new Date()
      }]);

      // Mock signal inserts (return a mock signal for each input row to avoid mapping errors)
      mockTx.query.mockImplementation(async (query: string, params?: any[]) => {
        if (query.includes('INSERT INTO risk_signals')) {
          // If it's the old single insert
          if (!query.includes('VALUES ($1, $2, $3, $4, $5, $6, $7, $8),')) {
             return [{
              id: 'sig-id',
              risk_score_id: 'score-1',
              type: 'test',
              source: 'test',
              value: '1',
              weight: '1',
              contribution_score: '1',
              description: 'test',
              detected_at: new Date()
            }];
          }
          // If it's a batch insert (simplified mock)
          return [{
            id: 'sig-id',
            risk_score_id: 'score-1',
            type: 'test',
            source: 'test',
            value: '1',
            weight: '1',
            contribution_score: '1',
            description: 'test',
            detected_at: new Date()
          }];
        }
        return [];
      });

      const signals = Array(150).fill(null).map((_, i) => ({
        type: 'test',
        source: 'test',
        value: 1,
        weight: 1,
        contributionScore: 1,
        description: `sig ${i}`,
        detectedAt: new Date(),
      }));

      await repository.saveRiskScore({
        tenantId: 't1',
        entityId: 'e1',
        entityType: 'person',
        score: 10,
        level: 'low',
        window: '24h',
        modelVersion: '1.0',
        rationale: 'test',
        signals,
      });

      const calls = (mockTx.query as jest.Mock).mock.calls;
      const insertSignalsCalls = calls.filter(call => (call[0] as string).includes('INSERT INTO risk_signals'));

      // Before optimization, this would be 150. After, it should be 2.
      // We expect 2 batches for 150 signals with chunk size 100.
      expect(insertSignalsCalls.length).toBe(2);
      expect(mockTx.query).toHaveBeenCalledTimes(3);
    });
  });
});
