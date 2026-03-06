import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../../db/pg.js';

describe('RiskRepository', () => {
  let repository: RiskRepository;

  beforeEach(() => {
    repository = new RiskRepository();
    jest.clearAllMocks();
  });

  it('should batch signals in chunks of 100', async () => {
    // Mock pg.transaction to immediately execute the callback
    const mockTx = {
      query: jest.fn().mockResolvedValue([{ id: 'test-score-id' }]),
    };
    const transactionSpy = jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });

    const signals = Array.from({ length: 250 }, (_, i) => ({
      type: 'test',
      source: 'test',
      value: 1,
      weight: 1,
      contributionScore: 1,
      description: `signal ${i}`,
    }));

    await repository.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'user',
      score: 50,
      level: 'medium',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals,
    });

    // 1 for the score insert, then 3 for signals (100 + 100 + 50)
    expect(mockTx.query).toHaveBeenCalledTimes(4);

    // Verify first signal batch
    expect(mockTx.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO risk_signals'),
      expect.arrayContaining([signals[0].description])
    );

    transactionSpy.mockRestore();
  });
});
