import { describe, expect, it } from 'vitest';
import type { ResultSummary, PlanDescription } from 'neo4j-driver';
import { CostCollector } from '../src/cost/costCollector.js';

function createSummary(overrides: Partial<ResultSummary> = {}): ResultSummary {
  const plan: PlanDescription = {
    operatorType: 'ProduceResults',
    identifiers: [],
    arguments: {},
    children: [],
    dbHits: 2,
    pageCacheHits: 1,
    pageCacheMisses: 0
  } as unknown as PlanDescription;

  return {
    resultAvailableAfter: 12,
    resultConsumedAfter: 24,
    counters: {
      containsUpdates: () => false
    } as unknown as ResultSummary['counters'],
    plan,
    ...overrides
  } as ResultSummary;
}

describe('CostCollector', () => {
  it('records database operations with counters and plan data', () => {
    const collector = new CostCollector();
    const summary = createSummary();
    collector.recordDatabase('nodeNeighborhood', summary, { retryCount: 0 });

    const exported = collector.export();
    expect(exported).not.toBeNull();
    expect(exported?.operations).toHaveLength(1);
    const [operation] = exported!.operations;
    expect(operation.operation).toBe('nodeNeighborhood');
    expect(operation.metrics.resultConsumedAfterMs).toBe(24);
    expect(operation.plan?.operatorType).toBe('ProduceResults');
  });

  it('records cache hits without metrics', () => {
    const collector = new CostCollector();
    collector.recordCache('nodeNeighborhood', { cache: { hit: true } });
    const exported = collector.export();
    expect(exported?.operations[0].source).toBe('cache');
    expect(exported?.operations[0].metrics).toEqual({});
  });
});
