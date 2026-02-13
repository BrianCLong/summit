import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../../db/pg.js';

describe('RiskRepository', () => {
  let repository: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    repository = new RiskRepository();
    mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{ id: 'score-1' }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          // Return as many rows as placeholders to simulate successful multi-row insert
          const placeholderCount = (sql.match(/\$/g) || []).length;
          const rowCount = placeholderCount / 8;
          return Array(rowCount).fill({
            id: 'sig-id',
            risk_score_id: 'score-1',
            type: 'test',
            source: 'test',
            value: 0.5,
            weight: 1.0,
            contribution_score: 0.5,
            description: 'test',
            detected_at: new Date()
          });
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

  it('should batch signals in chunks of 100', async () => {
    const signals = Array.from({ length: 250 }, (_, i) => ({
      type: `type-${i}`,
      source: 'test',
      value: 0.1,
      weight: 0.2,
      contributionScore: 0.02,
      description: `desc-${i}`,
    }));

    await repository.saveRiskScore({
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 0.5,
      level: 'medium',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals,
    });

    // 1 query for score, 3 queries for signals (100 + 100 + 50)
    expect(mockTx.query).toHaveBeenCalledTimes(4);

    // Verify first batch
    expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('VALUES ($1, $2'), expect.any(Array));
    expect(mockTx.query.mock.calls[1][1]).toHaveLength(800);
    // Verify last batch
    expect(mockTx.query).toHaveBeenNthCalledWith(4, expect.stringContaining('VALUES ($1, $2'), expect.any(Array));
    expect(mockTx.query.mock.calls[3][1]).toHaveLength(400);
  });
});
