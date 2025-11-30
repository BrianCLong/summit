import { buildResidencyAwarePlan, PlannerInput, ResidencyPolicy, WorkloadProfile } from './radrp-planner.js';

describe('Residency-Aware Disaster Recovery Planner', () => {
  const regions = [
    {
      id: 'eu-central-1',
      jurisdiction: 'EU',
      supportsActiveActive: true,
      costPerHour: 22,
      replicationLagMinutes: 2,
      failoverTimeMinutes: 6
    },
    {
      id: 'eu-west-2',
      jurisdiction: 'EU',
      supportsActiveActive: true,
      costPerHour: 19,
      replicationLagMinutes: 3,
      failoverTimeMinutes: 5
    },
    {
      id: 'us-east-1',
      jurisdiction: 'US',
      supportsActiveActive: true,
      costPerHour: 18,
      replicationLagMinutes: 4,
      failoverTimeMinutes: 7
    }
  ];

  const policies: ResidencyPolicy[] = [
    {
      dataClass: 'pii',
      allowedJurisdictions: ['EU'],
      crossBorderRequiresConsent: true
    },
    {
      dataClass: 'analytics',
      allowedJurisdictions: ['US', 'CA'],
      crossBorderRequiresConsent: true
    }
  ];

  const workloads: WorkloadProfile[] = [
    {
      id: 'ledger',
      dataClass: 'pii',
      criticality: 'tier0',
      preferredTopology: 'active-active',
      rpoMinutes: 5,
      rtoMinutes: 10
    },
    {
      id: 'dashboards',
      dataClass: 'analytics',
      criticality: 'tier1',
      preferredTopology: 'active-passive',
      rpoMinutes: 10,
      rtoMinutes: 15,
      preferredRegions: ['us-east-1']
    }
  ];

  const baseInput: PlannerInput = {
    regions,
    policies,
    workloads,
    targets: {
      rpoMinutes: 15,
      rtoMinutes: 20
    }
  };

  it('produces signed plans that satisfy workload RPO/RTO targets', () => {
    const result = buildResidencyAwarePlan(baseInput, { now: '2025-01-01T00:00:00.000Z' });

    const ledgerPlan = result.plan.workloadPlans.find((plan) => plan.workloadId === 'ledger');
    expect(ledgerPlan).toBeDefined();
    expect(ledgerPlan?.topology).toBe('active-active');
    expect(ledgerPlan?.meetsRpo).toBe(true);
    expect(ledgerPlan?.meetsRto).toBe(true);
    expect(ledgerPlan?.computedRpoMinutes).toBeLessThanOrEqual(5);
    expect(ledgerPlan?.computedRtoMinutes).toBeLessThanOrEqual(10);

    expect(result.plan.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(result.runbooks).toHaveLength(2);
  });

  it('verifier flags replication that violates residency policy', () => {
    const result = buildResidencyAwarePlan(baseInput, { now: '2025-01-01T00:00:00.000Z' });

    const report = result.verifier.verify([
      {
        from: 'eu-central-1',
        to: 'us-east-1',
        dataClass: 'pii'
      }
    ]);

    expect(report.ok).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].reason).toContain('Jurisdiction');
  });

  it('generates deterministic and auditable synthetic drills', () => {
    const first = buildResidencyAwarePlan(baseInput, { now: '2025-01-01T00:00:00.000Z' });
    const second = buildResidencyAwarePlan(baseInput, { now: '2025-01-01T00:00:00.000Z' });

    expect(first.drills).toEqual(second.drills);
    expect(first.drills[0].auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'seed' }),
        expect.objectContaining({ field: 'generatedAt', value: '2025-01-01T00:00:00.000Z' })
      ])
    );
  });
});
