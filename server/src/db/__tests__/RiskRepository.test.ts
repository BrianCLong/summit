
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg, pool } from '../pg.js';

describe('RiskRepository', () => {
  let repo: RiskRepository;

  beforeEach(() => {
    repo = new RiskRepository();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should insert risk signals in batches (optimized)', async () => {
    const mockClient = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK' || sql.includes('SAVEPOINT') || sql.includes('RELEASE') || sql.includes('ROLLBACK TO SAVEPOINT')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO risk_scores')) {
          return { rows: [{ id: 'score-1', tenant_id: 't1', entity_id: 'e1', entity_type: 'person', score: '0.5', level: 'medium', window: '24h', model_version: '1.0', rationale: 'test' }] };
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          if (sql.includes('VALUES ($1,$2,$3,$4,$5,$6,$7,$8), ($9')) {
             const numRows = params.length / 8;
             return { rows: Array.from({ length: numRows }, (_, i) => ({ id: `sig-${i}` })) };
          }
          return { rows: [{ id: 'sig-fallback' }] };
        }
        return { rows: [] };
      }),
      release: jest.fn()
    };

    const connectSpy = jest.spyOn(pool, 'connect').mockImplementation(async () => {
      return mockClient as any;
    });

    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: `sig-${i}`,
      source: 'test',
      value: 1,
      weight: 1,
      contributionScore: 1,
      description: 'test'
    }));

    await repo.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'person',
      score: 0.5,
      level: 'medium',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals
    });

    expect(connectSpy).toHaveBeenCalled();
    const signalQueries = mockClient.query.mock.calls.filter((call: any) => call[0].includes('INSERT INTO risk_signals'));
    expect(signalQueries.length).toBe(2);
    expect(signalQueries[0][1].length).toBe(800);
    expect(signalQueries[1][1].length).toBe(400);
  });

  it('should fall back to individual inserts if batch fails', async () => {
    let firstBatch = true;
    const mockClient = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK' || sql.includes('SAVEPOINT') || sql.includes('RELEASE') || sql.includes('ROLLBACK TO SAVEPOINT')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO risk_scores')) {
          return { rows: [{ id: 'score-1', tenant_id: 't1', entity_id: 'e1', entity_type: 'person', score: '0.5', level: 'medium', window: '24h', model_version: '1.0', rationale: 'test' }] };
        }
        if (sql.includes('INSERT INTO risk_signals')) {
        if (sql.includes('), ($9') && firstBatch) {
            firstBatch = false;
            throw new Error('Batch failed');
          }
          return { rows: [{ id: 'sig-fallback' }] };
        }
        return { rows: [] };
      }),
      release: jest.fn()
    };

    const connectSpy = jest.spyOn(pool, 'connect').mockImplementation(async () => {
      return mockClient as any;
    });

    const signals = [
      { type: 'sig-1', source: 'test', value: 1, weight: 1, contributionScore: 1, description: 'test' },
      { type: 'sig-2', source: 'test', value: 1, weight: 1, contributionScore: 1, description: 'test' }
    ];

    await repo.saveRiskScore({
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'person',
      score: 0.5,
      level: 'medium',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals
    });

    expect(connectSpy).toHaveBeenCalled();
    const signalQueries = mockClient.query.mock.calls.filter((call: any) => call[0].includes('INSERT INTO risk_signals'));
    expect(signalQueries.length).toBe(3); // 1 failed batch + 2 individual
  });
});
