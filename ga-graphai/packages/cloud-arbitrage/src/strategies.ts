import type {
  CollectibleSignalDatum,
  CompositeMarketSnapshot,
  ConsumerMarketDatum,
  DemandForecastDatum,
  FinancialMarketDatum,
  StrategyInput,
  StrategyRecommendation,
  WorkloadProfile
} from './types.js';

interface Strategy {
  readonly name: string;
  evaluate(input: StrategyInput): StrategyRecommendation[];
}

function getDemand(
  demand: DemandForecastDatum[],
  provider: string,
  region: string,
  resource: string
): DemandForecastDatum | undefined {
  return demand.find(
    datum => datum.provider === provider && datum.region === region && datum.resource === resource
  );
}

function getEnergyScore(snapshot: CompositeMarketSnapshot, region: string, weight: number): number {
  const energy = snapshot.energy.find(entry => entry.region === region);
  if (!energy) {
    return 0.5 * weight;
  }
  const normalizedCarbon = Math.max(0, 1 - energy.carbonIntensityGramsPerKwh / 600);
  return normalizedCarbon * weight;
}

function summarizeConsumerSignals(signals: ConsumerMarketDatum[], region: string): {
  score: number;
  momentum: number;
} {
  const regionSignals = signals.filter(signal => signal.region === region);
  if (!regionSignals.length) {
    return { score: 0.2, momentum: 0 };
  }

  const avgDemand =
    regionSignals.reduce((sum, signal) => sum + signal.demandScore, 0) / regionSignals.length;
  const avgSentiment =
    regionSignals.reduce((sum, signal) => sum + signal.sentimentScore, 0) / regionSignals.length;
  const avgMomentum =
    regionSignals.reduce((sum, signal) => sum + signal.priceChangePercent, 0) /
    regionSignals.length /
    100;
  const avgVolume =
    regionSignals.reduce((sum, signal) => sum + signal.volume24h, 0) / regionSignals.length;
  const volumeBoost = Math.min(0.2, Math.log10(Math.max(1, avgVolume + 1)) * 0.05);

  const score = Math.min(1, 0.2 + avgDemand * 0.35 + avgSentiment * 0.25 + volumeBoost);

  return { score, momentum: Math.max(-0.3, Math.min(0.4, avgMomentum)) };
}

function summarizeCollectibleSignals(signals: CollectibleSignalDatum[], region: string): {
  score: number;
  scarcityMomentum: number;
} {
  const regionSignals = signals.filter(
    signal => signal.region === region || signal.region.toLowerCase() === 'global'
  );
  if (!regionSignals.length) {
    return { score: 0.18, scarcityMomentum: 0 };
  }

  const avgScarcity =
    regionSignals.reduce((sum, signal) => sum + signal.scarcityScore, 0) / regionSignals.length;
  const avgClear =
    regionSignals.reduce((sum, signal) => sum + signal.auctionClearRate, 0) / regionSignals.length;
  const avgSentiment =
    regionSignals.reduce((sum, signal) => sum + signal.sentimentScore, 0) / regionSignals.length;
  const avgFloor =
    regionSignals.reduce((sum, signal) => sum + signal.floorPrice, 0) / regionSignals.length;
  const scarcityMomentum = Math.max(-0.25, Math.min(0.35, (avgScarcity - 0.5) * 0.5));
  const priceBoost = Math.min(0.2, Math.log10(Math.max(1, avgFloor + 1)) * 0.03);

  const score = Math.min(0.9, 0.18 + avgScarcity * 0.4 + avgClear * 0.2 + avgSentiment * 0.2 + priceBoost);

  return { score, scarcityMomentum };
}

function computeCrossMarketScores(
  financial: FinancialMarketDatum,
  consumer: { score: number; momentum: number },
  collectibles: { score: number; scarcityMomentum: number }
): {
  consumerScore: number;
  collectiblesScore: number;
  arbitrageOpportunityScore: number;
  hedgeScore: number;
} {
  const priceAnchor = Math.max(0.01, financial.spotPricePerUnit);
  const consumerPressure = Math.max(0, consumer.momentum) * 0.4 + consumer.score * 0.3;
  const scarcityPressure = Math.max(0, collectibles.scarcityMomentum) * 0.5 + collectibles.score * 0.25;
  const arbitrageOpportunityScore = Math.min(0.8, consumerPressure + scarcityPressure + 0.1 / priceAnchor);

  const hedgeDifferential = Math.abs(consumer.score - collectibles.score);
  const hedgeScore = Math.min(
    0.7,
    hedgeDifferential * 0.4 + Math.max(0, collectibles.scarcityMomentum - consumer.momentum) * 0.3
  );

  return {
    consumerScore: consumer.score,
    collectiblesScore: collectibles.score,
    arbitrageOpportunityScore,
    hedgeScore
  };
}

function getRegulatoryScore(
  snapshot: CompositeMarketSnapshot,
  provider: string,
  region: string
): number {
  const entry = snapshot.regulation.find(
    datum => datum.provider === provider && datum.region === region
  );
  if (!entry) {
    return 0.25;
  }
  return 0.5 + Math.max(0, entry.incentivePerUnit - entry.penaltyPerUnit) * 10;
}

function basePerformanceScore(demand: DemandForecastDatum | undefined, profile: WorkloadProfile): number {
  if (!demand) {
    return profile.availabilityTier === 'mission-critical' ? 0.6 : 0.5;
  }
  const utilizationFactor = 1 - Math.min(0.95, demand.predictedUtilization);
  const confidenceBoost = demand.confidence * 0.2;
  const tierWeight = profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
  return Math.max(0.3, tierWeight + utilizationFactor * 0.3 + confidenceBoost);
}

function buildRecommendations(
  snapshot: CompositeMarketSnapshot,
  profile: WorkloadProfile,
  priceSelector: (args: {
    spot: number;
    reserved: number;
    demand?: DemandForecastDatum;
    profile: WorkloadProfile;
  }) => number,
  label: string,
  modifier: (recommendation: StrategyRecommendation) => StrategyRecommendation = rec => rec
): StrategyRecommendation[] {
  return snapshot.financial.flatMap(financial => {
    const demand = getDemand(
      snapshot.demand,
      financial.provider,
      financial.region,
      'compute'
    );
    const consumerSignals = summarizeConsumerSignals(snapshot.consumer, financial.region);
    const collectibleSignals = summarizeCollectibleSignals(
      snapshot.collectibles,
      financial.region
    );
    const crossMarket = computeCrossMarketScores(financial, consumerSignals, collectibleSignals);
    const basePrice = priceSelector({
      spot: financial.spotPricePerUnit,
      reserved: financial.reservedPricePerUnit,
      demand,
      profile
    });
    const energyScore = getEnergyScore(snapshot, financial.region, profile.sustainabilityWeight);
    const regulatoryScore = getRegulatoryScore(snapshot, financial.provider, financial.region);
    const performanceScore = basePerformanceScore(demand, profile);
    const totalScore =
      performanceScore +
      energyScore +
      regulatoryScore +
      crossMarket.consumerScore +
      crossMarket.collectiblesScore +
      crossMarket.arbitrageOpportunityScore +
      crossMarket.hedgeScore;

    const recommendation: StrategyRecommendation = {
      strategy: label,
      provider: financial.provider,
      region: financial.region,
      resource: 'compute',
      expectedUnitPrice: basePrice,
      expectedPerformanceScore: performanceScore,
      sustainabilityScore: energyScore,
      regulatoryScore,
      consumerSignalScore: crossMarket.consumerScore,
      collectiblesSignalScore: crossMarket.collectiblesScore,
      arbitrageOpportunityScore: crossMarket.arbitrageOpportunityScore,
      hedgeScore: crossMarket.hedgeScore,
      totalScore
    };

    return [modifier(recommendation)];
  });
}

export class ServerlessFirstStrategy implements Strategy {
  readonly name = 'serverless';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ reserved, profile }) => {
        const availabilityPremium = profile.availabilityTier === 'mission-critical' ? 1.25 : 1.1;
        return reserved * availabilityPremium;
      },
      this.name,
      recommendation => ({
        ...recommendation,
        expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.1,
        totalScore: recommendation.totalScore + 0.1
      })
    );
  }
}

export class BurstBufferStrategy implements Strategy {
  readonly name = 'burst';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, demand, profile }) => {
        const burstRisk = demand ? demand.predictedUtilization : 0.6;
        const multiplier = profile.burstable ? 0.95 : 1.05;
        return spot * (1 + burstRisk * 0.2) * multiplier;
      },
      this.name
    );
  }
}

export class ReservedRightsStrategy implements Strategy {
  readonly name = 'reserved';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ reserved, demand }) => {
        const utilization = demand ? demand.predictedUtilization : 0.5;
        return reserved * (0.85 + utilization * 0.1);
      },
      this.name,
      recommendation => ({
        ...recommendation,
        expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.05,
        totalScore: recommendation.totalScore + 0.05
      })
    );
  }
}

export class SpotRebalanceStrategy implements Strategy {
  readonly name = 'spot';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, demand }) => {
        const volatility = demand ? 1 - demand.confidence : 0.4;
        return spot * (1 + volatility * 0.3);
      },
      this.name,
      recommendation => ({
        ...recommendation,
        expectedPerformanceScore: recommendation.expectedPerformanceScore - 0.1,
        totalScore: recommendation.totalScore - 0.05
      })
    );
  }
}

export class FederatedMultiCloudStrategy implements Strategy {
  readonly name = 'federated';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    const base = buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, reserved, profile }) => {
        const mix = profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
        return spot * (1 - mix * 0.2) + reserved * mix * 0.8;
      },
      this.name
    );

    const sorted = [...base].sort((a, b) => a.totalScore - b.totalScore);
    const lowestScore = sorted.length ? sorted[0].totalScore : 0;

    return base.map(recommendation => ({
      ...recommendation,
      totalScore: recommendation.totalScore + (recommendation.totalScore - lowestScore) * 0.05,
      expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.05
    }));
  }
}

export const STRATEGIES: Strategy[] = [
  new ServerlessFirstStrategy(),
  new BurstBufferStrategy(),
  new ReservedRightsStrategy(),
  new SpotRebalanceStrategy(),
  new FederatedMultiCloudStrategy()
];
