import { describe, it, expect, jest } from '@jest/globals';
import { evaluateCanary } from '../../src/conductor/rollback.js';

describe('Ramp rollback SLO breach triggers', () => {
  it('triggers rollback when error rate exceeds threshold', async () => {
    const rollback = jest.fn(() => Promise.resolve(undefined));
    const fetchMetrics = jest.fn(() =>
      Promise.resolve({ errorRate: 0.12, p95: 120 }),
    );

    const result = await evaluateCanary(
      'run-1',
      { errorRatePct: 5, p95LatencyMs: 200 },
      fetchMetrics,
      rollback,
    );

    expect(result.rolledBack).toBe(true);
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it('triggers rollback when p95 latency exceeds threshold', async () => {
    const rollback = jest.fn(() => Promise.resolve(undefined));
    const fetchMetrics = jest.fn(() =>
      Promise.resolve({ errorRate: 0.01, p95: 750 }),
    );

    const result = await evaluateCanary(
      'run-2',
      { errorRatePct: 5, p95LatencyMs: 500 },
      fetchMetrics,
      rollback,
    );

    expect(result.rolledBack).toBe(true);
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it('does not trigger rollback when SLOs are healthy', async () => {
    const rollback = jest.fn(() => Promise.resolve(undefined));
    const fetchMetrics = jest.fn(() =>
      Promise.resolve({ errorRate: 0.01, p95: 120 }),
    );

    const result = await evaluateCanary(
      'run-3',
      { errorRatePct: 5, p95LatencyMs: 500 },
      fetchMetrics,
      rollback,
    );

    expect(result.rolledBack).toBe(false);
    expect(rollback).not.toHaveBeenCalled();
  });
});
