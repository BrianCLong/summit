import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../RiskRepository.js';
import { pg } from '../../pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;

  beforeEach(() => {
    repo = new RiskRepository();
    jest.clearAllMocks();
  });

  it('should use batched insert for signals', async () => {
    const txMock = {
        query: jest.fn() as any
    };

    const transactionSpy = jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
        return await cb(txMock);
    });

    txMock.query
      .mockResolvedValueOnce([{ id: 'score-1' }]) // insert risk_scores
      .mockResolvedValueOnce([
          { id: 'sig-1', risk_score_id: 'score-1', type: 's1', value: '1', weight: '0.5', contribution_score: '0.5', source: 'src', description: 'd1', detected_at: new Date() },
          { id: 'sig-2', risk_score_id: 'score-1', type: 's2', value: '2', weight: '0.5', contribution_score: '1.0', source: 'src', description: 'd2', detected_at: new Date() }
      ]); // insert risk_signals (batch)

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.5,
      level: 'medium' as any,
      window: '24h' as any,
      modelVersion: '1',
      signals: [
        { type: 's1', value: 1, weight: 0.5, contributionScore: 0.5 },
        { type: 's2', value: 2, weight: 0.5, contributionScore: 1.0 }
      ]
    };

    await repo.saveRiskScore(input);

    expect(transactionSpy).toHaveBeenCalled();
    expect(txMock.query).toHaveBeenCalledTimes(2);

    const calls = txMock.query.mock.calls as [string, any[]][];
    expect(calls[0][0]).toContain('INSERT INTO risk_scores');
    expect(calls[1][0]).toContain('INSERT INTO risk_signals');
    expect(calls[1][0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)');

    transactionSpy.mockRestore();
  });

  it('should propagate errors if batch fails', async () => {
    const txMock = {
        query: jest.fn() as any
    };

    const transactionSpy = jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
        return await cb(txMock);
    });

    txMock.query
      .mockResolvedValueOnce([{ id: 'score-1' }]) // insert risk_scores
      .mockRejectedValueOnce(new Error('Batch failed')); // batch signals fail

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 0.5,
      level: 'medium' as any,
      window: '24h' as any,
      modelVersion: '1',
      signals: [
        { type: 's1', value: 1, weight: 0.5, contributionScore: 0.5 },
        { type: 's2', value: 2, weight: 0.5, contributionScore: 1.0 }
      ]
    };

    await expect(repo.saveRiskScore(input)).rejects.toThrow('Batch failed');

    expect(txMock.query).toHaveBeenCalledTimes(2);

    transactionSpy.mockRestore();
  });
});
