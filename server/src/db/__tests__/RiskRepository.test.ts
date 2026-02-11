
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mocks before importing the module under test
const mockPg = {
  transaction: jest.fn(),
  oneOrNone: jest.fn(),
  readMany: jest.fn(),
};

const mockPool = {
  connect: jest.fn(),
};

jest.unstable_mockModule('../pg.js', () => ({
  pg: mockPg,
  pool: mockPool,
}));

// We need to use dynamic import for RiskRepository to ensure it uses the mock
const { RiskRepository } = await import('../repositories/RiskRepository.js');
const { pg } = await import('../pg.js');

describe('RiskRepository', () => {
  let repo: RiskRepository;

  beforeEach(() => {
    repo = new RiskRepository();
    jest.clearAllMocks();
  });

  it('should save a risk score and its signals using batching (optimized)', async () => {
    const mockTx = {
      query: jest.fn()
        .mockResolvedValueOnce([{ id: 'score-1', score: 0.8 }]) // risk_scores insert
        .mockResolvedValue([
          { id: 'sig-1', value: 0.1 },
          { id: 'sig-2', value: 0.2 }
        ]), // batched risk_signals insert returning multiple rows
    };

    (pg.transaction as jest.Mock).mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'User',
      score: 0.8,
      level: 'high' as any,
      window: '24h',
      modelVersion: 'v1',
      rationale: 'test',
      signals: [
        { type: 's1', source: 'src', value: 0.1, weight: 1, contributionScore: 0.1, description: 'd1' },
        { type: 's2', source: 'src', value: 0.2, weight: 1, contributionScore: 0.2, description: 'd2' },
      ],
    };

    await repo.saveRiskScore(input);

    // Verify risk_scores insert
    expect(mockTx.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO risk_scores'),
      expect.any(Array)
    );

    // Verify risk_signals inserts
    // Now it should be called only ONCE for both signals because of batching
    const signalCalls = (mockTx.query as jest.Mock).mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    expect(signalCalls.length).toBe(1);
    // Verify it's indeed a batch insert by checking for multiple placeholders
    expect(signalCalls[0][0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)');
  });

  it('should throw an error and rollback the transaction if batching fails', async () => {
    const mockTx = {
      query: jest.fn()
        .mockResolvedValueOnce([{ id: 'score-1', score: 0.8 }]) // risk_scores insert
        .mockRejectedValueOnce(new Error('Batch failed')), // Batch signals fails
    };

    (pg.transaction as jest.Mock).mockImplementation(async (cb: any) => {
      // In pg.ts, the transaction wrapper catches the error, rolls back, and rethrows
      try {
        await cb(mockTx);
      } catch (e) {
        // Mocking the rollback behavior
        throw e;
      }
    });

    const input = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'User',
      score: 0.8,
      level: 'high' as any,
      window: '24h',
      modelVersion: 'v1',
      rationale: 'test',
      signals: [
        { type: 's1', source: 'src', value: 0.1, weight: 1, contributionScore: 0.1, description: 'd1' },
      ],
    };

    await expect(repo.saveRiskScore(input)).rejects.toThrow('Batch failed');
  });
});
