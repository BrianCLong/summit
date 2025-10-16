import type {
  CollectibleMarketDatum,
  CompositeMarketSnapshot,
  ConsumerMarketDatum,
  CrossMarketAction,
  DemandForecastDatum,
  HedgeInstrumentDatum,
  PredictionMarketDatum,
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

function scoreConsumerSignals(signals: ConsumerMarketDatum[]): {
  actions: CrossMarketAction[];
  score: number;
} {
  if (!signals.length) {
    return { actions: [], score: 0 };
  }
  const sorted = [...signals].sort((a, b) => {
    const aScore = a.arbitrageSpread + a.demandSurgeProbability + a.sentimentScore;
    const bScore = b.arbitrageSpread + b.demandSurgeProbability + b.sentimentScore;
    return bScore - aScore;
  });
  const top = sorted[0];
  const expectedValue = top.arbitrageSpread * top.volume24h;
  const confidence = Math.min(0.95, (top.demandSurgeProbability + top.sentimentScore) / 2);
  const action: CrossMarketAction = {
    domain: 'consumer',
    description: `Exploit ${top.marketplace} ${top.category} spread on ${top.sku}`,
    expectedValue,
    confidence,
    linkedAssets: [top.sku]
  };
  const score = Math.min(0.5, confidence * 0.4 + Math.max(0, top.arbitrageSpread) * 0.05);
  return { actions: [action], score };
}

function scoreCollectibleSignals(signals: CollectibleMarketDatum[]): {
  actions: CrossMarketAction[];
  score: number;
} {
  if (!signals.length) {
    return { actions: [], score: 0 };
  }
  const sorted = [...signals].sort((a, b) => {
    const aScore = a.scarcityIndex + a.sentimentScore + a.liquidityScore;
    const bScore = b.scarcityIndex + b.sentimentScore + b.liquidityScore;
    return bScore - aScore;
  });
  const top = sorted[0];
  const expectedValue = top.medianPrice * Math.max(0, top.priceChange7d) * 0.1;
  const confidence = Math.min(0.9, (top.sentimentScore + top.liquidityScore) / 2);
  const action: CrossMarketAction = {
    domain: 'collectible',
    description: `Market-make ${top.assetType} ${top.assetId} on ${top.platform}`,
    expectedValue,
    confidence,
    linkedAssets: [top.assetId]
  };
  const score = Math.min(0.4, confidence * 0.3 + top.scarcityIndex * 0.05);
  return { actions: [action], score };
}

function scorePredictionSignals(signals: PredictionMarketDatum[]): {
  actions: CrossMarketAction[];
  score: number;
} {
  if (!signals.length) {
    return { actions: [], score: 0 };
  }
  const sorted = [...signals].sort((a, b) => {
    const aScore = a.probability * a.crowdMomentum * Math.max(1, a.liquidity);
    const bScore = b.probability * b.crowdMomentum * Math.max(1, b.liquidity);
    return bScore - aScore;
  });
  const top = sorted[0];
  const expectedValue = top.probability * top.liquidity * Math.max(0.1, Math.abs(top.impliedOddsChange24h));
  const confidence = Math.min(0.95, (top.probability + top.crowdMomentum) / 2);
  const action: CrossMarketAction = {
    domain: 'prediction',
    description: `Trade ${top.outcome} on ${top.market}`,
    expectedValue,
    confidence,
    linkedAssets: top.linkedAssets ?? []
  };
  const score = Math.min(0.4, confidence * 0.35 + Math.abs(top.impliedOddsChange24h) * 0.05);
  return { actions: [action], score };
}

function scoreHedges(signals: HedgeInstrumentDatum[]): {
  actions: CrossMarketAction[];
  hedgeEffectiveness: number;
  score: number;
} {
  if (!signals.length) {
    return { actions: [], hedgeEffectiveness: 0.25, score: 0.05 };
  }
  const aggregateConfidence =
    signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length;
  const averageDelta =
    signals.reduce((sum, signal) => sum + Math.abs(signal.delta), 0) / signals.length;
  const hedgeEffectiveness = Math.min(0.95, aggregateConfidence * 0.6 + averageDelta * 0.4);
  const action: CrossMarketAction = {
    domain: 'hedge',
    description: `Deploy ${signals[0].instrumentType} coverage (${signals.length} legs)`,
    expectedValue:
      signals.reduce((sum, signal) => sum + (signal.strike - signal.premium) * signal.confidence, 0) /
      Math.max(1, signals.length),
    confidence: aggregateConfidence,
    linkedAssets: Array.from(new Set(signals.map(signal => signal.symbol)))
  };
  const score = Math.min(0.35, hedgeEffectiveness * 0.35);
  return { actions: [action], hedgeEffectiveness, score };
}

function deriveCrossMarketSignals(
  snapshot: CompositeMarketSnapshot,
  provider: string,
  region: string
): { actions: CrossMarketAction[]; score: number; hedgeEffectiveness: number } {
  const consumerSignals = snapshot.consumer.filter(entry => entry.region === region);
  const collectibleSignals = snapshot.collectibles.filter(entry => entry.region === region);
  const predictionSignals = snapshot.prediction.filter(entry => !entry.region || entry.region === region);
  const hedgeSignals = snapshot.hedges.filter(
    entry => entry.region === region && entry.provider === provider
  );

  const consumer = scoreConsumerSignals(consumerSignals);
  const collectible = scoreCollectibleSignals(collectibleSignals);
  const prediction = scorePredictionSignals(predictionSignals);
  const hedge = scoreHedges(hedgeSignals);

  const actions = [...consumer.actions, ...collectible.actions, ...prediction.actions, ...hedge.actions];
  const score = consumer.score + collectible.score + prediction.score + hedge.score;

  return { actions, score, hedgeEffectiveness: hedge.hedgeEffectiveness };
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
    const basePrice = priceSelector({
      spot: financial.spotPricePerUnit,
      reserved: financial.reservedPricePerUnit,
      demand,
      profile
    });
    const energyScore = getEnergyScore(snapshot, financial.region, profile.sustainabilityWeight);
    const regulatoryScore = getRegulatoryScore(snapshot, financial.provider, financial.region);
    const performanceScore = basePerformanceScore(demand, profile);
    const crossMarket = deriveCrossMarketSignals(snapshot, financial.provider, financial.region);
    const totalScore = performanceScore + energyScore + regulatoryScore + crossMarket.score;

    const recommendation: StrategyRecommendation = {
      strategy: label,
      provider: financial.provider,
      region: financial.region,
      resource: 'compute',
      expectedUnitPrice: basePrice,
      expectedPerformanceScore: performanceScore,
      sustainabilityScore: energyScore,
      regulatoryScore,
      totalScore,
      hedgeEffectiveness: crossMarket.hedgeEffectiveness,
      crossMarketActions: crossMarket.actions
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
