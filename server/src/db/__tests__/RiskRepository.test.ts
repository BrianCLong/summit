
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository', () => {
  let repository: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new RiskRepository();

    // Spy on pg.transaction
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{ id: 'score-123', tenant_id: 't1', entity_id: 'e1', entity_type: 'Person', score: 0.8, level: 'High', window: '24h', model_version: 'v1', rationale: 'Test', created_at: new Date() }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
           // Handle batch inserts
           const count = (sql.match(/\(\$/g) || []).length / 8;
           return Array.from({ length: count }, (_, i) => ({
             id: `sig-${i}`,
             risk_score_id: 'score-123',
             type: 'type',
             source: 'src',
             value: 1,
             weight: 0.5,
             contribution_score: 0.4,
             description: 'desc',
             detected_at: new Date()
           }));
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });
  });

  it('should insert risk signals in batches (optimized behavior)', async () => {
    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: `s${i}`, source: 'src', value: 1, weight: 0.5, contributionScore: 0.4, description: `d${i}`
    }));

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'High',
      window: '24h',
      modelVersion: 'v1',
      rationale: 'Test',
      signals,
    };

    await repository.saveRiskScore(input as any);

    // Verify risk signals inserts - should be batched
    const batchCalls = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    // With 150 signals and chunk size 100, we expect 2 batch calls (100 + 50)
    expect(batchCalls.length).toBe(2);
    expect(batchCalls[0][1].length).toBe(100 * 8);
    expect(batchCalls[1][1].length).toBe(50 * 8);
  });

  it('should propagate errors from batched insert', async () => {
    const signals = [{ type: 's1', source: 'src', value: 1, weight: 0.5, contributionScore: 0.4, description: 'd1' }];
    const input = {
      tenantId: 't1', entityId: 'e1', entityType: 'Person', score: 0.8, level: 'High', window: '24h', modelVersion: 'v1', rationale: 'Test', signals,
    };

    // Mock failure
    mockTx.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO risk_signals')) {
        throw new Error('Database error');
      }
      return [{ id: 'score-123' }];
    });

    await expect(repository.saveRiskScore(input as any)).rejects.toThrow('Database error');
  });
});
