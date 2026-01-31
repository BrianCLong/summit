import { z } from 'zod';

export const ModelTierSchema = z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-haiku']);
export type ModelTier = z.infer<typeof ModelTierSchema>;

export interface TaskCostEstimate {
  taskType: string;
  estimatedTokens: number;
  estimatedCostUSD: number;
  estimatedTimeMs: number;
  modelTier: ModelTier;
}

export class CostEstimator {
  private static readonly PRICING = {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1k tokens (simplified)
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };

  /**
   * Estimate cost for a given task type and parameters.
   * This uses heuristics based on historical data (simulated here).
   */
  estimate(taskType: string, params: any, preferredModel: ModelTier = 'gpt-4'): TaskCostEstimate {
    let baseTokens = 1000;
    let multiplier = 1.0;

    switch (taskType) {
      case 'analyze_goal':
        baseTokens = 5000;
        multiplier = 1.5; // Complex reasoning
        break;
      case 'generate_code':
        baseTokens = 2000;
        multiplier = 2.0;
        break;
      case 'review_code':
        baseTokens = 3000;
        break;
      default:
        baseTokens = 500;
    }

    // Adjust based on params size (rough heuristic)
    const paramSize = JSON.stringify(params).length;
    const estimatedTokens = Math.ceil(baseTokens + (paramSize / 4) * multiplier);

    const pricing = CostEstimator.PRICING[preferredModel];
    // Assume 2/3 input, 1/3 output for simplicity
    const inputTokens = estimatedTokens * 0.66;
    const outputTokens = estimatedTokens * 0.34;

    const cost = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;

    return {
      taskType,
      estimatedTokens,
      estimatedCostUSD: cost,
      estimatedTimeMs: estimatedTokens * 50, // rough 20 tokens/sec
      modelTier: preferredModel,
    };
  }

  /**
   * Suggest a cheaper model if the estimate exceeds budget.
   */
  optimize(estimate: TaskCostEstimate, maxBudgetUSD: number): TaskCostEstimate {
    if (estimate.estimatedCostUSD <= maxBudgetUSD) {
      return estimate;
    }

    // Downgrade logic
    const tiers: ModelTier[] = ['gpt-4', 'claude-3-opus', 'gpt-3.5-turbo', 'claude-3-haiku'];
    const currentIdx = tiers.indexOf(estimate.modelTier);

    for (let i = currentIdx + 1; i < tiers.length; i++) {
        const cheaperModel = tiers[i];
        const newEstimate = this.estimate(estimate.taskType, {}, cheaperModel); // Params ignored in this simple recalc
        // Adjust token count from original estimate to keep "complexity" constant
        newEstimate.estimatedTokens = estimate.estimatedTokens;

        const pricing = CostEstimator.PRICING[cheaperModel];
        const inputTokens = newEstimate.estimatedTokens * 0.66;
        const outputTokens = newEstimate.estimatedTokens * 0.34;
        newEstimate.estimatedCostUSD = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;

        if (newEstimate.estimatedCostUSD <= maxBudgetUSD) {
            return newEstimate;
        }
    }

    return estimate; // Can't optimize enough
  }
}
