import type {
  RoutingConfig,
  RoutingDecision,
  ToolCandidate,
  ScenarioStep,
  Scenario,
} from '../types.js';

/**
 * BaseRouter - Abstract base class for routing implementations
 *
 * Defines the interface for all routers and provides common utilities.
 */
export abstract class BaseRouter {
  protected readonly config: RoutingConfig;

  constructor(config: RoutingConfig) {
    this.config = config;
  }

  /**
   * Route a step to a tool
   */
  abstract route(
    step: ScenarioStep,
    candidates: ToolCandidate[],
    context?: Record<string, unknown>,
  ): Promise<RoutingDecision>;

  /**
   * Get router type
   */
  getType(): string {
    return this.config.type;
  }

  /**
   * Get configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RoutingConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Filter candidates by capabilities
   */
  protected filterByCapabilities(
    candidates: ToolCandidate[],
    requiredCapabilities: string[],
  ): ToolCandidate[] {
    if (requiredCapabilities.length === 0) {
      return candidates;
    }

    return candidates.filter((c) =>
      requiredCapabilities.every((cap) => c.capabilities.includes(cap)),
    );
  }

  /**
   * Filter candidates by latency budget
   */
  protected filterByLatency(
    candidates: ToolCandidate[],
    maxLatencyMs: number,
  ): ToolCandidate[] {
    return candidates.filter(
      (c) => c.estimatedLatencyMs <= maxLatencyMs,
    );
  }

  /**
   * Calculate a combined score for a candidate
   */
  protected calculateScore(
    candidate: ToolCandidate,
    costWeight: number,
  ): number {
    // Score = quality * (1 - costWeight) - cost * costWeight
    // Normalized so higher is better
    const qualityScore = candidate.estimatedQuality;
    const costPenalty = Math.min(candidate.estimatedCost * 100, 1); // Normalize cost to 0-1
    return qualityScore * (1 - costWeight) - costPenalty * costWeight;
  }

  /**
   * Build a routing decision from selected candidate
   */
  protected buildDecision(
    selected: ToolCandidate,
    score: number,
    reasoning: string[],
    alternatives: ToolCandidate[],
    latencyBudgetMs: number,
  ): RoutingDecision {
    return {
      selectedTool: selected.toolId,
      score,
      reasoning,
      alternatives: alternatives
        .filter((a) => a.toolId !== selected.toolId)
        .map((a) => ({
          toolId: a.toolId,
          score: this.calculateScore(a, this.config.costWeight),
          reason: this.getAlternativeReason(a, selected),
        })),
      constraints: {
        withinCostBudget: true, // Would check against budget
        withinLatencyBudget: selected.estimatedLatencyMs <= latencyBudgetMs,
        meetsQualityThreshold: selected.estimatedQuality >= 0.5,
      },
    };
  }

  /**
   * Get reason why an alternative wasn't selected
   */
  private getAlternativeReason(
    alt: ToolCandidate,
    selected: ToolCandidate,
  ): string {
    if (alt.estimatedCost > selected.estimatedCost) {
      return 'Higher cost';
    }
    if (alt.estimatedLatencyMs > selected.estimatedLatencyMs) {
      return 'Higher latency';
    }
    if (alt.estimatedQuality < selected.estimatedQuality) {
      return 'Lower quality estimate';
    }
    return 'Lower overall score';
  }
}

/**
 * Create tool candidates from scenario tools
 */
export function createCandidatesFromScenario(
  scenario: Scenario,
  step: ScenarioStep,
): ToolCandidate[] {
  const allowedTools = step.allowedTools ?? scenario.tools.map((t) => t.name);

  return scenario.tools
    .filter((t) => allowedTools.includes(t.name))
    .map((t) => ({
      toolId: t.name,
      estimatedCost: t.costPerCall ?? 0.001,
      estimatedLatencyMs: t.avgLatencyMs ?? 100,
      estimatedQuality: 0.8, // Default quality estimate
      capabilities: t.capabilities ?? [],
    }));
}
