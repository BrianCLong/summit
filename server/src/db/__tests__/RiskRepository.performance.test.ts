
import { jest } from '@jest/globals';
import { RiskRepository } from '../repositories/RiskRepository.js';
import { pg } from '../pg.js';

describe('RiskRepository Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert risk signals in batches (optimized behavior)', async () => {
    const mockTx = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO risk_scores')) {
          return [{
            id: 'score-1',
            tenant_id: 'tenant-1',
            entity_id: 'entity-1',
            entity_type: 'user',
            score: 0.8,
            level: 'high',
            window: '24h',
            model_version: '1.0',
            rationale: 'test',
            created_at: new Date(),
          }];
        }
        if (sql.includes('INSERT INTO risk_signals')) {
          // Calculate how many signals are being inserted in this call
          // Each signal has 8 parameters in the current unoptimized version,
          // and will have 8 in the batched version as well.
          const paramCountPerSignal = 8;
          const signalCount = params.length / paramCountPerSignal;
          return Array.from({ length: signalCount }, (_, i) => ({
            id: `sig-${i}`,
            risk_score_id: 'score-1',
            type: 'signal_type',
            source: 'test',
            value: 1.0,
            weight: 0.5,
            contribution_score: 0.5,
            description: `signal ${i}`,
            detected_at: new Date(),
          }));
        }
        return [];
      }),
    };

    // Mock pg.transaction to execute the callback with our mockTx
    const transactionSpy = jest.spyOn(pg, 'transaction').mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });

    const repo = new RiskRepository();
    const signals = Array.from({ length: 150 }, (_, i) => ({
      type: 'signal_type',
      source: 'test',
      value: 1.0,
      weight: 0.5,
      contributionScore: 0.5,
      description: `signal ${i}`,
    }));

    await repo.saveRiskScore({
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      entityType: 'user',
      score: 0.8,
      level: 'high',
      window: '24h',
      modelVersion: '1.0',
      rationale: 'test',
      signals,
    });

    // Verify transaction was called
    expect(transactionSpy).toHaveBeenCalled();

    const signalInsertCalls = (mockTx.query as any).mock.calls.filter((call: any) =>
      call[0].includes('INSERT INTO risk_signals')
    );

    // BOLT PERFORMANCE CHECK:
    // Before optimization: 150 individual calls
    // After optimization: 2 calls (chunk size 100)
    console.log(`Number of signal insert calls: ${signalInsertCalls.length}`);

    expect(signalInsertCalls.length).toBeLessThanOrEqual(2);

    // If batched, the first call should have 100 * 8 = 800 parameters
    if (signalInsertCalls.length > 0 && signalInsertCalls.length < signals.length) {
      expect(signalInsertCalls[0][1].length).toBe(100 * 8);
      expect(signalInsertCalls[0][0]).toContain('VALUES ($1, $2');
      expect(signalInsertCalls[0][0]).toContain('), ($9'); // Second row starts at $9
    }
  });
});
