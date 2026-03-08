"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GreedyCostRouter = void 0;
exports.createGreedyCostRouter = createGreedyCostRouter;
const base_router_js_1 = require("./base-router.js");
/**
 * GreedyCostRouter - Cost-aware greedy router
 *
 * Hypothesis: A simple cost-aware greedy router with lightweight calibration
 * beats naive round-robin/multi-tool invocation by >10-20% cost at similar quality.
 *
 * Scoring formula:
 *   score = estimatedQuality * (1 - λ) - normalizedCost * λ
 *
 * Where λ (lambda) is the costWeight parameter (0-1):
 *   - λ = 0: Optimize purely for quality
 *   - λ = 1: Optimize purely for cost
 *   - λ = 0.5: Balance quality and cost equally
 */
class GreedyCostRouter extends base_router_js_1.BaseRouter {
    qualityHistory = new Map();
    costHistory = new Map();
    latencyHistory = new Map();
    constructor(config) {
        super({
            type: 'greedy_cost',
            costWeight: 0.5,
            latencyBudgetMs: 5000,
            fallbackEnabled: true,
            learningRate: 0.1,
            ...config,
        });
    }
    /**
     * Route using cost-aware greedy selection
     */
    async route(step, candidates, context) {
        if (candidates.length === 0) {
            throw new Error('No candidates available for routing');
        }
        // Apply latency filter
        let eligibleCandidates = this.filterByLatency(candidates, this.config.latencyBudgetMs);
        // Fallback if no candidates meet latency
        if (eligibleCandidates.length === 0) {
            if (this.config.fallbackEnabled) {
                eligibleCandidates = candidates;
            }
            else {
                throw new Error('No candidates meet latency requirements');
            }
        }
        // Score all candidates
        const scoredCandidates = eligibleCandidates.map((c) => ({
            candidate: c,
            score: this.scoreCandidate(c),
        }));
        // Sort by score (descending)
        scoredCandidates.sort((a, b) => b.score - a.score);
        const selected = scoredCandidates[0];
        const reasoning = this.buildReasoning(selected.candidate, selected.score, scoredCandidates.length);
        return this.buildDecision(selected.candidate, selected.score, reasoning, eligibleCandidates, this.config.latencyBudgetMs);
    }
    /**
     * Score a candidate using the cost-quality tradeoff formula
     */
    scoreCandidate(candidate) {
        const λ = this.config.costWeight;
        // Get calibrated estimates
        const quality = this.getCalibratedQuality(candidate);
        const normalizedCost = this.normalizeCost(candidate.estimatedCost);
        // Apply the scoring formula
        const qualityTerm = quality * (1 - λ);
        const costTerm = normalizedCost * λ;
        const score = qualityTerm - costTerm;
        return score;
    }
    /**
     * Get calibrated quality estimate using historical data
     */
    getCalibratedQuality(candidate) {
        const history = this.qualityHistory.get(candidate.toolId);
        if (!history || history.length === 0) {
            return candidate.estimatedQuality;
        }
        // Use exponential moving average
        const alpha = this.config.learningRate ?? 0.1;
        let calibrated = history[0];
        for (let i = 1; i < history.length; i++) {
            calibrated = alpha * history[i] + (1 - alpha) * calibrated;
        }
        // Blend with static estimate
        return 0.7 * calibrated + 0.3 * candidate.estimatedQuality;
    }
    /**
     * Normalize cost to 0-1 range
     */
    normalizeCost(cost) {
        // Assume cost is in dollars, normalize to typical range
        // $0.001 - $0.01 per call -> 0-1
        const minCost = 0.0001;
        const maxCost = 0.01;
        const normalized = (cost - minCost) / (maxCost - minCost);
        return Math.max(0, Math.min(1, normalized));
    }
    /**
     * Build reasoning explanation
     */
    buildReasoning(selected, score, candidateCount) {
        const λ = this.config.costWeight;
        return [
            `Greedy cost-aware selection (λ=${λ.toFixed(2)})`,
            `Evaluated ${candidateCount} candidates`,
            `Selected: ${selected.toolId} (score: ${score.toFixed(3)})`,
            `Quality estimate: ${selected.estimatedQuality.toFixed(2)}`,
            `Cost: $${selected.estimatedCost.toFixed(4)}`,
            `Latency: ${selected.estimatedLatencyMs}ms`,
            λ > 0.5
                ? 'Optimizing for cost efficiency'
                : λ < 0.5
                    ? 'Optimizing for quality'
                    : 'Balancing cost and quality',
        ];
    }
    /**
     * Record outcome for calibration
     */
    recordOutcome(toolId, quality, actualCost, actualLatencyMs) {
        // Update quality history
        if (!this.qualityHistory.has(toolId)) {
            this.qualityHistory.set(toolId, []);
        }
        this.qualityHistory.get(toolId).push(quality);
        // Update cost history
        if (!this.costHistory.has(toolId)) {
            this.costHistory.set(toolId, []);
        }
        this.costHistory.get(toolId).push(actualCost);
        // Update latency history
        if (!this.latencyHistory.has(toolId)) {
            this.latencyHistory.set(toolId, []);
        }
        this.latencyHistory.get(toolId).push(actualLatencyMs);
        // Keep history bounded
        const maxHistory = 100;
        for (const history of [
            this.qualityHistory.get(toolId),
            this.costHistory.get(toolId),
            this.latencyHistory.get(toolId),
        ]) {
            if (history.length > maxHistory) {
                history.shift();
            }
        }
    }
    /**
     * Get calibration statistics
     */
    getCalibrationStats() {
        const stats = new Map();
        for (const [toolId, qualities] of this.qualityHistory) {
            const costs = this.costHistory.get(toolId) ?? [];
            const latencies = this.latencyHistory.get(toolId) ?? [];
            stats.set(toolId, {
                avgQuality: qualities.length > 0
                    ? qualities.reduce((a, b) => a + b, 0) / qualities.length
                    : 0,
                avgCost: costs.length > 0
                    ? costs.reduce((a, b) => a + b, 0) / costs.length
                    : 0,
                avgLatency: latencies.length > 0
                    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                    : 0,
                samples: qualities.length,
            });
        }
        return stats;
    }
    /**
     * Reset calibration data
     */
    resetCalibration() {
        this.qualityHistory.clear();
        this.costHistory.clear();
        this.latencyHistory.clear();
    }
}
exports.GreedyCostRouter = GreedyCostRouter;
/**
 * Create a cost-aware greedy router
 */
function createGreedyCostRouter(costWeight = 0.5, config) {
    return new GreedyCostRouter({
        costWeight,
        ...config,
    });
}
