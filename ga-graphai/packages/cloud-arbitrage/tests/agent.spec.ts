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
  consumer: [
    {
      marketplace: 'prime-market',
      region: 'us-east-1',
      category: 'gaming',
      sku: 'console-x',
      averagePrice: 499,
      priceChange24hPct: 3.1,
      volume24h: 4200,
      sentimentScore: 0.65,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      marketplace: 'cloud-mart',
      region: 'eastus',
      category: 'enterprise-ai',
      sku: 'model-suite',
      averagePrice: 950,
      priceChange24hPct: -1.2,
      volume24h: 1800,
      sentimentScore: -0.1,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  collectibles: [
    {
      venue: 'metaverse-auctions',
      region: 'us-east-1',
      collection: 'quantum-beasts',
      assetId: 'qb-101',
      scarcityIndex: 0.82,
      clearingPrice: 12.4,
      clearingPriceChange24hPct: 5.3,
      bidCoverageRatio: 2.6,
      auctionSentiment: 0.4,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      venue: 'heritage-houses',
      region: 'eastus',
      collection: 'vintage-nodes',
      assetId: 'vn-77',
      scarcityIndex: 0.67,
      clearingPrice: 8.9,
      clearingPriceChange24hPct: -0.8,
      bidCoverageRatio: 1.9,
      auctionSentiment: 0.15,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  prediction: [
    {
      market: 'polymarket',
      region: 'us-east-1',
      eventId: 'election-2028',
      contract: 'incumbent-win',
      impliedProbability: 0.62,
      liquidityScore: 0.74,
      volume24h: 680000,
      priceChange24hPct: 4.5,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      market: 'kalshi',
      region: 'eastus',
      eventId: 'fed-hike',
      contract: 'hike-50bps',
      impliedProbability: 0.41,
      liquidityScore: 0.58,
      volume24h: 240000,
      priceChange24hPct: -2.1,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  crypto: [
    {
      exchange: 'deribit',
      region: 'us-east-1',
      pair: 'BTC-USD',
      price: 64250,
      priceChange1hPct: 1.2,
      fundingRate: 0.004,
      openInterestChangePct: 12,
      volume24h: 1250000000,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      exchange: 'binance',
      region: 'eastus',
      pair: 'ETH-USD',
      price: 3450,
      priceChange1hPct: -0.6,
      fundingRate: -0.0008,
      openInterestChangePct: -4,
      volume24h: 450000000,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  forex: [
    {
      venue: 'fx-all',
      region: 'us-east-1',
      pair: 'USD/EUR',
      spotRate: 0.92,
      rateChange1hPct: 0.08,
      spreadPips: 1.1,
      volatilityScore: 0.42,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      venue: 'cme-g10',
      region: 'eastus',
      pair: 'USD/JPY',
      spotRate: 151.8,
      rateChange1hPct: -0.05,
      spreadPips: 0.9,
      volatilityScore: 0.36,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  derivatives: [
    {
      venue: 'cboe',
      region: 'us-east-1',
      instrument: 'SPX-20250315-4500C',
      optionType: 'call',
      notionalUsd: 5200000,
      skewScore: 1.6,
      ivPercentile: 72,
      flowBalance: 0.28,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      venue: 'cme',
      region: 'eastus',
      instrument: 'CL-202504-puts',
      optionType: 'put',
      notionalUsd: 3100000,
      skewScore: -1.2,
      ivPercentile: 64,
      flowBalance: -0.14,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  commodities: [
    {
      venue: 'nymex',
      region: 'us-east-1',
      commodity: 'natural-gas',
      spotPrice: 3.1,
      storageCostPct: 6.4,
      backwardationPct: 8.5,
      supplyStressScore: 0.66,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      venue: 'lme',
      region: 'eastus',
      commodity: 'copper',
      spotPrice: 4.2,
      storageCostPct: 3.1,
      backwardationPct: -2.5,
      supplyStressScore: 0.41,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  sports: [
    {
      book: 'pinnacle',
      region: 'us-east-1',
      eventId: 'superbowl-2026',
      marketType: 'moneyline',
      impliedEdgePct: 6.5,
      liquidityScore: 0.7,
      priceChange1hPct: 1.9,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      book: 'draftkings',
      region: 'eastus',
      eventId: 'nba-finals',
      marketType: 'series-price',
      impliedEdgePct: -2.3,
      liquidityScore: 0.55,
      priceChange1hPct: -0.9,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  exotic: [
    {
      venue: 'collectors-dao',
      region: 'us-east-1',
      assetType: 'luxury-watch',
      opportunityLabel: 'limited-release-flip',
      expectedValuePct: 18,
      scarcityScore: 0.82,
      regulatoryRiskScore: 0.2,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      venue: 'carbon-bets',
      region: 'eastus',
      assetType: 'offset-future',
      opportunityLabel: 'policy-driven-arb',
      expectedValuePct: 9,
      scarcityScore: 0.55,
      regulatoryRiskScore: 0.35,
      timestamp: '2025-03-01T00:00:00.000Z'
    }
  ],
  metaSignals: [
    {
      region: 'us-east-1',
      leadingIndicator: 'on-chain-whale-tracking',
      targetSignal: 'btc-breakout',
      leadTimeSeconds: 480,
      confidence: 0.78,
      expectedImpactScore: 0.72,
      cascadeDepth: 3,
      timestamp: '2025-03-01T00:00:00.000Z'
    },
    {
      region: 'eastus',
      leadingIndicator: 'fed-speech-tonality-ai',
      targetSignal: 'rates-volatility',
      leadTimeSeconds: 900,
      confidence: 0.69,
      expectedImpactScore: 0.64,
      cascadeDepth: 2,
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
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      []
    );
    const feedB = new InMemoryDataFeed(
      [],
      baseSnapshot.energy,
      baseSnapshot.consumer,
      baseSnapshot.collectibles,
      baseSnapshot.prediction,
      baseSnapshot.crypto,
      baseSnapshot.forex,
      baseSnapshot.derivatives,
      baseSnapshot.commodities,
      baseSnapshot.sports,
      baseSnapshot.exotic,
      baseSnapshot.metaSignals,
      baseSnapshot.demand,
      baseSnapshot.regulation
    );
    const composite = new CompositeDataFeed([feedA, feedB]);
    const snapshot = await composite.fetchSnapshot();
    expect(snapshot.financial).toHaveLength(2);
    expect(snapshot.energy).toHaveLength(2);
    expect(snapshot.consumer).toHaveLength(2);
    expect(snapshot.collectibles).toHaveLength(2);
    expect(snapshot.prediction).toHaveLength(2);
    expect(snapshot.crypto).toHaveLength(2);
    expect(snapshot.forex).toHaveLength(2);
    expect(snapshot.derivatives).toHaveLength(2);
    expect(snapshot.commodities).toHaveLength(2);
    expect(snapshot.sports).toHaveLength(2);
    expect(snapshot.exotic).toHaveLength(2);
    expect(snapshot.metaSignals).toHaveLength(2);
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
    expect(portfolio[0].crossMarketScore).toBeGreaterThanOrEqual(0);
    expect(portfolio[0].arbitrageStrength).toBeGreaterThanOrEqual(0);
    expect(portfolio[0].metaSignalScore).toBeGreaterThanOrEqual(0);
    expect(portfolio[0].frontRunConfidence).toBeGreaterThanOrEqual(0);
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
