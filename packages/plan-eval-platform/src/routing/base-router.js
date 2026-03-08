"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRouter = void 0;
exports.createCandidatesFromScenario = createCandidatesFromScenario;
/**
 * BaseRouter - Abstract base class for routing implementations
 *
 * Defines the interface for all routers and provides common utilities.
 */
class BaseRouter {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Get router type
     */
    getType() {
        return this.config.type;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }
    /**
     * Filter candidates by capabilities
     */
    filterByCapabilities(candidates, requiredCapabilities) {
        if (requiredCapabilities.length === 0) {
            return candidates;
        }
        return candidates.filter((c) => requiredCapabilities.every((cap) => c.capabilities.includes(cap)));
    }
    /**
     * Filter candidates by latency budget
     */
    filterByLatency(candidates, maxLatencyMs) {
        return candidates.filter((c) => c.estimatedLatencyMs <= maxLatencyMs);
    }
    /**
     * Calculate a combined score for a candidate
     */
    calculateScore(candidate, costWeight) {
        // Score = quality * (1 - costWeight) - cost * costWeight
        // Normalized so higher is better
        const qualityScore = candidate.estimatedQuality;
        const costPenalty = Math.min(candidate.estimatedCost * 100, 1); // Normalize cost to 0-1
        return qualityScore * (1 - costWeight) - costPenalty * costWeight;
    }
    /**
     * Build a routing decision from selected candidate
     */
    buildDecision(selected, score, reasoning, alternatives, latencyBudgetMs) {
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
    getAlternativeReason(alt, selected) {
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
exports.BaseRouter = BaseRouter;
/**
 * Create tool candidates from scenario tools
 */
function createCandidatesFromScenario(scenario, step) {
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
