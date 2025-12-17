import { BaseRouter } from './base-router.js';
import { GreedyCostRouter } from './greedy-cost-router.js';
import type {
  RoutingConfig,
  RoutingDecision,
  ToolCandidate,
  ScenarioStep,
} from '../types.js';

/**
 * AdaptiveRouter - Learns routing policy from evaluation outcomes
 *
 * Key innovation: "Eval-aware routing" - routers trained directly on
 * evaluation outcomes, not only labels.
 *
 * This router:
 * 1. Uses evaluation metrics to adjust routing weights
 * 2. Learns which tools perform best for which scenarios
 * 3. Dynamically adjusts cost-quality tradeoff based on outcomes
 */
export class AdaptiveRouter extends BaseRouter {
  private readonly baseRouter: GreedyCostRouter;
  private readonly toolWeights: Map<string, number> = new Map();
  private readonly categoryWeights: Map<string, Map<string, number>> = new Map();
  private readonly outcomeHistory: Array<{
    toolId: string;
    category: string;
    success: boolean;
    cost: number;
    latency: number;
  }> = [];

  constructor(config?: Partial<RoutingConfig>) {
    super({
      type: 'adaptive',
      costWeight: 0.5,
      latencyBudgetMs: 5000,
      fallbackEnabled: true,
      learningRate: 0.1,
      ...config,
    });

    // Use greedy cost router as base
    this.baseRouter = new GreedyCostRouter(this.config);
  }

  /**
   * Route using adaptive scoring
   */
  async route(
    step: ScenarioStep,
    candidates: ToolCandidate[],
    context?: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    if (candidates.length === 0) {
      throw new Error('No candidates available for routing');
    }

    const category = (context?.category as string) ?? 'default';

    // Apply latency filter
    let eligibleCandidates = this.filterByLatency(
      candidates,
      this.config.latencyBudgetMs,
    );

    if (eligibleCandidates.length === 0) {
      if (this.config.fallbackEnabled) {
        eligibleCandidates = candidates;
      } else {
        throw new Error('No candidates meet latency requirements');
      }
    }

    // Score with adaptive weights
    const scoredCandidates = eligibleCandidates.map((c) => ({
      candidate: c,
      score: this.adaptiveScore(c, category),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    const selected = scoredCandidates[0];
    const reasoning = this.buildAdaptiveReasoning(
      selected.candidate,
      selected.score,
      category,
    );

    return this.buildDecision(
      selected.candidate,
      selected.score,
      reasoning,
      eligibleCandidates,
      this.config.latencyBudgetMs,
    );
  }

  /**
   * Calculate adaptive score incorporating learned weights
   */
  private adaptiveScore(candidate: ToolCandidate, category: string): number {
    // Base score from greedy router
    const baseScore = this.calculateScore(candidate, this.config.costWeight);

    // Apply tool-specific weight
    const toolWeight = this.toolWeights.get(candidate.toolId) ?? 1.0;

    // Apply category-specific weight
    const categoryWeights = this.categoryWeights.get(category);
    const categoryToolWeight =
      categoryWeights?.get(candidate.toolId) ?? 1.0;

    // Combined adaptive score
    return baseScore * toolWeight * categoryToolWeight;
  }

  /**
   * Learn from evaluation outcome
   */
  recordEvalOutcome(
    toolId: string,
    category: string,
    success: boolean,
    cost: number,
    latencyMs: number,
    qualityScore: number,
  ): void {
    // Record in history
    this.outcomeHistory.push({
      toolId,
      category,
      success,
      cost,
      latency: latencyMs,
    });

    // Update tool weight
    const α = this.config.learningRate ?? 0.1;
    const currentWeight = this.toolWeights.get(toolId) ?? 1.0;

    // Reward success, penalize failure
    // Also factor in cost efficiency
    const costEfficiency = 1 / (1 + cost * 100);
    const outcome = success
      ? 1 + costEfficiency * 0.5
      : 0.5 - costEfficiency * 0.25;

    const newWeight = currentWeight * (1 - α) + outcome * α;
    this.toolWeights.set(toolId, Math.max(0.1, Math.min(2.0, newWeight)));

    // Update category-specific weight
    if (!this.categoryWeights.has(category)) {
      this.categoryWeights.set(category, new Map());
    }
    const catWeights = this.categoryWeights.get(category)!;
    const currentCatWeight = catWeights.get(toolId) ?? 1.0;
    const newCatWeight = currentCatWeight * (1 - α) + outcome * α;
    catWeights.set(toolId, Math.max(0.1, Math.min(2.0, newCatWeight)));

    // Also update the base router's calibration
    this.baseRouter.recordOutcome(toolId, qualityScore, cost, latencyMs);
  }

  /**
   * Adapt cost weight based on overall performance
   */
  adaptCostWeight(): void {
    if (this.outcomeHistory.length < 10) {
      return; // Need sufficient data
    }

    // Calculate recent success rate and cost
    const recent = this.outcomeHistory.slice(-50);
    const successRate =
      recent.filter((o) => o.success).length / recent.length;
    const avgCost =
      recent.reduce((sum, o) => sum + o.cost, 0) / recent.length;

    // If success rate is low, reduce cost weight (prioritize quality)
    // If costs are high but success is good, increase cost weight
    const α = this.config.learningRate ?? 0.1;

    if (successRate < 0.7) {
      // Need more quality
      this.config.costWeight = Math.max(
        0,
        this.config.costWeight - α * 0.1,
      );
    } else if (successRate > 0.9 && avgCost > 0.005) {
      // Success is high, can afford to optimize cost more
      this.config.costWeight = Math.min(
        1,
        this.config.costWeight + α * 0.05,
      );
    }
  }

  /**
   * Build reasoning with adaptive context
   */
  private buildAdaptiveReasoning(
    selected: ToolCandidate,
    score: number,
    category: string,
  ): string[] {
    const toolWeight = this.toolWeights.get(selected.toolId) ?? 1.0;
    const catWeight =
      this.categoryWeights.get(category)?.get(selected.toolId) ?? 1.0;

    return [
      `Adaptive routing (learned weights)`,
      `Category: ${category}`,
      `Selected: ${selected.toolId} (score: ${score.toFixed(3)})`,
      `Tool weight: ${toolWeight.toFixed(2)}`,
      `Category weight: ${catWeight.toFixed(2)}`,
      `Cost weight (λ): ${this.config.costWeight.toFixed(2)}`,
      `Training samples: ${this.outcomeHistory.length}`,
    ];
  }

  /**
   * Get learned weights for analysis
   */
  getLearnedWeights(): {
    toolWeights: Map<string, number>;
    categoryWeights: Map<string, Map<string, number>>;
    costWeight: number;
    sampleCount: number;
  } {
    return {
      toolWeights: new Map(this.toolWeights),
      categoryWeights: new Map(
        Array.from(this.categoryWeights.entries()).map(([k, v]) => [
          k,
          new Map(v),
        ]),
      ),
      costWeight: this.config.costWeight,
      sampleCount: this.outcomeHistory.length,
    };
  }

  /**
   * Export model for persistence
   */
  exportModel(): string {
    return JSON.stringify({
      toolWeights: Object.fromEntries(this.toolWeights),
      categoryWeights: Object.fromEntries(
        Array.from(this.categoryWeights.entries()).map(([k, v]) => [
          k,
          Object.fromEntries(v),
        ]),
      ),
      costWeight: this.config.costWeight,
      outcomeCount: this.outcomeHistory.length,
    });
  }

  /**
   * Import model from persistence
   */
  importModel(json: string): void {
    const data = JSON.parse(json);

    this.toolWeights.clear();
    for (const [k, v] of Object.entries(data.toolWeights)) {
      this.toolWeights.set(k, v as number);
    }

    this.categoryWeights.clear();
    for (const [cat, weights] of Object.entries(data.categoryWeights)) {
      const catMap = new Map<string, number>();
      for (const [k, v] of Object.entries(weights as Record<string, number>)) {
        catMap.set(k, v);
      }
      this.categoryWeights.set(cat, catMap);
    }

    if (data.costWeight !== undefined) {
      this.config.costWeight = data.costWeight;
    }
  }

  /**
   * Reset all learned weights
   */
  reset(): void {
    this.toolWeights.clear();
    this.categoryWeights.clear();
    this.outcomeHistory.length = 0;
    this.baseRouter.resetCalibration();
  }
}

/**
 * Create an adaptive router
 */
export function createAdaptiveRouter(
  config?: Partial<RoutingConfig>,
): AdaptiveRouter {
  return new AdaptiveRouter(config);
}
