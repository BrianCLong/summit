import { RiskRepository, RiskScore, RiskSignal } from '../repositories/RiskRepository';
import { Pool } from 'pg';

describe('RiskRepository', () => {
  let repository: RiskRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'test-id' }] }),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };
    repository = new RiskRepository(mockPool as unknown as Pool);
  });

  it('should save risk score and signals in batches', async () => {
    const score: RiskScore = {
      target_id: 'target-1',
      target_type: 'user',
      score: 85,
      level: 'high',
      metadata: {},
    };

    // Create 150 signals to test batching (CHUNK_SIZE = 100)
    const signals: RiskSignal[] = Array(150).fill(null).map((_, i) => ({
      signal_type: `type-${i}`,
      severity: 'medium',
      description: `desc-${i}`,
      metadata: {},
    }));

    await repository.saveRiskScore(score, signals);

    // Expect 1 BEGIN, 1 INSERT (score), 2 INSERT (signals), 1 COMMIT = 5 calls
    // The first signal batch is 100, the second is 50.
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO risk_scores'), expect.any(Array));

    // Check signal batching
    const signalInserts = mockClient.query.mock.calls.filter((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO risk_signals')
    );

    expect(signalInserts.length).toBe(2);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});
