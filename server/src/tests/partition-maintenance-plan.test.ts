import { buildPartitionPlan } from '../../scripts/partition-maintenance.js';

describe('partition maintenance plan mode', () => {
  it('generates a bounded, deterministic plan window', () => {
    const fixedNow = new Date('2025-01-01T00:00:00Z');
    const plan = buildPartitionPlan(
      { monthsAhead: 3, retentionMonths: 6, dryRun: true, planOnly: true },
      fixedNow,
    );

    expect(plan.actions[0].window).toEqual(['2025-01', '2025-02', '2025-03', '2025-04']);
    expect(plan.actions[0].monthsAhead).toBe(3);

    const secondPlan = buildPartitionPlan(
      { monthsAhead: 3, retentionMonths: 6, dryRun: true, planOnly: true },
      fixedNow,
    );

    expect(secondPlan).toEqual(plan);
  });

  it('caps the months-ahead horizon and sanitizes tenant identifiers', () => {
    const plan = buildPartitionPlan(
      {
        monthsAhead: 20,
        retentionMonths: 12,
        tenantId: 'tenant-!@#',
        dryRun: true,
        planOnly: true,
      },
      new Date('2025-01-15T00:00:00Z'),
    );

    expect(plan.actions[0].monthsAhead).toBe(12);
    expect(plan.actions[0].tenantId).toBe('tenant-');
    expect(plan.actions[0].window).toHaveLength(13);
  });
});
