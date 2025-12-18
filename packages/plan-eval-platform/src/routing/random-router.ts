import { BaseRouter } from './base-router.js';
import type {
  RoutingConfig,
  RoutingDecision,
  ToolCandidate,
  ScenarioStep,
} from '../types.js';

/**
 * RandomRouter - Baseline router that randomly selects from candidates
 *
 * Used as a baseline for comparison in ablation studies.
 * Provides a lower bound on routing performance.
 */
export class RandomRouter extends BaseRouter {
  private selectionCounts: Map<string, number> = new Map();

  constructor(config?: Partial<RoutingConfig>) {
    super({
      type: 'random',
      costWeight: 0,
      latencyBudgetMs: 5000,
      fallbackEnabled: true,
      ...config,
    });
  }

  /**
   * Randomly select a tool from candidates
   */
  async route(
    step: ScenarioStep,
    candidates: ToolCandidate[],
    context?: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    if (candidates.length === 0) {
      throw new Error('No candidates available for routing');
    }

    // Filter by latency budget if configured
    let eligibleCandidates = this.filterByLatency(
      candidates,
      this.config.latencyBudgetMs,
    );

    // Fall back to all candidates if none meet latency budget
    if (eligibleCandidates.length === 0) {
      if (this.config.fallbackEnabled) {
        eligibleCandidates = candidates;
      } else {
        throw new Error('No candidates meet latency requirements');
      }
    }

    // Random selection
    const randomIndex = Math.floor(
      Math.random() * eligibleCandidates.length,
    );
    const selected = eligibleCandidates[randomIndex];

    // Track selections for analysis
    const count = this.selectionCounts.get(selected.toolId) ?? 0;
    this.selectionCounts.set(selected.toolId, count + 1);

    const reasoning = [
      `Random selection from ${eligibleCandidates.length} candidates`,
      `Selected: ${selected.toolId}`,
      `Estimated cost: $${selected.estimatedCost.toFixed(4)}`,
      `Estimated latency: ${selected.estimatedLatencyMs}ms`,
    ];

    return this.buildDecision(
      selected,
      Math.random(), // Random score for baseline
      reasoning,
      eligibleCandidates,
      this.config.latencyBudgetMs,
    );
  }

  /**
   * Get selection distribution for analysis
   */
  getSelectionDistribution(): Map<string, number> {
    return new Map(this.selectionCounts);
  }

  /**
   * Reset selection counts
   */
  resetCounts(): void {
    this.selectionCounts.clear();
  }
}

/**
 * Create a random router
 */
export function createRandomRouter(
  config?: Partial<RoutingConfig>,
): RandomRouter {
  return new RandomRouter(config);
}
