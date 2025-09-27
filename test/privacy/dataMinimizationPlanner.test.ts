import {
  planMinimalViews,
  TaskSpec,
} from '../../services/privacy/src/dataMinimizationPlanner.js';

describe('Data Minimization Planner', () => {
  const taskSpec: TaskSpec = {
    name: 'engagement_kpi',
    features: [
      { name: 'user_id', table: 'events', column: 'user_id', type: 'string', pii: true },
      { name: 'region', table: 'events', column: 'region', type: 'string' },
      { name: 'age', table: 'events', column: 'age', type: 'number' },
      { name: 'purchase_amount', table: 'events', column: 'purchase_amount', type: 'number' },
      { name: 'device_type', table: 'events', column: 'device_type', type: 'string' },
    ],
    policies: [
      {
        name: 'hash-user-id',
        type: 'redact',
        appliesTo: ['user_id'],
        strategy: { type: 'hash', algorithm: 'sha256' },
        rationale: 'PII must be anonymized via hashing',
      },
      {
        name: 'age-bucket',
        type: 'coarsen',
        appliesTo: ['age'],
        strategy: { type: 'bucket', size: 5 },
        rationale: 'Only coarse age bands required for KPI',
      },
      {
        name: 'drop-device',
        type: 'redact',
        appliesTo: ['device_type'],
        strategy: { type: 'remove' },
        rationale: 'Device metadata out of scope for this analysis',
      },
    ],
    metrics: [
      {
        name: 'total_revenue_by_region',
        targetAccuracy: 0.99,
        aggregator: { type: 'sum', feature: 'purchase_amount', groupBy: ['region'] },
        requires: ['purchase_amount', 'region'],
      },
      {
        name: 'avg_age_by_region',
        targetAccuracy: 0.9,
        aggregator: { type: 'avg', feature: 'age', groupBy: ['region'] },
        requires: ['age', 'region'],
      },
      {
        name: 'active_users_by_region',
        targetAccuracy: 0.99,
        aggregator: { type: 'countDistinct', feature: 'user_id', groupBy: ['region'] },
        requires: ['user_id', 'region'],
      },
    ],
    fixture: {
      table: 'events',
      baselineRows: [
        { user_id: 'u1', region: 'north', age: 23, purchase_amount: 120, device_type: 'ios' },
        { user_id: 'u2', region: 'north', age: 31, purchase_amount: 80, device_type: 'android' },
        { user_id: 'u3', region: 'south', age: 42, purchase_amount: 200, device_type: 'ios' },
        { user_id: 'u4', region: 'south', age: 37, purchase_amount: 140, device_type: 'android' },
        { user_id: 'u5', region: 'north', age: 28, purchase_amount: 60, device_type: 'web' },
        { user_id: 'u6', region: 'south', age: 45, purchase_amount: 90, device_type: 'ios' },
      ],
    },
  };

  it('proposes minimal SQL views and redaction map entries', () => {
    const plan = planMinimalViews(taskSpec);

    expect(plan.views).toHaveLength(1);
    const view = plan.views[0];

    expect(view.name).toBe('engagement_kpi_events_minimal_view');
    expect(view.sql).toContain('COUNT(DISTINCT SHA2(events.user_id, 256)) AS "active_users_by_region"');
    expect(view.sql).toContain('AVG(FLOOR(events.age / 5) * 5) AS "avg_age_by_region"');
    expect(view.sql).not.toContain('device_type');
    expect(view.sql).toContain('GROUP BY "region"');

    expect(plan.redactionMap.user_id).toEqual(
      expect.objectContaining({
        included: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ type: 'hash' }),
        ]),
      }),
    );
    expect(plan.redactionMap.device_type.included).toBe(false);
    expect(plan.redactionMap.device_type.actions[0]).toEqual(
      expect.objectContaining({ type: 'drop' }),
    );
    expect(plan.redactionMap.age.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'coarsen' }),
      ]),
    );
  });

  it('meets accuracy targets on fixtures', () => {
    const plan = planMinimalViews(taskSpec);
    for (const metric of plan.accuracyReport) {
      expect(metric.meetsTarget).toBe(true);
      expect(metric.accuracy).toBeGreaterThanOrEqual(taskSpec.metrics.find((m) => m.name === metric.metric)!.targetAccuracy);
    }
  });

  it('simulates deterministic exposure reduction', () => {
    const planA = planMinimalViews(taskSpec);
    const planB = planMinimalViews(taskSpec);

    expect(planA.views).toEqual(planB.views);
    expect(planA.redactionMap).toEqual(planB.redactionMap);
    expect(planA.accuracyReport).toEqual(planB.accuracyReport);

    expect(planA.impactSimulator.baseline).toEqual({ fields: 5, rows: 6 });
    expect(planA.impactSimulator.minimal.rows).toBe(2);
    expect(planA.impactSimulator.fieldDelta.absolute).toBeGreaterThan(0);
    expect(planA.impactSimulator.rowDelta.absolute).toBeGreaterThan(0);

    const simA = planA.impactSimulator.run(taskSpec.fixture.baselineRows);
    const simB = planB.impactSimulator.run(taskSpec.fixture.baselineRows);
    expect(simA).toEqual(simB);
    expect(simA.minimal.rows).toBe(2);
    expect(simA.fieldDelta.absolute).toBeGreaterThan(0);
  });
});
