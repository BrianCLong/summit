import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../RiskRepository.js';
import { pg } from '../../pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;
  const mockTx = {
    query: jest.fn() as any
  };

  beforeEach(() => {
    repo = new RiskRepository();
    jest.clearAllMocks();

    // Mock the transaction method on the pg object
    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    mockTx.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO risk_scores')) {
        return [{ id: 'score-123', tenant_id: params[0], entity_id: params[1], score: params[3], level: params[4], window: params[5], model_version: params[6], rationale: params[7], created_at: new Date() }];
      }
      if (sql.includes('INSERT INTO risk_signals')) {
        // Multi-row insert mock
        if (sql.includes('VALUES (, ')) {
           const numSignals = (params.length / 8);
           return Array.from({ length: numSignals }, (_, i) => ({
             id: `sig-${i}`,
             risk_score_id: 'score-123',
             type: params[i * 8 + 1],
             value: params[i * 8 + 3]
           }));
        }
      }
      return [];
    });
  });

  it('should save risk score and signals in batches', async () => {
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'high' as any,
      window: '24h' as any,
      modelVersion: 'v1',
      rationale: 'test',
      signals: Array.from({ length: 150 }, (_, i) => ({
        type: `s${i}`,
        value: i,
        weight: 0.1,
        contributionScore: 0.1
      }))
    };

    await repo.saveRiskScore(input);

    // 1 for score + 2 for 150 signals (chunk size 100)
    expect(mockTx.query).toHaveBeenCalledTimes(3);

    const calls = mockTx.query.mock.calls;
    expect(calls[0][0]).toContain('INSERT INTO risk_scores');
    expect(calls[1][0]).toContain('INSERT INTO risk_signals');
    expect(calls[1][1].length).toBe(100 * 8); // First batch
    expect(calls[2][0]).toContain('INSERT INTO risk_signals');
    expect(calls[2][1].length).toBe(50 * 8);  // Second batch
  });

  it('should fall back to individual inserts if batch fails', async () => {
    mockTx.query.mockImplementationOnce(async (sql, params) => {
       return [{ id: 'score-123', tenant_id: params[0], entity_id: params[1], score: params[3], level: params[4], window: params[5], model_version: params[6], rationale: params[7], created_at: new Date() }];
    }).mockImplementationOnce(async () => {
       throw new Error('Batch failure');
    }).mockImplementation(async (sql, params) => {
       return [{ id: 'sig-fallback', risk_score_id: 'score-123', type: params[1] }];
    });

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'high' as any,
      window: '24h' as any,
      modelVersion: 'v1',
      signals: [
        { type: 's1', value: 1, weight: 0.1, contributionScore: 0.1 },
        { type: 's2', value: 2, weight: 0.1, contributionScore: 0.1 }
      ]
    };

    await repo.saveRiskScore(input);

    // 1 (score) + 1 (failed batch) + 2 (fallbacks) = 4
    expect(mockTx.query).toHaveBeenCalledTimes(4);
  });
});
