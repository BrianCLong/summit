
import { jest } from '@jest/globals';
import { pg } from '../pg.js';
import { RiskRepository } from '../repositories/RiskRepository.js';

describe('RiskRepository Performance Verification', () => {
  let repo: RiskRepository;
  let mockTx: any;

  beforeEach(() => {
    repo = new RiskRepository();
    mockTx = {
      query: jest.fn(async () => [{ id: 'new-score-id' }]),
    };

    jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => cb(mockTx));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use batched inserts for risk signals (optimized)', async () => {
    const signalCount = 50;
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'High' as any,
      window: '24h',
      modelVersion: 'v1',
      rationale: 'test',
      signals: Array.from({ length: signalCount }, (_, i) => ({
        type: `feature_${i}`,
        source: 'test',
        value: 1.0,
        weight: 0.1,
        contributionScore: 0.1,
        description: 'test'
      }))
    };

    await repo.saveRiskScore(input);

    // 1 for risk_scores insert
    // + 1 for the single batch of 50 signals (batch size 100)
    expect(mockTx.query).toHaveBeenCalledTimes(2);

    const batchCall = mockTx.query.mock.calls.find((call: any) =>
      call[0].includes('INSERT INTO risk_signals') && call[0].includes('VALUES ($1, $2')
    );
    expect(batchCall).toBeDefined();
    expect(batchCall[1].length).toBe(signalCount * 8);
  });

  it('should chunk signals into batches of 100', async () => {
    const signalCount = 150;
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'High' as any,
      window: '24h',
      modelVersion: 'v1',
      rationale: 'test',
      signals: Array.from({ length: signalCount }, (_, i) => ({
        type: `feature_${i}`,
        source: 'test',
        value: 1.0,
        weight: 0.1,
        contributionScore: 0.1,
        description: 'test'
      }))
    };

    await repo.saveRiskScore(input);

    // 1 for risk_scores
    // + 2 for signals (100 + 50)
    expect(mockTx.query).toHaveBeenCalledTimes(3);
  });

  it('should fall back to individual inserts if batch fails', async () => {
    const signalCount = 5;
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.8,
      level: 'High' as any,
      window: '24h',
      modelVersion: 'v1',
      rationale: 'test',
      signals: Array.from({ length: signalCount }, (_, i) => ({
        type: `feature_${i}`,
        source: 'test',
        value: 1.0,
        weight: 0.1,
        contributionScore: 0.1,
        description: 'test'
      }))
    };

    mockTx.query
      .mockResolvedValueOnce([{ id: 'score-id' }]) // risk_scores
      .mockRejectedValueOnce(new Error('Batch failure')) // batch signals
      .mockResolvedValue([{ id: 'sig-id' }]); // individual fallback

    await repo.saveRiskScore(input);

    // 1 (score) + 1 (failed batch) + 5 (fallback individual) = 7
    expect(mockTx.query).toHaveBeenCalledTimes(1 + 1 + signalCount);

    // Verify individual calls were made for risk_signals
    const individualSignalCalls = mockTx.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals') &&
      call[0].includes('VALUES ($1, $2, $3, $4, $5, $6, $7, $8)') &&
      !call[0].includes('), (')
    );
    expect(individualSignalCalls.length).toBe(signalCount);
  });
});
