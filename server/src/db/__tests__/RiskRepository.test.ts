
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg, pool } from '../../db/pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;
  let mockClient: any;

  beforeEach(() => {
    repo = new RiskRepository();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Spy on pool.connect to return our mockClient
    jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save a risk score and its signals in batches (optimized behavior)', async () => {
    const input: any = {
      tenantId: 'tenant-123',
      entityId: 'entity-456',
      entityType: 'user',
      score: 0.85,
      level: 'high',
      window: '24h',
      modelVersion: '1.0.0',
      rationale: 'High risk detected',
      signals: [
        { type: 'login_fail', source: 'auth', value: 5, weight: 0.4, contributionScore: 0.35, description: 'Multiple failures' },
        { type: 'geo_anomaly', source: 'network', value: 1, weight: 0.6, contributionScore: 0.5, description: 'Strange location' },
      ],
    };

    // 1. Mock the risk score insertion
    mockClient.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO risk_scores')) {
        return {
          rows: [
            {
              id: 'score-789',
              tenant_id: input.tenantId,
              entity_id: input.entityId,
              entity_type: input.entityType,
              score: '0.85',
              level: input.level,
              window: input.window,
              model_version: input.modelVersion,
              rationale: input.rationale,
              created_at: new Date(),
            }
          ]
        };
      }
      if (sql.includes('INSERT INTO risk_signals')) {
        return {
          rows: [
            {
              id: 'sig-abc',
              risk_score_id: 'score-789',
              type: 'login_fail',
              value: '5',
              weight: '0.4',
              contribution_score: '0.35',
            }
          ]
        };
      }
      return { rows: [] };
    });

    const result = await repo.saveRiskScore(input);

    expect(result.id).toBe('score-789');
    expect(result.score).toBe(0.85);

    // OPTIMIZED BEHAVIOR:
    // 1 BEGIN
    // 1 INSERT INTO risk_scores
    // 1 INSERT INTO risk_signals (batched)
    // 1 COMMIT
    // Total 4 calls to mockClient.query

    const insertionCalls = mockClient.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO')
    );

    // VERIFY BATCHING: Now only 2 insertion calls instead of 3
    expect(insertionCalls.length).toBe(2);
    expect(insertionCalls[0][0]).toContain('INSERT INTO risk_scores');
    expect(insertionCalls[1][0]).toContain('INSERT INTO risk_signals');

    // Verify that the second call contains both signals (8 params per signal * 2 signals = 16 params)
    expect(insertionCalls[1][1].length).toBe(16);
    expect(insertionCalls[1][0]).toContain('$9'); // $1 to $16 are used
  });

  it('should chunk signal insertions for large numbers of signals', async () => {
    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: `s${i}`,
      value: 1,
      weight: 0.1,
      contributionScore: 0.05
    }));

    const input: any = {
      tenantId: 't', entityId: 'e', entityType: 'u', score: 0.5, level: 'low', window: '24h', modelVersion: '1', signals
    };

    mockClient.query.mockResolvedValue({
      rows: [{ id: 'score-123', tenant_id: 't', entity_id: 'e', entity_type: 'u', score: '0.5', level: 'low', window: '24h', model_version: '1', created_at: new Date() }]
    });

    await repo.saveRiskScore(input);

    const signalInsertionCalls = mockClient.query.mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    // Chunk size is 100, so 150 signals should result in 2 batches
    expect(signalInsertionCalls.length).toBe(2);
    expect(signalInsertionCalls[0][1].length).toBe(100 * 8);
    expect(signalInsertionCalls[1][1].length).toBe(50 * 8);
  });
});
