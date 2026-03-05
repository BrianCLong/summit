import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../pg.js', () => ({
  pg: {
    transaction: jest.fn(),
    oneOrNone: jest.fn(),
    readMany: jest.fn(),
  },
}));

const { pg } = await import('../pg.js');
const { RiskRepository } = await import('../repositories/RiskRepository.js');

describe('RiskRepository', () => {
  let repository: any;
  let mockTx: any;

  beforeEach(() => {
    repository = new RiskRepository();
    mockTx = {
      query: jest.fn(),
    };
    (pg.transaction as any).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });
  });

  it('should verify batched insertion behavior for signals', async () => {
    const signals = [
      { type: 'type1', source: 'src1', value: 1, weight: 0.5, contributionScore: 0.5, description: 'desc1' },
      { type: 'type2', source: 'src2', value: 2, weight: 0.6, contributionScore: 1.2, description: 'desc2' },
    ];

    mockTx.query
      .mockResolvedValueOnce([{ id: 'score-123', tenant_id: 't1' }]) // Risk score insert
      .mockResolvedValueOnce([{ id: 'sig-1' }, { id: 'sig-2' }]); // Batched signals insert

    await repository.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 80,
      level: 'high',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals,
    });

    // NOW it should be 1 query for the score + 1 query for ALL signals = 2 total
    expect(mockTx.query).toHaveBeenCalledTimes(2);

    // First call is for the score
    expect(mockTx.query).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO risk_scores'), expect.any(Array));

    // Second call is for the batched signals
    expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO risk_signals'), expect.any(Array));
    // Verify placeholders
    expect(mockTx.query).toHaveBeenNthCalledWith(2, expect.stringContaining('($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)'), expect.any(Array));

    // Verify parameters count (2 signals * 8 params = 16)
    const params = mockTx.query.mock.calls[1][1];
    expect(params).toHaveLength(16);
  });

  it('should verify chunking behavior for many signals', async () => {
    const signals = [];
    for (let i = 0; i < 150; i++) {
      signals.push({
        type: `type${i}`,
        source: 'src',
        value: i,
        weight: 0.1,
        contributionScore: 0.1,
        description: `desc${i}`
      });
    }

    mockTx.query
      .mockResolvedValueOnce([{ id: 'score-123', tenant_id: 't1' }]) // Risk score insert
      .mockResolvedValueOnce(new Array(100).fill({ id: 'sig' })) // First batch (100)
      .mockResolvedValueOnce(new Array(50).fill({ id: 'sig' })); // Second batch (50)

    await repository.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'Person',
      score: 80,
      level: 'high',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals,
    });

    // 1 (score) + 2 (batches of signals) = 3 total queries
    expect(mockTx.query).toHaveBeenCalledTimes(3);

    // Verify first batch size
    expect(mockTx.query.mock.calls[1][1]).toHaveLength(800);
    // Verify second batch size
    expect(mockTx.query.mock.calls[2][1]).toHaveLength(400);
  });
});
