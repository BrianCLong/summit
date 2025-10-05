import { describe, expect, it } from 'vitest';
import {
  ArbitrageAgent,
  CompositeDataFeed,
  HeadToHeadEvaluator,
  InMemoryDataFeed
} from '../src/index.js';
import type { BaselineRun } from '../src/evaluator.js';
import type { CompositeMarketSnapshot, WorkloadProfile } from '../src/types.js';

const baseSnapshot: CompositeMarketSnapshot = {
  generatedAt: '2025-03-01T00:00:00.000Z',
  financial: [
    {
      provider: 'aws',
      region: 'us-east-1',
      spotPricePerUnit: 0.18,
      reservedPricePerUnit: 0.24,
      currency: 'USD',
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      provider: 'azure',
      region: 'eastus',
      spotPricePerUnit: 0.2,
      reservedPricePerUnit: 0.26,
      currency: 'USD',
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  energy: [
    {
      region: 'us-east-1',
      carbonIntensityGramsPerKwh: 380,
      pricePerKwh: 0.11,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      region: 'eastus',
      carbonIntensityGramsPerKwh: 460,
      pricePerKwh: 0.12,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  demand: [
    {
      provider: 'aws',
      region: 'us-east-1',
      resource: 'compute',
      predictedUtilization: 0.62,
      confidence: 0.8,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      provider: 'azure',
      region: 'eastus',
      resource: 'compute',
      predictedUtilization: 0.54,
      confidence: 0.7,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  regulation: [
    {
      provider: 'aws',
      region: 'us-east-1',
      incentivePerUnit: 0.02,
      penaltyPerUnit: 0.01,
      notes: 'energy credit',
      effectiveDate: '2025-02-01'
    },
    {
      provider: 'azure',
      region: 'eastus',
      incentivePerUnit: 0.015,
      penaltyPerUnit: 0.0,
      notes: 'sustainability grant',
      effectiveDate: '2025-01-15'
    }
  ]
};

const workload: WorkloadProfile = {
  id: 'analytics-cluster',
  description: 'High concurrency analytics workload',
  resourceBreakdown: { compute: 0.7, storage: 0.2, network: 0.1 },
  availabilityTier: 'mission-critical',
  burstable: true,
  sustainabilityWeight: 0.6
};

describe('CompositeDataFeed', () => {
  it('aggregates data across multiple sources', async () => {
    const feedA = new InMemoryDataFeed(baseSnapshot.financial, [], [], []);
    const feedB = new InMemoryDataFeed([], baseSnapshot.energy, baseSnapshot.demand, baseSnapshot.regulation);
    const composite = new CompositeDataFeed([feedA, feedB]);
    const snapshot = await composite.fetchSnapshot();
    expect(snapshot.financial).toHaveLength(2);
    expect(snapshot.energy).toHaveLength(2);
    expect(snapshot.demand).toHaveLength(2);
    expect(snapshot.regulation).toHaveLength(2);
  });
});

describe('ArbitrageAgent', () => {
  it('produces ranked recommendations for a workload', () => {
    const agent = new ArbitrageAgent();
    const portfolio = agent.recommendPortfolio(baseSnapshot, workload, { topN: 3 });
    expect(portfolio.length).toBeGreaterThan(0);
    expect(portfolio[0].estimatedSavings).toBeGreaterThan(0);
  });
});

describe('HeadToHeadEvaluator', () => {
  it('computes net benefit relative to baselines', () => {
    const evaluator = new HeadToHeadEvaluator();
    const baselines: BaselineRun[] = [
      {
        tool: 'aws-compute-optimizer',
        workload,
        baselineSavings: 0.04
      },
      {
        tool: 'spot-io',
        workload: {
          ...workload,
          id: 'burst-etl',
          burstable: true,
          availabilityTier: 'flex'
        },
        baselineSavings: 0.06
      }
    ];
    const report = evaluator.run(baseSnapshot, baselines);
    expect(report.results).toHaveLength(2);
    for (const result of report.results) {
      expect(result.agentSavings).toBeGreaterThan(0);
      expect(result.agentSummary.strategy).toBeTruthy();
    }
    expect(report.aggregateNetBenefit).toBeGreaterThan(-0.1);
  });
});
