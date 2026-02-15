import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository Performance', () => {
  let repository: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    repository = new RiskRepository();
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{ id: 'score-123', tenant_id: 't1' }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          return [{ id: 'sig-123', risk_score_id: 'score-123', value: 0.5, weight: 0.5, contribution_score: 0.25 }];
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should measure the number of queries for saveRiskScore with many signals', async () => {
    const signalCount = 150;
    const signals = Array.from({ length: signalCount }, (_, i) => ({
      type: `test-signal-${i}`,
      source: 'test',
      value: 0.1,
      weight: 0.2,
      contributionScore: 0.02,
      description: `Signal ${i}`,
    }));

    await repository.saveRiskScore({
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 0.5,
      level: 'medium',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'Test rationale',
      signals,
    });

    const signalInsertCalls = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    // After optimization, it should be 2 queries for 150 signals (chunk size 100).
    expect(signalInsertCalls.length).toBe(2);
  });
});
