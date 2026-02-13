
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../../db/pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    repo = new RiskRepository();
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{ id: 'score-1', tenant_id: 't1', entity_id: 'e1', score: 75 }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          const signalsInBatch = params.length / 8;
          return Array.from({ length: signalsInBatch }, (_, i) => ({
            id: `sig-${i}`,
            risk_score_id: 'score-1',
            type: 'test',
            value: 1,
            weight: 1,
            contribution_score: 1,
          }));
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });
  });

  it('should batch signals in chunks of 100', async () => {
    const signals = Array.from({ length: 250 }, (_, i) => ({
      type: `type_${i}`,
      source: 'test',
      value: i,
      weight: 1.0,
      contributionScore: i * 0.1,
      description: `Signal ${i}`,
    }));

    await repo.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 75.5,
      level: 'HIGH',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'test',
      signals,
    });

    // 1 query for score
    // 3 queries for signals (100 + 100 + 50)
    expect(mockTx.query).toHaveBeenCalledTimes(4);

    // Verify first batch
    expect(mockTx.query.mock.calls[1][0]).toContain('INSERT INTO risk_signals');
    expect(mockTx.query.mock.calls[1][1]).toHaveLength(800); // 100 signals * 8 params

    // Verify last batch
    expect(mockTx.query.mock.calls[3][0]).toContain('INSERT INTO risk_signals');
    expect(mockTx.query.mock.calls[3][1]).toHaveLength(400); // 50 signals * 8 params
  });
});
