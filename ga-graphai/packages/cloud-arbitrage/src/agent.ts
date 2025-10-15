import { STRATEGIES } from './strategies.js';
import type {
  CompositeMarketSnapshot,
  StrategyRecommendation,
  StrategySummary,
  WorkloadProfile
} from './types.js';

export interface RecommendationOptions {
  topN?: number;
  minScore?: number;
}

export class ArbitrageAgent {
  constructor(private readonly strategies = STRATEGIES) {}

  evaluate(snapshot: CompositeMarketSnapshot, profile: WorkloadProfile): StrategyRecommendation[] {
    return this.strategies.flatMap(strategy =>
      strategy.evaluate({ snapshot, workloadProfile: profile })
    );
  }

  recommendPortfolio(
    snapshot: CompositeMarketSnapshot,
    profile: WorkloadProfile,
    options: RecommendationOptions = {}
  ): StrategySummary[] {
    const recommendations = this.evaluate(snapshot, profile);
    const minScore = options.minScore ?? 0.6;
    const filtered = recommendations.filter(rec => rec.totalScore >= minScore);

    const ranked = [...filtered].sort((a, b) => this.rankRecommendation(a) - this.rankRecommendation(b));

    const top = options.topN ? ranked.slice(0, options.topN) : ranked;

    return top.map(recommendation => ({
      strategy: recommendation.strategy,
      provider: recommendation.provider,
      region: recommendation.region,
      blendedUnitPrice: recommendation.expectedUnitPrice,
      estimatedSavings: this.estimateSavings(recommendation),
      consumerScore: recommendation.consumerScore,
      collectibleScore: recommendation.collectibleScore,
      predictionScore: recommendation.predictionScore,
      cryptoScore: recommendation.cryptoScore,
      forexScore: recommendation.forexScore,
      derivativesScore: recommendation.derivativesScore,
      commodityScore: recommendation.commodityScore,
      sportsScore: recommendation.sportsScore,
      exoticScore: recommendation.exoticScore,
      metaSignalScore: recommendation.metaSignalScore,
      cascadeScore: recommendation.cascadeScore,
      frontRunConfidence: recommendation.frontRunConfidence,
      crossMarketScore: recommendation.crossMarketScore,
      arbitrageStrength: recommendation.arbitrageSignalStrength,
      hedgeStrength: recommendation.hedgeSignalStrength,
      confidence: Math.min(
        0.97,
        (
          recommendation.totalScore +
          recommendation.crossMarketScore +
          recommendation.metaSignalScore +
          recommendation.frontRunConfidence +
          recommendation.hedgeSignalStrength
        ) /
          5
      )
    }));
  }

  private rankRecommendation(recommendation: StrategyRecommendation): number {
    const arbitrageBias = 1 - Math.min(1, recommendation.arbitrageSignalStrength * 0.6);
    const hedgeBias = 1 - Math.min(1, recommendation.hedgeSignalStrength * 0.5);
    const metaBias = 1 - Math.min(1, (recommendation.metaSignalScore + recommendation.frontRunConfidence) * 0.4);
    return (
      recommendation.expectedUnitPrice * (1 - recommendation.crossMarketScore * 0.15) +
      (3 - recommendation.totalScore) * 0.05 +
      arbitrageBias * 0.02 +
      hedgeBias * 0.02 +
      metaBias * 0.02
    );
  }

  private estimateSavings(recommendation: StrategyRecommendation): number {
    const baseline = recommendation.expectedUnitPrice * 1.15;
    return baseline - recommendation.expectedUnitPrice;
  }
}
