"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomRouter = void 0;
exports.createRandomRouter = createRandomRouter;
const base_router_js_1 = require("./base-router.js");
/**
 * RandomRouter - Baseline router that randomly selects from candidates
 *
 * Used as a baseline for comparison in ablation studies.
 * Provides a lower bound on routing performance.
 */
class RandomRouter extends base_router_js_1.BaseRouter {
    selectionCounts = new Map();
    constructor(config) {
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
    async route(step, candidates, context) {
        if (candidates.length === 0) {
            throw new Error('No candidates available for routing');
        }
        // Filter by latency budget if configured
        let eligibleCandidates = this.filterByLatency(candidates, this.config.latencyBudgetMs);
        // Fall back to all candidates if none meet latency budget
        if (eligibleCandidates.length === 0) {
            if (this.config.fallbackEnabled) {
                eligibleCandidates = candidates;
            }
            else {
                throw new Error('No candidates meet latency requirements');
            }
        }
        // Random selection
        const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
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
        return this.buildDecision(selected, Math.random(), // Random score for baseline
        reasoning, eligibleCandidates, this.config.latencyBudgetMs);
    }
    /**
     * Get selection distribution for analysis
     */
    getSelectionDistribution() {
        return new Map(this.selectionCounts);
    }
    /**
     * Reset selection counts
     */
    resetCounts() {
        this.selectionCounts.clear();
    }
}
exports.RandomRouter = RandomRouter;
/**
 * Create a random router
 */
function createRandomRouter(config) {
    return new RandomRouter(config);
}
