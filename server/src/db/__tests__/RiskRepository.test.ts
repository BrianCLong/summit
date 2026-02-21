
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';
import { RiskScoreInput } from '../../risk/types.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;

  beforeEach(() => {
    repo = new RiskRepository();
    jest.clearAllMocks();
  });

  it('should save risk score and signals in batches', async () => {
    const signalCount = 150;
    const input: RiskScoreInput = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 75,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'Test rationale',
      signals: Array.from({ length: signalCount }, (_, i) => ({
        type: `signal-${i}`,
        source: 'test',
        value: 0.5,
        weight: 1.0,
        contributionScore: 0.5,
        description: `Signal ${i}`,
      })),
    };

    // Mock pg.transaction to provide a mock tx
    const mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{
            id: 'score-1',
            tenant_id: 'tenant-1',
            entity_id: 'entity-1',
            entity_type: 'user',
            score: '75',
            level: 'high',
            window: '24h',
            model_version: '1.0.0',
            rationale: 'Test rationale',
            created_at: new Date()
          }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          const paramsPerSignal = 8;
          const rowCount = params.length / paramsPerSignal;
          return Array.from({ length: rowCount }, (_, i) => ({
            id: `sig-${i}`,
            risk_score_id: 'score-1',
            type: 'test',
            source: 'test',
            value: '0.5',
            weight: '1.0',
            contribution_score: '0.5',
            description: 'test',
            detected_at: new Date(),
          }));
        }
        return [];
      }),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    const result = await repo.saveRiskScore(input);

    expect(result.id).toBe('score-1');

    const queryCalls = mockTx.query.mock.calls;
    const signalInserts = queryCalls.filter((call: any) => call[0].includes('INSERT INTO risk_signals'));

    // BOLT: We expect exactly 2 batched inserts for 150 signals with a chunkSize of 100.
    // If it's still using a loop, this will be 150 and the test will fail.
    expect(signalInserts.length).toBe(2);

    // Verify the first batch has the correct number of parameters
    if (signalInserts.length > 0) {
      expect(signalInserts[0][1].length).toBe(100 * 8);
    }
  });
});
