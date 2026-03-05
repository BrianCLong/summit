
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;
  let mockTx: {
    query: jest.MockedFunction<(sql: string, values?: any[]) => Promise<any>>;
  };

  beforeEach(() => {
    repo = new RiskRepository();
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, values?: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{
            id: 'score-1',
            tenant_id: 't1',
            entity_id: 'e1',
            entity_type: 'user',
            score: 80,
            level: 'high',
            window: '24h',
            model_version: '1.0.0',
            rationale: 'test',
            created_at: new Date(),
          }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          // Mock returning multiple rows for batch insert
          if (sql.includes('VALUES') && sql.includes('), (')) {
             // Extract number of placeholders to estimate rows
             const rowCount = (sql.match(/\(/g) || []).length - 1; // -1 for INSERT INTO part if it has parens, but here it doesn't
             return Array.from({ length: rowCount }, (_, i) => ({
                id: `sig-${i}`,
                risk_score_id: 'score-1',
                type: 'test',
                source: 'test',
                value: 0,
                weight: 0,
                contribution_score: 0,
                description: 'test',
                detected_at: new Date()
             }));
          }
          return [{
            id: 'sig-1',
            risk_score_id: 'score-1',
            type: 'test',
            source: 'test',
            value: 0,
            weight: 0,
            contribution_score: 0,
            description: 'test',
            detected_at: new Date()
          }];
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });
    jest.clearAllMocks();
  });

  it('inserts signals in batches (optimized)', async () => {
    const signalCount = 150;
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'user',
      score: 80,
      level: 'high' as const,
      window: '24h' as const,
      modelVersion: '1.0.0',
      rationale: 'test',
      signals: Array.from({ length: signalCount }, (_, i) => ({
        type: 'login',
        source: 'auth',
        value: i,
        weight: 1,
        contributionScore: i,
        description: `sig ${i}`,
      })),
    };

    await repo.saveRiskScore(input);

    // One for the score, plus TWO for 150 signals (batch size 100)
    const totalExpectedQueries = 1 + 2;
    expect(mockTx.query).toHaveBeenCalledTimes(totalExpectedQueries);

    const signalInserts = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );
    expect(signalInserts.length).toBe(2);

    // Check first batch size
    expect(signalInserts[0][1].length).toBe(100 * 8); // 8 parameters per signal
    // Check second batch size
    expect(signalInserts[1][1].length).toBe(50 * 8);
  });
});
