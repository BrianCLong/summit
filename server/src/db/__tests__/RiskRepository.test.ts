
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../../db/pg.js';

describe('RiskRepository Performance', () => {
  let repo: RiskRepository;

  beforeEach(() => {
    repo = new RiskRepository();
    jest.restoreAllMocks();
  });

  it('should optimize signal insertion by batching queries', async () => {
    const queries: { sql: string; params: any[] }[] = [];

    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      const tx = {
        query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
          queries.push({ sql, params });
          if (sql.includes('INSERT INTO risk_scores')) {
            return [{ id: 'score-1', tenant_id: 't1', entity_id: 'e1', entity_type: 'Person', score: 0.5, level: 'medium', window: '24h', model_version: 'v1' }];
          }
          if (sql.includes('INSERT INTO risk_signals')) {
             // Return multiple rows if it's a batch insert
             if (sql.includes('), (')) {
               return [
                 { id: 'sig-1', risk_score_id: 'score-1', type: 'f1', value: 1, weight: 0.5, contribution_score: 0.5 },
                 { id: 'sig-2', risk_score_id: 'score-1', type: 'f2', value: 2, weight: 0.5, contribution_score: 1.0 },
                 { id: 'sig-3', risk_score_id: 'score-1', type: 'f3', value: 3, weight: 0.5, contribution_score: 1.5 }
               ];
             }
             return [{ id: 'sig-single' }];
          }
          return [];
        })
      };
      return await callback(tx);
    });

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.5,
      level: 'medium',
      window: '24h',
      modelVersion: 'v1',
      signals: [
        { type: 'f1', value: 1, weight: 0.5, contributionScore: 0.5 },
        { type: 'f2', value: 2, weight: 0.5, contributionScore: 1.0 },
        { type: 'f3', value: 3, weight: 0.5, contributionScore: 1.5 }
      ]
    };

    await repo.saveRiskScore(input as any);

    const signalQueries = queries.filter(q => q.sql.includes('INSERT INTO risk_signals'));

    // OPTIMIZED BEHAVIOR: 1 batch query for 3 signals
    expect(signalQueries.length).toBe(1);
    expect(signalQueries[0].sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16), ($17, $18, $19, $20, $21, $22, $23, $24)');
  });
});
