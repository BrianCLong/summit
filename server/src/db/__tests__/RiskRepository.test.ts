
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository', () => {
  let repository: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    repository = new RiskRepository();
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{ id: 'score-1', tenant_id: 't1', entity_id: 'e1', score: 0.8 }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          // Return as many rows as were inserted if it's a batch, or just one
          const rowsCount = sql.includes('VALUES') && sql.includes('), (')
            ? params.length / 8
            : 1;
          return Array.from({ length: rowsCount }, (_, i) => ({ id: `sig-${i}` }));
        }
        return [];
      })
    };

    // Mock pg.transaction to execute the callback with our mockTx
    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    jest.clearAllMocks();
  });

  it('should save risk score and signals in batches (optimized behavior)', async () => {
    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: `type-${i}`,
      source: 'test',
      value: 1,
      weight: 0.1,
      contributionScore: 0.1,
      description: `desc-${i}`
    }));

    const input: any = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'high',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals
    };

    await repository.saveRiskScore(input);

    // Optimized: 1 (score) + 2 (signal batches: 100 + 50) = 3 calls
    expect(mockTx.query).toHaveBeenCalledTimes(3);

    // Verify first signal batch has 100 rows (100 * 8 params)
    const firstBatch = mockTx.query.mock.calls.find((call: any) =>
      call[0].includes('INSERT INTO risk_signals') && call[1].length === 800
    );
    expect(firstBatch).toBeDefined();

    // Verify second signal batch has 50 rows (50 * 8 params)
    const secondBatch = mockTx.query.mock.calls.find((call: any) =>
      call[0].includes('INSERT INTO risk_signals') && call[1].length === 400
    );
    expect(secondBatch).toBeDefined();
  });
});
