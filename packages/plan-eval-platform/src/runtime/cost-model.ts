import type { CostModelConfig, CostEstimate, TraceEvent } from '../types.js';

/**
 * Default cost configuration based on typical LLM API pricing
 */
const DEFAULT_COST_CONFIG: CostModelConfig = {
  inputTokenCostPer1k: 0.003, // $3 per 1M input tokens
  outputTokenCostPer1k: 0.015, // $15 per 1M output tokens
  toolCallBaseCost: 0.0001, // Base cost per tool call
  toolCosts: {
    'code_interpreter': 0.001,
    'file_search': 0.0005,
    'web_browse': 0.002,
    'database_query': 0.0008,
    'api_call': 0.0003,
  },
  latencyPenaltyPerMs: 0.00001, // Small penalty for latency (cost of time)
};

/**
 * CostModel - Configurable cost estimation for LLM operations
 *
 * Supports:
 * - Token-based pricing (input/output)
 * - Tool-specific costs
 * - Latency penalties (for optimization)
 * - Aggregation from traces
 */
export class CostModel {
  private readonly config: CostModelConfig;

  constructor(config: Partial<CostModelConfig> = {}) {
    this.config = {
      ...DEFAULT_COST_CONFIG,
      ...config,
      toolCosts: {
        ...DEFAULT_COST_CONFIG.toolCosts,
        ...config.toolCosts,
      },
    };
  }

  /**
   * Estimate cost for a single operation
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    toolName?: string,
    latencyMs?: number,
  ): CostEstimate {
    const inputTokenCost =
      (inputTokens / 1000) * this.config.inputTokenCostPer1k;
    const outputTokenCost =
      (outputTokens / 1000) * this.config.outputTokenCostPer1k;

    let toolCallCost = 0;
    if (toolName) {
      toolCallCost =
        this.config.toolCosts[toolName] ?? this.config.toolCallBaseCost;
    }

    const latencyPenalty = latencyMs
      ? latencyMs * this.config.latencyPenaltyPerMs
      : 0;

    return {
      inputTokenCost,
      outputTokenCost,
      toolCallCost,
      latencyPenalty,
      totalCost: inputTokenCost + outputTokenCost + toolCallCost + latencyPenalty,
    };
  }

  /**
   * Calculate cost from trace events
   */
  calculateFromEvents(events: TraceEvent[]): CostEstimate {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalToolCost = 0;
    let totalLatency = 0;

    for (const event of events) {
      if (event.metrics) {
        totalInputTokens += event.metrics.inputTokens ?? 0;
        totalOutputTokens += event.metrics.outputTokens ?? 0;
        totalLatency += event.metrics.latencyMs ?? 0;
      }

      // Handle tool calls
      if (event.type === 'tool_call_end' && event.name) {
        const toolName = event.name.replace('tool:', '');
        totalToolCost +=
          this.config.toolCosts[toolName] ?? this.config.toolCallBaseCost;
      }
    }

    const inputTokenCost =
      (totalInputTokens / 1000) * this.config.inputTokenCostPer1k;
    const outputTokenCost =
      (totalOutputTokens / 1000) * this.config.outputTokenCostPer1k;
    const latencyPenalty = totalLatency * this.config.latencyPenaltyPerMs;

    return {
      inputTokenCost,
      outputTokenCost,
      toolCallCost: totalToolCost,
      latencyPenalty,
      totalCost: inputTokenCost + outputTokenCost + totalToolCost + latencyPenalty,
    };
  }

  /**
   * Get the cost configuration
   */
  getConfig(): CostModelConfig {
    return { ...this.config };
  }

  /**
   * Update tool costs dynamically
   */
  setToolCost(toolName: string, cost: number): void {
    this.config.toolCosts[toolName] = cost;
  }

  /**
   * Calculate cost savings between two cost estimates
   */
  static calculateSavings(baseline: CostEstimate, optimized: CostEstimate): {
    absoluteSavings: number;
    percentageSavings: number;
    breakdown: {
      inputTokenSavings: number;
      outputTokenSavings: number;
      toolCallSavings: number;
    };
  } {
    const absoluteSavings = baseline.totalCost - optimized.totalCost;
    const percentageSavings =
      baseline.totalCost > 0
        ? (absoluteSavings / baseline.totalCost) * 100
        : 0;

    return {
      absoluteSavings,
      percentageSavings,
      breakdown: {
        inputTokenSavings: baseline.inputTokenCost - optimized.inputTokenCost,
        outputTokenSavings: baseline.outputTokenCost - optimized.outputTokenCost,
        toolCallSavings: baseline.toolCallCost - optimized.toolCallCost,
      },
    };
  }
}

/**
 * Factory function for common pricing tiers
 */
export function createCostModel(
  tier: 'budget' | 'standard' | 'premium' = 'standard',
): CostModel {
  const configs: Record<string, Partial<CostModelConfig>> = {
    budget: {
      inputTokenCostPer1k: 0.0005,
      outputTokenCostPer1k: 0.002,
      toolCallBaseCost: 0.00005,
    },
    standard: {
      inputTokenCostPer1k: 0.003,
      outputTokenCostPer1k: 0.015,
      toolCallBaseCost: 0.0001,
    },
    premium: {
      inputTokenCostPer1k: 0.01,
      outputTokenCostPer1k: 0.03,
      toolCallBaseCost: 0.0005,
    },
  };

  return new CostModel(configs[tier]);
}

export { DEFAULT_COST_CONFIG };
