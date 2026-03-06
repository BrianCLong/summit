import { jest } from '@jest/globals';
import { RiskRepository, RiskScore } from '../repositories/RiskRepository.js';
import { pool } from '../pg.js';

describe('RiskRepository', () => {
  let riskRepository: RiskRepository;
  let mockClient: any;

  beforeEach(() => {
    riskRepository = new RiskRepository();
    mockClient = {
      query: jest.fn().mockImplementation((text, _params) => {
        if (typeof text === 'string' && text.includes('INSERT INTO risk_scores')) {
          return Promise.resolve({ rows: [{ id: 'score-123' }] });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: jest.fn(),
    };

    jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save a risk score and its signals using batching (optimized)', async () => {
    const riskScore: RiskScore = {
      entity_id: 'entity-1',
      entity_type: 'user',
      score: 75,
      level: 'high',
      signals: [
        { signal_type: 'type1', value: 10, weight: 1 },
        { signal_type: 'type2', value: 20, weight: 2 },
        { signal_type: 'type3', value: 30, weight: 3 },
      ]
    };

    const id = await riskRepository.saveRiskScore(riskScore);

    expect(id).toBe('score-123');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');

    // Check risk_scores insert
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO risk_scores'),
      ['entity-1', 'user', 75, 'high']
    );

    // Check batched risk_signals insert
    // It should be ONE call for all 3 signals
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO risk_signals'),
      [
        'score-123', 'type1', 10, 1, undefined,
        'score-123', 'type2', 20, 2, undefined,
        'score-123', 'type3', 30, 3, undefined
      ]
    );

    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();

    // Total queries: BEGIN, score insert, batched signals insert, COMMIT = 4
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it('should throw an error and rollback the transaction if batching fails', async () => {
    const riskScore: RiskScore = {
      entity_id: 'entity-1',
      entity_type: 'user',
      score: 75,
      level: 'high',
      signals: [{ signal_type: 'type1', value: 10, weight: 1 }]
    };

    mockClient.query.mockImplementation((text) => {
      if (typeof text === 'string' && text.includes('INSERT INTO risk_signals')) {
        return Promise.reject(new Error('Batch insert failed'));
      }
      if (typeof text === 'string' && text.includes('INSERT INTO risk_scores')) {
        return Promise.resolve({ rows: [{ id: 'score-123' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(riskRepository.saveRiskScore(riskScore)).rejects.toThrow('Batch insert failed');

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
