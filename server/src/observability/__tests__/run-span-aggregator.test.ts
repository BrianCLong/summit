import { calculateRunAggregate } from '../run-spans/run-span-aggregator.js';
import { RunSpan } from '../run-spans/types.js';

describe('calculateRunAggregate', () => {
  const baseSpan = (overrides: Partial<RunSpan>): RunSpan => ({
    traceId: 'run-1',
    runId: 'run-1',
    spanId: overrides.spanId || `span-${Math.random()}`,
    parentSpanId: overrides.parentSpanId || null,
    stage: overrides.stage || 'stage',
    kind: overrides.kind || 'exec',
    startTimeMs: overrides.startTimeMs || 0,
    endTimeMs: overrides.endTimeMs || 0,
    status: overrides.status || 'ok',
    retryCount: overrides.retryCount || 0,
    attributes: overrides.attributes || {},
    resources: overrides.resources,
  });

  it('computes queue waste and critical path ignoring queue spans', () => {
    const spans: RunSpan[] = [
      baseSpan({
        spanId: 'queue-1',
        kind: 'queue',
        stage: 'enqueue',
        startTimeMs: 0,
        endTimeMs: 100,
      }),
      baseSpan({
        spanId: 'exec-1',
        parentSpanId: 'queue-1',
        stage: 'worker',
        kind: 'exec',
        startTimeMs: 100,
        endTimeMs: 400,
      }),
      baseSpan({
        spanId: 'io-1',
        parentSpanId: 'exec-1',
        stage: 'io',
        kind: 'io',
        startTimeMs: 400,
        endTimeMs: 600,
      }),
    ];

    const result = calculateRunAggregate(spans);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.aggregate.totalDurationMs).toBe(600);
    expect(result.aggregate.queueWaitMs).toBe(100);
    expect(result.aggregate.execMs).toBe(500);
    expect(result.aggregate.bestCaseDurationMs).toBe(500);
    expect(result.aggregate.wastedQueueMs).toBe(100);
    expect(result.aggregate.criticalPathStages).toEqual(['enqueue', 'worker', 'io']);
    const collect = (nodes: any[]): any[] => {
      const all: any[] = [];
      const stack = [...nodes];
      while (stack.length) {
        const node = stack.pop();
        all.push(node);
        stack.push(...(node.children || []));
      }
      return all;
    };
    const criticalNodes = collect(result.tree).filter((n) => n.onCriticalPath);
    expect(criticalNodes).toHaveLength(3);
  });

  it('returns null when spans are missing', () => {
    expect(calculateRunAggregate([])).toBeNull();
  });

  it('surfaces errors and retries from spans', () => {
    const spans: RunSpan[] = [
      baseSpan({
        spanId: 'queue',
        kind: 'queue',
        stage: 'queue',
        startTimeMs: 0,
        endTimeMs: 10,
        retryCount: 1,
      }),
      baseSpan({
        spanId: 'exec',
        parentSpanId: 'queue',
        stage: 'execute',
        kind: 'exec',
        startTimeMs: 10,
        endTimeMs: 110,
        status: 'error',
        retryCount: 2,
      }),
    ];

    const result = calculateRunAggregate(spans);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.aggregate.errorCount).toBe(1);
    expect(result.aggregate.retryCount).toBe(3);
    expect(result.aggregate.status).toBe('error');
  });
});
