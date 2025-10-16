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

    const ranked = [...filtered].sort((a, b) => {
      const weightedB = this.scoreRecommendation(b);
      const weightedA = this.scoreRecommendation(a);
      if (weightedB === weightedA) {
        return a.expectedUnitPrice - b.expectedUnitPrice;
      }
      return weightedB - weightedA;
    });

    const top = options.topN ? ranked.slice(0, options.topN) : ranked;

    return top.map(recommendation => ({
      strategy: recommendation.strategy,
      provider: recommendation.provider,
      region: recommendation.region,
      blendedUnitPrice: recommendation.expectedUnitPrice,
      estimatedSavings: this.estimateSavings(recommendation),
      confidence: Math.min(0.95, this.scoreRecommendation(recommendation) / 3.5),
      consumerSignalScore: recommendation.consumerSignalScore,
      collectiblesSignalScore: recommendation.collectiblesSignalScore,
      arbitrageOpportunityScore: recommendation.arbitrageOpportunityScore,
      hedgeScore: recommendation.hedgeScore
    }));
  }

  private estimateSavings(recommendation: StrategyRecommendation): number {
    const baseline = recommendation.expectedUnitPrice * 1.15;
    return baseline - recommendation.expectedUnitPrice;
  }

  private scoreRecommendation(recommendation: StrategyRecommendation): number {
    const priceEfficiency = 1 / Math.max(0.01, recommendation.expectedUnitPrice);
    return (
      recommendation.totalScore * 0.5 +
      recommendation.arbitrageOpportunityScore * 0.25 +
      recommendation.hedgeScore * 0.2 +
      (recommendation.consumerSignalScore + recommendation.collectiblesSignalScore) * 0.2 +
      priceEfficiency * 0.05
    );
  }
}
