import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { pg } from '../../pg.js';
import { RiskRepository } from '../RiskRepository.js';
import type { RiskScoreInput } from '../../../risk/types.js';

describe('RiskRepository.saveRiskScore', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildInput = (signalCount: number): RiskScoreInput => ({
    tenantId: 'tenant-1',
    entityId: 'entity-1',
    entityType: 'Person',
    score: 0.87,
    level: 'high',
    window: '24h',
    modelVersion: 'risk-v2',
    rationale: 'test rationale',
    signals: Array.from({ length: signalCount }).map((_, index) => ({
      type: `signal-${index}`,
      source: 'unit-test',
      value: index + 1,
      weight: 0.1,
      contributionScore: 0.2,
      description: `signal description ${index}`,
    })),
  });

  const scoreRow = {
    id: 'score-1',
    tenant_id: 'tenant-1',
    entity_id: 'entity-1',
    entity_type: 'Person',
    score: '0.87',
    level: 'high',
    window: '24h',
    model_version: 'risk-v2',
    rationale: 'test rationale',
    created_at: new Date('2026-02-25T00:00:00Z'),
    valid_until: null,
  };

  it('inserts all signals in a single batched query when <= 100 signals', async () => {
    const txQuery = jest
      .fn<
        (text: string, params?: unknown[]) => Promise<any[]>
      >()
      .mockResolvedValueOnce([scoreRow])
      .mockResolvedValueOnce([]);

    jest
      .spyOn(pg, 'transaction')
      .mockImplementation(async (callback) => callback({ query: txQuery }));

    const repository = new RiskRepository();
    const result = await repository.saveRiskScore(buildInput(5));

    expect(result.id).toBe('score-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.score).toBe(0.87);

    expect(txQuery).toHaveBeenCalledTimes(2);

    const [, signalParams] = txQuery.mock.calls[1];
    expect(signalParams).toHaveLength(5 * 8);

    const [signalSql] = txQuery.mock.calls[1];
    const tupleCount = (signalSql.match(/\(\$/g) || []).length;
    expect(tupleCount).toBe(5);
  });

  it('chunks inserts into multiple batched queries when > 100 signals', async () => {
    const txQuery = jest
      .fn<
        (text: string, params?: unknown[]) => Promise<any[]>
      >()
      .mockResolvedValueOnce([scoreRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    jest
      .spyOn(pg, 'transaction')
      .mockImplementation(async (callback) => callback({ query: txQuery }));

    const repository = new RiskRepository();
    await repository.saveRiskScore(buildInput(150));

    expect(txQuery).toHaveBeenCalledTimes(3);

    const [firstSignalSql, firstSignalParams] = txQuery.mock.calls[1];
    const [secondSignalSql, secondSignalParams] = txQuery.mock.calls[2];

    expect(firstSignalParams).toHaveLength(100 * 8);
    expect(secondSignalParams).toHaveLength(50 * 8);

    const firstTupleCount = (firstSignalSql.match(/\(\$/g) || []).length;
    const secondTupleCount = (secondSignalSql.match(/\(\$/g) || []).length;
    expect(firstTupleCount).toBe(100);
    expect(secondTupleCount).toBe(50);
  });
});
