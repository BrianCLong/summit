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
          return [{
            id: 'score-123',
            tenant_id: params[0],
            entity_id: params[1],
            entity_type: params[2],
            score: params[3],
            level: params[4],
            window: params[5],
            model_version: params[6],
            rationale: params[7],
            created_at: new Date(),
          }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          // If it's a batch insert (contains multiple VALUES placeholders)
          if (sql.includes('), ($')) {
            // Determine number of rows based on placeholders
            const rowMatches = sql.match(/\(\$\d+[^)]*\)/g);
            const numRows = rowMatches ? rowMatches.length : 1;

            return Array.from({ length: numRows }, (_, i) => ({
              id: `sig-batch-${i}`,
              risk_score_id: params[i * 8],
              type: params[i * 8 + 1],
              source: params[i * 8 + 2],
              value: params[i * 8 + 3],
              weight: params[i * 8 + 4],
              contribution_score: params[i * 8 + 5],
              description: params[i * 8 + 6],
              detected_at: params[i * 8 + 7] || new Date(),
            }));
          }

          // Individual insert
          return [{
            id: 'sig-123',
            risk_score_id: params[0],
            type: params[1],
            source: params[2],
            value: params[3],
            weight: params[4],
            contribution_score: params[5],
            description: params[6],
            detected_at: params[7] || new Date(),
          }];
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

  it('should save risk score and signals in a single batch (optimized behavior)', async () => {
    const signals = Array.from({ length: 50 }, (_, i) => ({
      type: `type-${i}`,
      value: i,
      weight: 0.1,
      contributionScore: i * 0.1,
      description: `desc-${i}`
    }));

    const input: any = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 75,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'High risk detected',
      signals,
    };

    await repository.saveRiskScore(input);

    // 1 for risk_scores, 1 for risk_signals (since 50 < 100 chunkSize)
    expect(mockTx.query).toHaveBeenCalledTimes(2);

    // Verify first call is for risk_scores
    expect(mockTx.query.mock.calls[0][0]).toContain('INSERT INTO risk_scores');

    // Verify second call is for risk_signals batch
    const batchCall = mockTx.query.mock.calls[1];
    expect(batchCall[0]).toContain('INSERT INTO risk_signals');
    expect(batchCall[0]).toContain('VALUES ($1, $2');
    expect(batchCall[0]).toContain('), ($9, $10'); // Verifies multiple value sets
    expect(batchCall[1].length).toBe(50 * 8); // 50 signals * 8 params each
  });

  it('should chunk signals into multiple batches if they exceed chunkSize', async () => {
    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: `type-${i}`,
      value: i,
      weight: 0.1,
      contributionScore: i * 0.1,
      description: `desc-${i}`
    }));

    const input: any = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 75,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'High risk detected',
      signals,
    };

    await repository.saveRiskScore(input);

    // 1 for risk_scores, 2 for risk_signals (chunkSize 100)
    expect(mockTx.query).toHaveBeenCalledTimes(3);

    // Verify first batch (100 signals)
    expect(mockTx.query.mock.calls[1][1].length).toBe(100 * 8);
    // Verify second batch (50 signals)
    expect(mockTx.query.mock.calls[2][1].length).toBe(50 * 8);
  });

});
