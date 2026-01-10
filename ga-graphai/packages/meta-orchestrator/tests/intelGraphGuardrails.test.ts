import { describe, expect, it, vi } from 'vitest';
import {
  CostAndSloAwareBandit,
  IntelGraphGuardrailEngine,
  type TelemetrySnapshot,
} from '../src/intelGraphGuardrails';

function buildSnapshot(overrides?: Partial<TelemetrySnapshot>): TelemetrySnapshot {
  return {
    latency: {
      apiReadP95Ms: 320,
      apiWriteP95Ms: 650,
      apiSubscriptionP95Ms: 200,
      graph1HopP95Ms: 250,
      graph2To3HopP95Ms: 800,
      ingestP95Ms: 90,
    },
    throughput: {
      ingestEventsPerSecondPerPod: 1100,
      ingestP95Ms: 90,
    },
    availability: {
      availability: 0.9995,
      totalRequests: 100000,
      errorCount: 20,
    },
    cost: {
      ingestUnitCostPerThousand: 0.05,
      graphqlUnitCostPerMillion: 1.5,
      monthlyIngestCost: 2000,
      monthlyGraphqlCost: 1500,
    },
    security: {
      oidcEnabled: true,
      opaAbacEnabled: true,
      mTlsEnabled: true,
      fieldLevelEncryptionEnabled: true,
      provenanceLedgerEnabled: true,
      standardRetentionDays: 365,
      piiRetentionDays: 30,
      warrantBindingRequired: true,
    },
    residencyDecisions: [
      {
        resourceId: 'case-1',
        residency: 'us',
        allowedResidencies: ['us', 'eu'],
        purpose: 'investigation',
        allowedPurposes: ['investigation', 'fraud'],
      },
    ],
    connectors: [
      {
        id: 'conn-a',
        name: 'provider-a',
        latencyP95Ms: 120,
        throughputPerSecond: 1200,
        costPerEvent: 0.001,
        monthlySpend: 500,
        monthlyBudget: 1000,
        errorRate: 0.01,
      },
    ],
    ...overrides,
  } as TelemetrySnapshot;
}

describe('IntelGraphGuardrailEngine', () => {
  it('identifies latency and throughput breaches with alert actions', () => {
    const engine = new IntelGraphGuardrailEngine();
    const snapshot = buildSnapshot({
      latency: {
        apiReadP95Ms: 400,
        apiWriteP95Ms: 750,
        apiSubscriptionP95Ms: 260,
        graph1HopP95Ms: 310,
        graph2To3HopP95Ms: 1300,
        ingestP95Ms: 150,
      },
      throughput: {
        ingestEventsPerSecondPerPod: 800,
        ingestP95Ms: 150,
      },
    });

    const result = engine.evaluate(snapshot);
    const messages = result.violations.map((v) => v.message);

    expect(messages).toContain('Latency breach: apiReadP95Ms=400ms exceeds 350ms');
    expect(messages).toContain('Throughput shortfall: 800ev/s per pod below target 1000');
    expect(result.actions.filter((a) => a.type === 'alert').length).toBeGreaterThan(0);
  });

  it('enforces cost caps with throttles and backout when budgets are exceeded', () => {
    const engine = new IntelGraphGuardrailEngine();
    const snapshot = buildSnapshot({
      cost: {
        ingestUnitCostPerThousand: 0.2,
        graphqlUnitCostPerMillion: 3,
        monthlyIngestCost: 4100,
        monthlyGraphqlCost: 4500,
      },
      connectors: [
        {
          id: 'conn-b',
          name: 'expensive-provider',
          latencyP95Ms: 90,
          throughputPerSecond: 1500,
          costPerEvent: 0.1,
          monthlySpend: 1200,
          monthlyBudget: 1000,
          errorRate: 0.02,
        },
      ],
    });

    const result = engine.evaluate(snapshot);
    const costViolations = result.violations.filter((v) => v.kind === 'cost');

    expect(costViolations.length).toBeGreaterThan(0);
    expect(result.actions.some((a) => a.type === 'throttle')).toBe(true);
    expect(result.actions.some((a) => a.type === 'backout')).toBe(true);
  });

  it('blocks non-compliant residency or purpose decisions with freeze actions', () => {
    const engine = new IntelGraphGuardrailEngine();
    const snapshot = buildSnapshot({
      residencyDecisions: [
        {
          resourceId: 'case-2',
          residency: 'apac',
          allowedResidencies: ['us', 'eu'],
          purpose: 'marketing',
          allowedPurposes: ['investigation', 'fraud'],
        },
      ],
    });

    const result = engine.evaluate(snapshot);
    const residencyViolations = result.violations.filter((v) => v.kind === 'residency');

    expect(residencyViolations).toHaveLength(2);
    expect(result.actions.some((a) => a.type === 'freeze')).toBe(true);
  });
});

describe('CostAndSloAwareBandit', () => {
  it('prefers low-cost, low-latency arms while honoring residency filters', () => {
    const bandit = new CostAndSloAwareBandit({ epsilon: 0 });
    const arms = [
      {
        id: 'arm-a',
        latencyP95Ms: 250,
        costPerEvent: 0.001,
        qualityScore: 0.9,
        residency: 'us',
        allowedResidencies: ['us', 'eu'],
        purpose: 'investigation',
        allowedPurposes: ['investigation'],
      },
      {
        id: 'arm-b',
        latencyP95Ms: 150,
        costPerEvent: 0.01,
        qualityScore: 0.8,
        residency: 'eu',
        allowedResidencies: ['eu'],
        purpose: 'investigation',
        allowedPurposes: ['investigation'],
      },
    ];

    const residencyChecks = [
      {
        resourceId: 'req-1',
        residency: 'us',
        allowedResidencies: ['us', 'eu'],
        purpose: 'investigation',
        allowedPurposes: ['investigation'],
      },
    ];

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const selected = bandit.selectArm(arms, residencyChecks);
    expect(selected.id).toBe('arm-b');
    vi.restoreAllMocks();
  });
});
