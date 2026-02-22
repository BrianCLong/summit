
import { jest } from '@jest/globals';
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
          return [{ id: 'score-123', tenant_id: params[0], entity_id: params[1], score: params[3] }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          return [{ id: 'sig-123', risk_score_id: 'score-123', type: params[1], value: params[3] }];
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save risk score and signals', async () => {
    const input: any = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 75,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'Test rationale',
      signals: [
        { type: 'login_fail', source: 'auth', value: 10, weight: 1, contributionScore: 10, description: 'desc 1' },
        { type: 'geo_anomaly', source: 'login', value: 20, weight: 1, contributionScore: 20, description: 'desc 2' },
      ],
    };

    await repository.saveRiskScore(input);

    // Verify risk score insert
    expect(mockTx.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO risk_scores'),
      expect.any(Array)
    );

    // Verify risk signals inserts
    // Now it should be called ONCE due to batched optimization
    const signalCalls = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    expect(signalCalls.length).toBe(1);
    // Verify the query contains multiple placeholders
    expect(signalCalls[0][0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)');
    // Verify values array length
    expect(signalCalls[0][1].length).toBe(16);
  });

  it('should handle chunking for large number of signals', async () => {
    const input: any = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 75,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'Test rationale',
      signals: Array.from({ length: 150 }, (_, i) => ({
        type: `sig_${i}`,
        value: i,
        weight: 1,
        contributionScore: i,
      })),
    };

    await repository.saveRiskScore(input);

    const signalCalls = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    // Chunk size is 100, so 150 signals should result in 2 calls
    expect(signalCalls.length).toBe(2);
    expect(signalCalls[0][1].length).toBe(100 * 8);
    expect(signalCalls[1][1].length).toBe(50 * 8);
  });
});
