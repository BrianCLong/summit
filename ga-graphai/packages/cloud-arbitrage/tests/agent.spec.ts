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
  consumer: [
    {
      marketplace: 'prime',
      region: 'us-east-1',
      category: 'gaming-laptops',
      averagePrice: 1899,
      volume24h: 320,
      priceChangePercent: 6.2,
      demandScore: 0.78,
      sentimentScore: 0.7,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      marketplace: 'azure-market',
      region: 'eastus',
      category: 'ai-workstations',
      averagePrice: 2120,
      volume24h: 210,
      priceChangePercent: 4.5,
      demandScore: 0.72,
      sentimentScore: 0.68,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  collectibles: [
    {
      platform: 'mythic-auctions',
      region: 'us-east-1',
      collection: 'retro-gpu-lots',
      floorPrice: 12800,
      currency: 'USD',
      scarcityScore: 0.81,
      auctionClearRate: 0.64,
      sentimentScore: 0.62,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      platform: 'global-vault',
      region: 'global',
      collection: 'ai-chip-first-edition',
      floorPrice: 15600,
      currency: 'USD',
      scarcityScore: 0.86,
      auctionClearRate: 0.59,
      sentimentScore: 0.67,
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
    const feedA = new InMemoryDataFeed(
      baseSnapshot.financial,
      baseSnapshot.consumer,
      baseSnapshot.collectibles,
      [],
      [],
      []
    );
    const feedB = new InMemoryDataFeed(
      [],
      [],
      [],
      baseSnapshot.energy,
      baseSnapshot.demand,
      baseSnapshot.regulation
    );
    const composite = new CompositeDataFeed([feedA, feedB]);
    const snapshot = await composite.fetchSnapshot();
    expect(snapshot.financial).toHaveLength(2);
    expect(snapshot.consumer).toHaveLength(2);
    expect(snapshot.collectibles).toHaveLength(2);
    expect(snapshot.energy).toHaveLength(2);
    expect(snapshot.demand).toHaveLength(2);
    expect(snapshot.regulation).toHaveLength(2);
  });

  it('merges overlapping datasets with weighted averages', async () => {
    const feedA = new InMemoryDataFeed(
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          spotPricePerUnit: 0.18,
          reservedPricePerUnit: 0.24,
          currency: 'USD',
          timestamp: '2025-03-01T00:00:00.000Z'
        }
      ],
      [
        {
          marketplace: 'prime',
          region: 'us-east-1',
          category: 'gaming-laptops',
          averagePrice: 1900,
          volume24h: 200,
          priceChangePercent: 5,
          demandScore: 0.7,
          sentimentScore: 0.65,
          timestamp: '2025-03-01T00:00:00.000Z'
        }
      ],
      [
        {
          platform: 'mythic-auctions',
          region: 'us-east-1',
          collection: 'retro-gpu-lots',
          floorPrice: 12000,
          currency: 'USD',
          scarcityScore: 0.8,
          auctionClearRate: 0.6,
          sentimentScore: 0.6,
          timestamp: '2025-03-01T00:00:00.000Z'
        }
      ],
      [
        {
          region: 'us-east-1',
          carbonIntensityGramsPerKwh: 400,
          pricePerKwh: 0.12,
          timestamp: '2025-03-01T00:00:00.000Z'
        }
      ],
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          resource: 'compute',
          predictedUtilization: 0.6,
          confidence: 0.8,
          timestamp: '2025-03-01T00:00:00.000Z'
        }
      ],
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          incentivePerUnit: 0.01,
          penaltyPerUnit: 0.0,
          notes: 'legacy credit',
          effectiveDate: '2025-03-01'
        }
      ]
    );

    const feedB = new InMemoryDataFeed(
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          spotPricePerUnit: 0.16,
          reservedPricePerUnit: 0.22,
          currency: 'USD',
          timestamp: '2025-03-02T00:00:00.000Z'
        }
      ],
      [
        {
          marketplace: 'prime',
          region: 'us-east-1',
          category: 'gaming-laptops',
          averagePrice: 2100,
          volume24h: 400,
          priceChangePercent: 7,
          demandScore: 0.82,
          sentimentScore: 0.74,
          timestamp: '2025-03-02T00:00:00.000Z'
        }
      ],
      [
        {
          platform: 'mythic-auctions',
          region: 'us-east-1',
          collection: 'retro-gpu-lots',
          floorPrice: 14000,
          currency: 'USD',
          scarcityScore: 0.88,
          auctionClearRate: 0.66,
          sentimentScore: 0.68,
          timestamp: '2025-03-02T00:00:00.000Z'
        }
      ],
      [
        {
          region: 'us-east-1',
          carbonIntensityGramsPerKwh: 360,
          pricePerKwh: 0.1,
          timestamp: '2025-03-02T00:00:00.000Z'
        }
      ],
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          resource: 'compute',
          predictedUtilization: 0.55,
          confidence: 0.9,
          timestamp: '2025-03-02T00:00:00.000Z'
        }
      ],
      [
        {
          provider: 'aws',
          region: 'us-east-1',
          incentivePerUnit: 0.015,
          penaltyPerUnit: 0.0,
          notes: 'new sustainability credit',
          effectiveDate: '2025-03-05'
        }
      ]
    );

    const composite = new CompositeDataFeed([feedA, feedB]);
    const snapshot = await composite.fetchSnapshot();

    expect(snapshot.generatedAt).toBe('2025-03-05T00:00:00.000Z');

    const financial = snapshot.financial.find(entry => entry.provider === 'aws');
    expect(financial?.spotPricePerUnit).toBeCloseTo(0.17, 5);
    expect(financial?.reservedPricePerUnit).toBeCloseTo(0.23, 5);

    const consumer = snapshot.consumer.find(
      entry => entry.marketplace === 'prime' && entry.region === 'us-east-1'
    );
    expect(consumer?.volume24h).toBeCloseTo(600, 5);
    expect(consumer?.averagePrice).toBeCloseTo((1900 * 200 + 2100 * 400) / 600, 5);
    expect(consumer?.demandScore).toBeGreaterThan(0.7);

    const collectible = snapshot.collectibles.find(
      entry => entry.platform === 'mythic-auctions'
    );
    expect(collectible?.floorPrice).toBeCloseTo((12000 * 0.8 + 14000 * 0.88) / (0.8 + 0.88), 5);
    expect(collectible?.scarcityScore).toBeCloseTo((0.8 + 0.88) / 2, 5);

    const energy = snapshot.energy.find(entry => entry.region === 'us-east-1');
    expect(energy?.carbonIntensityGramsPerKwh).toBeCloseTo(380, 5);

    const demand = snapshot.demand.find(
      entry => entry.provider === 'aws' && entry.region === 'us-east-1'
    );
    expect(demand?.predictedUtilization).toBeCloseTo((0.6 + 0.55) / 2, 5);
    expect(demand?.confidence).toBeCloseTo((0.8 + 0.9) / 2, 5);

    const regulation = snapshot.regulation.find(entry => entry.provider === 'aws');
    expect(regulation?.effectiveDate).toBe('2025-03-05');
    expect(regulation?.incentivePerUnit).toBeCloseTo(0.015, 5);
  });
});

describe('ArbitrageAgent', () => {
  it('produces ranked recommendations for a workload', () => {
    const agent = new ArbitrageAgent();
    const portfolio = agent.recommendPortfolio(baseSnapshot, workload, { topN: 3 });
    expect(portfolio.length).toBeGreaterThan(0);
    expect(portfolio[0].estimatedSavings).toBeGreaterThan(0);
    expect(portfolio[0].arbitrageOpportunityScore).toBeGreaterThan(0);
    expect(portfolio[0].consumerSignalScore).toBeGreaterThan(0);
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
