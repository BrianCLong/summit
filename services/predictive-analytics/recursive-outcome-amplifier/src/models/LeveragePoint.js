"use strict";
/**
 * LeveragePoint - Represents a high-impact intervention point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeveragePointBuilder = exports.InterventionType = void 0;
exports.determineInterventionType = determineInterventionType;
exports.estimateInterventionCost = estimateInterventionCost;
exports.rankLeveragePoints = rankLeveragePoints;
exports.filterLeveragePoints = filterLeveragePoints;
var InterventionType;
(function (InterventionType) {
    InterventionType["BLOCK"] = "BLOCK";
    InterventionType["AMPLIFY"] = "AMPLIFY";
    InterventionType["REDIRECT"] = "REDIRECT";
    InterventionType["MONITOR"] = "MONITOR";
})(InterventionType || (exports.InterventionType = InterventionType = {}));
class LeveragePointBuilder {
    point;
    constructor(nodeId) {
        this.point = {
            nodeId,
            leverageScore: 0,
            centrality: 0,
            interventionType: InterventionType.MONITOR,
            downstreamImpact: 0,
            interventionCost: 1.0,
        };
    }
    withLeverageScore(score) {
        this.point.leverageScore = score;
        return this;
    }
    withCentrality(centrality) {
        this.point.centrality = centrality;
        return this;
    }
    withInterventionType(type) {
        this.point.interventionType = type;
        return this;
    }
    withDownstreamImpact(impact) {
        this.point.downstreamImpact = impact;
        return this;
    }
    withInterventionCost(cost) {
        this.point.interventionCost = cost;
        return this;
    }
    build() {
        return this.point;
    }
}
exports.LeveragePointBuilder = LeveragePointBuilder;
function determineInterventionType(node) {
    // Determine intervention type based on node characteristics
    if (node.magnitude < 0) {
        // Negative outcomes should be blocked
        return InterventionType.BLOCK;
    }
    if (node.magnitude > 5.0 && node.probability > 0.7) {
        // High-magnitude, high-probability positive outcomes should be amplified
        return InterventionType.AMPLIFY;
    }
    if (node.childNodes.length > 3) {
        // High-branching nodes are good redirection targets
        return InterventionType.REDIRECT;
    }
    // Default to monitoring
    return InterventionType.MONITOR;
}
function estimateInterventionCost(node) {
    // Cost estimation based on node properties
    let cost = 1.0;
    // Higher-order effects are harder to intervene in
    cost *= 1 + node.order * 0.2;
    // Lower probability events are harder to prevent
    if (node.probability < 0.5) {
        cost *= 1.5;
    }
    // Domain-specific cost modifiers
    const domainCosts = {
        POLICY: 2.0,
        GEOPOLITICAL: 3.0,
        ECONOMIC: 1.5,
        TECHNOLOGY: 1.2,
        SOCIAL: 1.3,
    };
    cost *= domainCosts[node.domain] || 1.0;
    return cost;
}
function rankLeveragePoints(points) {
    return [...points].sort((a, b) => {
        // Primary sort: leverage score (higher is better)
        if (Math.abs(a.leverageScore - b.leverageScore) > 0.01) {
            return b.leverageScore - a.leverageScore;
        }
        // Secondary sort: cost (lower is better)
        return a.interventionCost - b.interventionCost;
    });
}
function filterLeveragePoints(points, options) {
    let filtered = points;
    if (options.minScore !== undefined) {
        filtered = filtered.filter((p) => p.leverageScore >= options.minScore);
    }
    if (options.maxCost !== undefined) {
        filtered = filtered.filter((p) => p.interventionCost <= options.maxCost);
    }
    if (options.interventionTypes && options.interventionTypes.length > 0) {
        filtered = filtered.filter((p) => options.interventionTypes.includes(p.interventionType));
    }
    const ranked = rankLeveragePoints(filtered);
    if (options.topN !== undefined) {
        return ranked.slice(0, options.topN);
    }
    return ranked;
}
