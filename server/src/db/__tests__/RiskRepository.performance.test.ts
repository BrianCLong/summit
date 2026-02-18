
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository Performance', () => {
  let repository: RiskRepository;

  beforeEach(() => {
    repository = new RiskRepository();
    jest.clearAllMocks();
  });

  it('should use batched insertion for signals', async () => {
    const input = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 0.8,
      level: 'high' as any,
      window: '24h' as any,
      modelVersion: '1.0.0',
      signals: [
        { type: 'login', value: 1, weight: 0.5, contributionScore: 0.4 },
        { type: 'ip_change', value: 1, weight: 0.3, contributionScore: 0.24 },
        { type: 'location', value: 1, weight: 0.2, contributionScore: 0.16 },
      ],
    };

    const mockTx = {
      query: jest.fn()
        .mockResolvedValueOnce([{ id: 'score-1', ...input }]) // insert risk_score
        .mockResolvedValue([{ id: 'sig-id' }]), // batch insert signals
    };

    const transactionSpy = jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return cb(mockTx);
    });

    await repository.saveRiskScore(input);

    // Optimized behavior: 1 for score + 1 for batch signals = 2 calls
    // BOLT: This reduces round-trips from O(N) to O(1) for signals.
    expect(mockTx.query).toHaveBeenCalledTimes(2);

    // The second call should be a batch insert
    expect(mockTx.query.mock.calls[1][0]).toContain('INSERT INTO risk_signals');
    expect(mockTx.query.mock.calls[1][0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9');

    transactionSpy.mockRestore();
  });
});
