import { STRATEGIES } from './strategies.js';
import type {
  CompositeMarketSnapshot,
  CrossMarketAction,
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
      confidence: Math.min(0.95, recommendation.totalScore / 3),
      hedgeEffectiveness: recommendation.hedgeEffectiveness,
      crossMarketActionCount: recommendation.crossMarketActions.length
    }));
  }

  private estimateSavings(recommendation: StrategyRecommendation): number {
    const baseline = recommendation.expectedUnitPrice * 1.15;
    return baseline - recommendation.expectedUnitPrice;
  }

  discoverCrossMarketOpportunities(
    snapshot: CompositeMarketSnapshot,
    profile: WorkloadProfile
  ): CrossMarketAction[] {
    const recommendations = this.evaluate(snapshot, profile);
    const merged = new Map<string, CrossMarketAction & { occurrences: number }>();

    for (const recommendation of recommendations) {
      for (const action of recommendation.crossMarketActions) {
        const key = `${action.domain}:${action.description}`;
        const current = merged.get(key);
        if (current) {
          const occurrences = current.occurrences + 1;
          merged.set(key, {
            ...current,
            expectedValue:
              (current.expectedValue * current.occurrences + action.expectedValue) / occurrences,
            confidence:
              (current.confidence * current.occurrences + action.confidence) / occurrences,
            linkedAssets: Array.from(new Set([...current.linkedAssets, ...action.linkedAssets])),
            occurrences
          });
        } else {
          merged.set(key, { ...action, occurrences: 1 });
        }
      }
    }

    return [...merged.values()].map(({ occurrences, ...action }) => ({
      ...action,
      confidence: Math.min(0.99, action.confidence),
      expectedValue: action.expectedValue,
      linkedAssets: action.linkedAssets
    }));
  }
}
