import type {
  CollectibleMarketDatum,
  CommodityMarketDatum,
  CompositeMarketSnapshot,
  ConsumerMarketplaceDatum,
  CryptoMarketDatum,
  DemandForecastDatum,
  DerivativesFlowDatum,
  ExoticOpportunityDatum,
  ForexMarketDatum,
  MetaSignalInsight,
  PredictionMarketDatum,
  SportsPredictionDatum,
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

function normalizeRange(value: number, min: number, max: number): number {
  if (max === min) {
    return 0;
  }
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function normalizeSentiment(value: number): number {
  return Math.min(1, Math.max(0, (value + 1) / 2));
}

function computeConsumerScore(entries: ConsumerMarketplaceDatum[]): number {
  if (!entries.length) {
    return 0.2;
  }
  const totalVolume = entries.reduce((sum, entry) => sum + entry.volume24h, 0);
  const avgPriceChange =
    entries.reduce((sum, entry) => sum + entry.priceChange24hPct, 0) / entries.length;
  const avgSentiment =
    entries.reduce((sum, entry) => sum + normalizeSentiment(entry.sentimentScore), 0) /
    entries.length;
  const volumeScore = Math.min(1, Math.log10(1 + totalVolume) / 5);
  const trendScore = normalizeRange(avgPriceChange, -20, 20);
  return 0.5 * volumeScore + 0.3 * avgSentiment + 0.2 * trendScore;
}

function computeCollectibleScore(entries: CollectibleMarketDatum[]): number {
  if (!entries.length) {
    return 0.15;
  }
  const avgScarcity =
    entries.reduce((sum, entry) => sum + Math.min(1, Math.max(0, entry.scarcityIndex)), 0) /
    entries.length;
  const avgSentiment =
    entries.reduce((sum, entry) => sum + normalizeSentiment(entry.auctionSentiment), 0) /
    entries.length;
  const avgCoverage =
    entries.reduce((sum, entry) => sum + Math.min(1, entry.bidCoverageRatio / 3), 0) / entries.length;
  const avgPriceTrend =
    entries.reduce((sum, entry) => sum + entry.clearingPriceChange24hPct, 0) / entries.length;
  const trendScore = normalizeRange(avgPriceTrend, -25, 25);
  return 0.4 * avgScarcity + 0.3 * avgSentiment + 0.2 * avgCoverage + 0.1 * trendScore;
}

function computePredictionScore(entries: PredictionMarketDatum[]): number {
  if (!entries.length) {
    return 0.2;
  }
  const avgProbability =
    entries.reduce((sum, entry) => sum + entry.impliedProbability, 0) / entries.length;
  const liquidityScore =
    entries.reduce((sum, entry) => sum + entry.liquidityScore, 0) / entries.length;
  const momentumScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.priceChange24hPct, 0) / entries.length,
    -30,
    30
  );
  return 0.45 * avgProbability + 0.35 * Math.min(1, liquidityScore) + 0.2 * momentumScore;
}

function computeCryptoScore(entries: CryptoMarketDatum[]): number {
  if (!entries.length) {
    return 0.2;
  }
  const avgFunding =
    entries.reduce((sum, entry) => sum + entry.fundingRate, 0) / entries.length;
  const oiScore =
    entries.reduce((sum, entry) => sum + entry.openInterestChangePct, 0) / entries.length;
  const momentumScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.priceChange1hPct, 0) / entries.length,
    -10,
    10
  );
  const liquidity =
    entries.reduce((sum, entry) => sum + Math.log10(1 + Math.max(0, entry.volume24h)), 0) /
    entries.length /
    6;
  return (
    0.25 * normalizeRange(avgFunding, -0.05, 0.05) +
    0.35 * normalizeRange(oiScore, -30, 30) +
    0.25 * momentumScore +
    0.15 * Math.min(1, liquidity)
  );
}

function computeForexScore(entries: ForexMarketDatum[]): number {
  if (!entries.length) {
    return 0.15;
  }
  const avgVolatility =
    entries.reduce((sum, entry) => sum + entry.volatilityScore, 0) / entries.length;
  const spreadScore =
    entries.reduce((sum, entry) => sum + (entry.spreadPips > 0 ? 1 / entry.spreadPips : 0), 0) /
    entries.length /
    5;
  const momentumScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.rateChange1hPct, 0) / entries.length,
    -2,
    2
  );
  return 0.4 * Math.min(1, avgVolatility) + 0.35 * Math.min(1, spreadScore) + 0.25 * momentumScore;
}

function computeDerivativesScore(entries: DerivativesFlowDatum[]): number {
  if (!entries.length) {
    return 0.2;
  }
  const ivScore =
    entries.reduce((sum, entry) => sum + entry.ivPercentile, 0) / entries.length / 100;
  const skewScore =
    entries.reduce((sum, entry) => sum + Math.abs(entry.skewScore), 0) /
    entries.length /
    4;
  const flowScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.flowBalance, 0) / entries.length,
    -1,
    1
  );
  return 0.3 * Math.min(1, ivScore) + 0.4 * Math.min(1, skewScore) + 0.3 * flowScore;
}

function computeCommodityScore(entries: CommodityMarketDatum[]): number {
  if (!entries.length) {
    return 0.18;
  }
  const supplyStress =
    entries.reduce((sum, entry) => sum + entry.supplyStressScore, 0) / entries.length;
  const backwardationScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.backwardationPct, 0) / entries.length,
    -10,
    10
  );
  const storageScore = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.storageCostPct, 0) / entries.length,
    0,
    20
  );
  return 0.45 * Math.min(1, supplyStress) + 0.35 * backwardationScore + 0.2 * (1 - storageScore);
}

function computeSportsScore(entries: SportsPredictionDatum[]): number {
  if (!entries.length) {
    return 0.12;
  }
  const edgeScore =
    entries.reduce((sum, entry) => sum + entry.impliedEdgePct, 0) / entries.length;
  const liquidity =
    entries.reduce((sum, entry) => sum + entry.liquidityScore, 0) / entries.length;
  const momentum = normalizeRange(
    entries.reduce((sum, entry) => sum + entry.priceChange1hPct, 0) / entries.length,
    -15,
    15
  );
  return 0.45 * normalizeRange(edgeScore, -10, 10) + 0.3 * Math.min(1, liquidity) + 0.25 * momentum;
}

function computeExoticScore(entries: ExoticOpportunityDatum[]): number {
  if (!entries.length) {
    return 0.1;
  }
  const evScore =
    entries.reduce((sum, entry) => sum + entry.expectedValuePct, 0) / entries.length;
  const scarcity =
    entries.reduce((sum, entry) => sum + entry.scarcityScore, 0) / entries.length;
  const regulatoryRisk =
    entries.reduce((sum, entry) => sum + entry.regulatoryRiskScore, 0) / entries.length;
  return (
    0.5 * normalizeRange(evScore, -25, 25) +
    0.3 * Math.min(1, scarcity) +
    0.2 * (1 - Math.min(1, regulatoryRisk))
  );
}

function computeMetaSignalMetrics(entries: MetaSignalInsight[]): {
  metaScore: number;
  cascadeScore: number;
  frontRunConfidence: number;
} {
  if (!entries.length) {
    return { metaScore: 0.15, cascadeScore: 0.1, frontRunConfidence: 0.1 };
  }
  const avgConfidence =
    entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length;
  const avgImpact =
    entries.reduce((sum, entry) => sum + entry.expectedImpactScore, 0) / entries.length;
  const avgLeadTime =
    entries.reduce((sum, entry) => sum + entry.leadTimeSeconds, 0) / entries.length;
  const avgCascade =
    entries.reduce((sum, entry) => sum + entry.cascadeDepth, 0) / entries.length;
  const leadScore = normalizeRange(avgLeadTime, 5, 600);
  return {
    metaScore: 0.4 * Math.min(1, avgImpact) + 0.35 * Math.min(1, avgConfidence) + 0.25 * (1 - leadScore),
    cascadeScore: Math.min(1, avgCascade / 5),
    frontRunConfidence: Math.min(1, (avgConfidence + (1 - leadScore)) / 2)
  };
}

function detectSpread(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  if (maxVal <= 0) {
    return 0;
  }
  return Math.min(1, (maxVal - minVal) / maxVal);
}

function calculateCrossMarketSignals(
  snapshot: CompositeMarketSnapshot,
  region: string
): {
  consumerScore: number;
  collectibleScore: number;
  predictionScore: number;
  cryptoScore: number;
  forexScore: number;
  derivativesScore: number;
  commodityScore: number;
  sportsScore: number;
  exoticScore: number;
  metaSignalScore: number;
  cascadeScore: number;
  frontRunConfidence: number;
  crossMarketScore: number;
  arbitrageStrength: number;
  hedgeStrength: number;
} {
  const consumerEntries = snapshot.consumer.filter(entry => entry.region === region);
  const collectibleEntries = snapshot.collectibles.filter(entry => entry.region === region);
  const predictionEntries = snapshot.prediction.filter(entry => entry.region === region);
  const cryptoEntries = snapshot.crypto.filter(entry => entry.region === region);
  const forexEntries = snapshot.forex.filter(entry => entry.region === region);
  const derivativeEntries = snapshot.derivatives.filter(entry => entry.region === region);
  const commodityEntries = snapshot.commodities.filter(entry => entry.region === region);
  const sportsEntries = snapshot.sports.filter(entry => entry.region === region);
  const exoticEntries = snapshot.exotic.filter(entry => entry.region === region);
  const metaEntries = snapshot.metaSignals.filter(entry => entry.region === region);

  const consumerScore = computeConsumerScore(consumerEntries);
  const collectibleScore = computeCollectibleScore(collectibleEntries);
  const predictionScore = computePredictionScore(predictionEntries);
  const cryptoScore = computeCryptoScore(cryptoEntries);
  const forexScore = computeForexScore(forexEntries);
  const derivativesScore = computeDerivativesScore(derivativeEntries);
  const commodityScore = computeCommodityScore(commodityEntries);
  const sportsScore = computeSportsScore(sportsEntries);
  const exoticScore = computeExoticScore(exoticEntries);
  const { metaScore: metaSignalScore, cascadeScore, frontRunConfidence } =
    computeMetaSignalMetrics(metaEntries);

  const consumerSpread = detectSpread(consumerEntries.map(entry => entry.averagePrice));
  const collectibleSpread = detectSpread(collectibleEntries.map(entry => entry.clearingPrice));
  const forexSpread = detectSpread(forexEntries.map(entry => entry.spotRate));
  const cryptoSpread = detectSpread(cryptoEntries.map(entry => entry.price));
  const commoditySpread = detectSpread(commodityEntries.map(entry => entry.spotPrice));
  const arbitrageStrength = Math.max(
    consumerSpread,
    collectibleSpread,
    forexSpread,
    cryptoSpread,
    commoditySpread
  );

  const consumerSentiment = consumerEntries.length
    ? consumerEntries.reduce((sum, entry) => sum + normalizeSentiment(entry.sentimentScore), 0) /
        consumerEntries.length
    : 0.4;
  const collectibleSentiment = collectibleEntries.length
    ? collectibleEntries.reduce((sum, entry) => sum + normalizeSentiment(entry.auctionSentiment), 0) /
        collectibleEntries.length
    : 0.5;
  const derivativeBias = derivativesScore - cryptoScore;
  const sentimentDelta = collectibleSentiment - consumerSentiment;
  const hedgeStrength = Math.min(
    1,
    Math.max(0, sentimentDelta * 1.2) + Math.max(0, derivativeBias * 0.6) + commodityScore * 0.2
  );

  const crossMarketScore =
    0.2 * consumerScore +
    0.15 * collectibleScore +
    0.12 * predictionScore +
    0.12 * cryptoScore +
    0.1 * forexScore +
    0.09 * derivativesScore +
    0.08 * commodityScore +
    0.06 * sportsScore +
    0.04 * exoticScore +
    0.04 * metaSignalScore;

  return {
    consumerScore,
    collectibleScore,
    predictionScore,
    cryptoScore,
    forexScore,
    derivativesScore,
    commodityScore,
    sportsScore,
    exoticScore,
    metaSignalScore,
    cascadeScore,
    frontRunConfidence,
    crossMarketScore,
    arbitrageStrength,
    hedgeStrength
  };
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
    const crossSignals = calculateCrossMarketSignals(snapshot, financial.region);
    const totalScore =
      performanceScore +
      energyScore +
      regulatoryScore +
      crossSignals.crossMarketScore +
      crossSignals.metaSignalScore * 0.4 +
      crossSignals.cascadeScore * 0.3 +
      crossSignals.frontRunConfidence * 0.2;

    const recommendation: StrategyRecommendation = {
      strategy: label,
      provider: financial.provider,
      region: financial.region,
      resource: 'compute',
      expectedUnitPrice: basePrice,
      expectedPerformanceScore: performanceScore,
      sustainabilityScore: energyScore,
      regulatoryScore,
      consumerScore: crossSignals.consumerScore,
      collectibleScore: crossSignals.collectibleScore,
      predictionScore: crossSignals.predictionScore,
      cryptoScore: crossSignals.cryptoScore,
      forexScore: crossSignals.forexScore,
      derivativesScore: crossSignals.derivativesScore,
      commodityScore: crossSignals.commodityScore,
      sportsScore: crossSignals.sportsScore,
      exoticScore: crossSignals.exoticScore,
      metaSignalScore: crossSignals.metaSignalScore,
      cascadeScore: crossSignals.cascadeScore,
      frontRunConfidence: crossSignals.frontRunConfidence,
      crossMarketScore: crossSignals.crossMarketScore,
      arbitrageSignalStrength: crossSignals.arbitrageStrength,
      hedgeSignalStrength: crossSignals.hedgeStrength,
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
