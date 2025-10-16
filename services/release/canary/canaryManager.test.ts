import {
  CanaryManager,
  buildDefaultConfig,
  meanTimeToRollback,
} from './canaryManager';
import { HealthSample } from './types';

describe('CanaryManager', () => {
  const healthySample = (
    overrides: Partial<HealthSample> = {},
  ): HealthSample => ({
    collectedAt: new Date().toISOString(),
    metrics: {
      errorRate: 0.002,
      latencyP95: 240,
      saturation: 0.45,
      probes: [
        { name: 'ping', success: true, latencyMs: 120 },
        { name: 'graphql', success: true, latencyMs: 180 },
      ],
    },
    baseline: {
      errorRate: 0.002,
      latencyP95: 235,
      saturation: 0.4,
    },
    syntheticChecks: [
      { name: 'smoke', passed: true, latencyMs: 180 },
      { name: 'checkout', passed: true, latencyMs: 420 },
    ],
    ...overrides,
  });

  it('promotes through all configured steps when healthy', () => {
    const config = buildDefaultConfig('template-service', 'prod');
    const manager = new CanaryManager(config);
    let state = manager.initialiseState();

    const start = manager.evaluate(
      state,
      healthySample(),
      new Date('2024-01-01T00:00:00Z'),
    );
    expect(start.action).toBe('start_step');
    state = start.state;

    const afterBake = manager.evaluate(
      state,
      healthySample({ collectedAt: '2024-01-01T00:20:00Z' }),
      new Date('2024-01-01T00:20:00Z'),
    );
    expect(afterBake.action).toBe('promote');
    expect(afterBake.helmCommands[0]).toContain('traffic.canary=25');

    const final = manager.evaluate(
      afterBake.state,
      healthySample({ collectedAt: '2024-01-01T01:00:00Z' }),
      new Date('2024-01-01T01:00:00Z'),
    );
    const promotion = manager.evaluate(
      final.state,
      healthySample({ collectedAt: '2024-01-01T01:40:00Z' }),
      new Date('2024-01-01T01:40:00Z'),
    );
    const completion = manager.evaluate(
      promotion.state,
      healthySample({ collectedAt: '2024-01-01T02:30:00Z' }),
      new Date('2024-01-01T02:30:00Z'),
    );

    expect(completion.action).toBe('complete');
    expect(completion.helmCommands[0]).toContain('traffic.canary=100');
    expect(completion.auditEvent?.action).toBe('canary_completed');
  });

  it('rolls back when consecutive breaches exceed the limit', () => {
    const config = buildDefaultConfig('template-service', 'prod');
    const manager = new CanaryManager(config);
    const startState = manager.evaluate(
      manager.initialiseState(),
      healthySample(),
      new Date(),
    ).state;

    const failingSample: HealthSample = {
      ...healthySample(),
      metrics: {
        errorRate: 0.05,
        latencyP95: 800,
        saturation: 0.9,
        probes: [
          { name: 'ping', success: false, latencyMs: 600 },
          { name: 'graphql', success: false, latencyMs: 650 },
        ],
      },
      syntheticChecks: [
        { name: 'smoke', passed: false, latencyMs: 500, details: '500 status' },
      ],
    };

    const firstBreach = manager.evaluate(startState, failingSample, new Date());
    expect(firstBreach.action).toBe('hold');
    const secondBreach = manager.evaluate(
      firstBreach.state,
      failingSample,
      new Date(),
    );
    expect(secondBreach.action).toBe('rollback');
    expect(secondBreach.helmCommands[0]).toMatch(/helm rollback/);
    expect(secondBreach.auditEvent?.reason).toContain('Error rate');
  });

  it('supports manual aborts with audit trail', () => {
    const config = buildDefaultConfig('template-service', 'prod');
    const manager = new CanaryManager(config);
    const started = manager.evaluate(
      manager.initialiseState(),
      healthySample(),
      new Date(),
    );

    const withAbort = manager.requestAbort(
      started.state,
      'sre-oncall',
      'Manual abort requested',
    );
    const abortResult = manager.evaluate(
      withAbort,
      healthySample(),
      new Date(),
    );

    expect(abortResult.action).toBe('abort');
    expect(abortResult.auditEvent?.actor).toBe('sre-oncall');
    expect(abortResult.helmCommands[0]).toContain('helm rollback');
  });

  it('computes mean time to rollback from health history', () => {
    const config = buildDefaultConfig('template-service', 'prod');
    const manager = new CanaryManager(config);
    const baseState = manager.initialiseState();
    const start = manager.evaluate(
      baseState,
      healthySample({ collectedAt: '2024-01-01T00:00:00Z' }),
      new Date('2024-01-01T00:00:00Z'),
    );

    const failingSample: HealthSample = {
      ...healthySample({ collectedAt: '2024-01-01T00:10:00Z' }),
      metrics: {
        errorRate: 0.03,
        latencyP95: 600,
        saturation: 0.85,
        probes: [{ name: 'ping', success: false, latencyMs: 400 }],
      },
      syntheticChecks: [{ name: 'smoke', passed: false, latencyMs: 400 }],
    };

    const breach = manager.evaluate(
      start.state,
      failingSample,
      new Date('2024-01-01T00:10:00Z'),
    );
    const rollback = manager.evaluate(
      breach.state,
      failingSample,
      new Date('2024-01-01T00:11:00Z'),
    );

    const mttb = meanTimeToRollback(
      rollback.state,
      new Date('2024-01-01T00:11:30Z'),
    );
    expect(mttb).toBeGreaterThanOrEqual(90 * 1000);
  });
});
