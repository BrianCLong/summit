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
      const priceDelta = a.expectedUnitPrice - b.expectedUnitPrice;
      if (Math.abs(priceDelta) > 0.001) {
        return priceDelta;
      }
      return b.totalScore - a.totalScore;
    });

    const top = options.topN ? ranked.slice(0, options.topN) : ranked;

    return top.map(recommendation => ({
      strategy: recommendation.strategy,
      provider: recommendation.provider,
      region: recommendation.region,
      blendedUnitPrice: recommendation.expectedUnitPrice,
      estimatedSavings: this.estimateSavings(recommendation),
      confidence: Math.min(0.95, recommendation.totalScore / 3)
    }));
  }

  private estimateSavings(recommendation: StrategyRecommendation): number {
    const baseline = recommendation.expectedUnitPrice * 1.15;
    return baseline - recommendation.expectedUnitPrice;
  }
}
