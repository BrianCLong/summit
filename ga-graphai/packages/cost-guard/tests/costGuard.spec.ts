import { describe, expect, it } from 'vitest';
import {
  CostGuard,
  DEFAULT_OPTIMIZATION_CONFIG,
  DEFAULT_PROFILE,
  ResourceOptimizationEngine,
} from '../src/index.js';

describe('CostGuard', () => {
  it('allows lightweight plans', () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: 'tenant-a',
      plan: {
        estimatedRru: 40,
        estimatedLatencyMs: 300,
        depth: 2,
        operations: 25,
        containsCartesianProduct: false,
      },
      activeQueries: 3,
      recentLatencyP95: 400,
    });
    expect(decision.action).toBe('allow');
    expect(decision.metrics.projectedLatencyMs).toBeGreaterThan(0);
  });

  it('throttles when latency or saturation is high', () => {
    const guard = new CostGuard({ ...DEFAULT_PROFILE, concurrencyLimit: 2 });
    const decision = guard.planBudget({
      tenantId: 'tenant-b',
      plan: {
        estimatedRru: 80,
        estimatedLatencyMs: 1400,
        depth: 6,
        operations: 120,
        containsCartesianProduct: false,
      },
      activeQueries: 2,
      recentLatencyP95: 2000,
    });
    expect(decision.action).toBe('throttle');
    expect(guard.metrics.budgetsExceeded).toBe(1);
  });

  it('kills dangerous query plans and tracks slow queries', () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: 'tenant-c',
      plan: {
        estimatedRru: 500,
        estimatedLatencyMs: 8000,
        depth: 3,
        operations: 60,
        containsCartesianProduct: true,
      },
      activeQueries: 1,
      recentLatencyP95: 1200,
    });
    expect(decision.action).toBe('kill');
    const record = guard.killSlowQuery(
      'query-1',
      'tenant-c',
      'exceeded budget',
    );
    guard.observeQueryCompletion(record.queryId, 3200);
    expect(guard.metrics.kills).toBe(1);
    expect(guard.metrics.activeSlowQueries).toBe(1);
    guard.release(record.queryId);
    expect(guard.metrics.activeSlowQueries).toBe(0);
  });

  it('tracks per-feature spend and surfaces budget alerts', () => {
    const guard = new CostGuard(undefined, {
      categories: {
        infrastructure: { limit: 1000, alertThreshold: 0.8 },
        inference: { limit: 800, alertThreshold: 0.75 },
        storage: { limit: 500, alertThreshold: 0.8 },
      },
      anomalyStdDevTolerance: 2,
      historyWindow: 8,
      throttleOnBreach: true,
    });

    const alert = guard.trackSpend({
      category: 'infrastructure',
      serviceId: 'svc-api',
      feature: 'deployments',
      cost: 850,
      timestamp: Date.now(),
    });

    expect(alert.status).toBe('alert');
    expect(alert.action).toBe('allow');
    expect(alert.utilization).toBeGreaterThan(0.8);
    expect(guard.costAttribution.features['svc-api'].deployments).toBeCloseTo(
      850,
    );
  });

  it('detects spend anomalies and throttles on budget breaches', () => {
    const guard = new CostGuard(undefined, {
      categories: {
        infrastructure: { limit: 1200, alertThreshold: 0.85 },
        inference: { limit: 200, alertThreshold: 0.6 },
        storage: { limit: 600, alertThreshold: 0.8 },
      },
      anomalyStdDevTolerance: 1.5,
      historyWindow: 6,
      throttleOnBreach: true,
    });

    [
      { cost: 12, feature: 'embedding' },
      { cost: 14, feature: 'embedding' },
      { cost: 11, feature: 'embedding' },
      { cost: 13, feature: 'embedding' },
    ].forEach((sample, idx) =>
      guard.trackSpend({
        category: 'inference',
        serviceId: 'svc-model',
        feature: sample.feature,
        cost: sample.cost,
        timestamp: idx + 1,
      }),
    );

    const spike = guard.trackSpend({
      category: 'inference',
      serviceId: 'svc-model',
      feature: 'embedding',
      cost: 180,
      timestamp: Date.now(),
    });

    expect(spike.status).toBe('breach');
    expect(spike.action).toBe('throttle');
    expect(spike.anomalies.length).toBeGreaterThan(0);
    expect(guard.metrics.budgetsExceeded).toBeGreaterThanOrEqual(1);
    expect(spike.totals.categorySpend).toBeGreaterThan(190);
  });

  it('treats anomalies as alerts even when utilization is low', () => {
    const guard = new CostGuard(undefined, {
      categories: {
        infrastructure: { limit: 5000, alertThreshold: 0.8 },
        inference: { limit: 5000, alertThreshold: 0.8 },
        storage: { limit: 5000, alertThreshold: 0.8 },
      },
      anomalyStdDevTolerance: 1,
      historyWindow: 5,
      throttleOnBreach: true,
    });

    [
      { cost: 2, timestamp: 1 },
      { cost: 2.2, timestamp: 2 },
      { cost: 2.4, timestamp: 3 },
    ].forEach((sample) =>
      guard.trackSpend({
        category: 'storage',
        serviceId: 'svc-data',
        feature: 'backups',
        cost: sample.cost,
        timestamp: sample.timestamp,
      }),
    );

    const anomaly = guard.trackSpend({
      category: 'storage',
      serviceId: 'svc-data',
      feature: 'backups',
      cost: 25,
      timestamp: 4,
    });

    expect(anomaly.status).toBe('alert');
    expect(anomaly.reason).toContain('Anomaly detected');
    expect(anomaly.action).toBe('allow');
  });

  it('rejects invalid cost observations', () => {
    const guard = new CostGuard();
    expect(() =>
      guard.trackSpend({
        category: 'inference',
        serviceId: 'svc-ml',
        feature: 'classification',
        cost: -4,
        timestamp: Date.now(),
      }),
    ).toThrowError('Spend observation cost must be a non-negative finite value.');
  });
});

describe('ResourceOptimizationEngine', () => {
  it('recommends scaling up when predictive load exceeds thresholds', () => {
    const engine = new ResourceOptimizationEngine();
    const samples = [
      {
        timestamp: 1,
        cpuUtilization: 0.62,
        memoryUtilization: 0.58,
        throughputPerNode: 110,
      },
      {
        timestamp: 2,
        cpuUtilization: 0.74,
        memoryUtilization: 0.67,
        throughputPerNode: 128,
      },
      {
        timestamp: 3,
        cpuUtilization: 0.88,
        memoryUtilization: 0.73,
        throughputPerNode: 140,
      },
    ];
    const decision = engine.recommendScaling(6, samples);
    expect(decision.action).toBe('scale_up');
    expect(decision.recommendedNodes).toBeGreaterThan(6);
    expect(decision.forecast.cpuUtilization).toBeGreaterThan(0.7);
    expect(decision.loadIndex).toBeGreaterThan(
      DEFAULT_OPTIMIZATION_CONFIG.scaleUpThreshold,
    );
  });

  it('recommends scaling down when load falls below thresholds', () => {
    const engine = new ResourceOptimizationEngine({ minNodes: 2 });
    const samples = [
      {
        timestamp: 1,
        cpuUtilization: 0.28,
        memoryUtilization: 0.26,
        throughputPerNode: 52,
      },
      {
        timestamp: 2,
        cpuUtilization: 0.24,
        memoryUtilization: 0.22,
        throughputPerNode: 48,
      },
      {
        timestamp: 3,
        cpuUtilization: 0.21,
        memoryUtilization: 0.2,
        throughputPerNode: 44,
      },
    ];
    const decision = engine.recommendScaling(8, samples);
    expect(decision.action).toBe('scale_down');
    expect(decision.recommendedNodes).toBeLessThan(8);
    expect(decision.recommendedNodes).toBeGreaterThanOrEqual(2);
  });

  it('produces workload balancing guidance for uneven clusters', () => {
    const engine = new ResourceOptimizationEngine({ rebalanceTolerance: 0.1 });
    const plan = engine.balanceWorkloads([
      {
        nodeId: 'node-a',
        cpuUtilization: 0.86,
        memoryUtilization: 0.74,
        activeSessions: 92,
        maxSessions: 100,
      },
      {
        nodeId: 'node-b',
        cpuUtilization: 0.38,
        memoryUtilization: 0.4,
        activeSessions: 34,
        maxSessions: 100,
      },
      {
        nodeId: 'node-c',
        cpuUtilization: 0.41,
        memoryUtilization: 0.36,
        activeSessions: 38,
        maxSessions: 100,
      },
    ]);

    expect(plan.strategy).toBe('rebalance');
    const overloaded = plan.allocations.find(
      (allocation) => allocation.nodeId === 'node-a',
    );
    const underloaded = plan.allocations.find(
      (allocation) => allocation.nodeId === 'node-b',
    );
    expect(overloaded?.delta).toBeLessThan(0);
    expect(underloaded?.delta).toBeGreaterThan(0);
  });
});
