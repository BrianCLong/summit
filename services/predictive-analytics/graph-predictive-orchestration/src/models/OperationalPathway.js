"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationalPathwayModel = exports.OperationalPathwaySchema = exports.RewiringEventSchema = exports.PathwayMetricsSchema = exports.PathwayTopologySchema = exports.PathwayEdgeSchema = exports.RewiringStrategy = exports.PathwayStatus = exports.PathwayType = void 0;
const zod_1 = require("zod");
// Enums
var PathwayType;
(function (PathwayType) {
    PathwayType["SUPPLY_CHAIN"] = "SUPPLY_CHAIN";
    PathwayType["DATA_FLOW"] = "DATA_FLOW";
    PathwayType["INVESTIGATION"] = "INVESTIGATION";
    PathwayType["RESPONSE"] = "RESPONSE";
})(PathwayType || (exports.PathwayType = PathwayType = {}));
var PathwayStatus;
(function (PathwayStatus) {
    PathwayStatus["ACTIVE"] = "ACTIVE";
    PathwayStatus["DEPRECATED"] = "DEPRECATED";
    PathwayStatus["REWIRED"] = "REWIRED";
})(PathwayStatus || (exports.PathwayStatus = PathwayStatus = {}));
var RewiringStrategy;
(function (RewiringStrategy) {
    RewiringStrategy["BYPASS"] = "BYPASS";
    RewiringStrategy["PARALLEL"] = "PARALLEL";
    RewiringStrategy["CONSOLIDATE"] = "CONSOLIDATE";
    RewiringStrategy["OPTIMIZE"] = "OPTIMIZE";
})(RewiringStrategy || (exports.RewiringStrategy = RewiringStrategy = {}));
// Zod Schemas
exports.PathwayEdgeSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    weight: zod_1.z.number(),
    properties: zod_1.z.record(zod_1.z.any()),
});
exports.PathwayTopologySchema = zod_1.z.object({
    startNodeId: zod_1.z.string(),
    endNodeId: zod_1.z.string(),
    intermediateNodes: zod_1.z.array(zod_1.z.string()),
    edges: zod_1.z.array(exports.PathwayEdgeSchema),
});
exports.PathwayMetricsSchema = zod_1.z.object({
    throughput: zod_1.z.number(),
    latency: zod_1.z.number(),
    cost: zod_1.z.number(),
    reliability: zod_1.z.number().min(0).max(1),
});
exports.RewiringEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    reason: zod_1.z.string(),
    predictionId: zod_1.z.string().optional(),
    oldTopology: zod_1.z.any(),
    newTopology: zod_1.z.any(),
    impact: zod_1.z.any(),
});
exports.OperationalPathwaySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.nativeEnum(PathwayType),
    topology: exports.PathwayTopologySchema,
    status: zod_1.z.nativeEnum(PathwayStatus),
    metrics: exports.PathwayMetricsSchema,
    rewiringHistory: zod_1.z.array(exports.RewiringEventSchema),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Model Class
class OperationalPathwayModel {
    pathways = new Map();
    /**
     * Create a new operational pathway
     */
    create(input) {
        const id = `pathway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const pathway = {
            id,
            name: input.name,
            type: input.type,
            topology: input.topology,
            status: PathwayStatus.ACTIVE,
            metrics: input.metrics,
            rewiringHistory: [],
            createdAt: now,
            updatedAt: now,
        };
        // Validate with Zod
        exports.OperationalPathwaySchema.parse(pathway);
        this.pathways.set(id, pathway);
        return pathway;
    }
    /**
     * Get pathway by ID
     */
    getById(id) {
        return this.pathways.get(id);
    }
    /**
     * Get all pathways with filters
     */
    getAll(filters) {
        let results = Array.from(this.pathways.values());
        if (filters?.type) {
            results = results.filter((p) => p.type === filters.type);
        }
        if (filters?.status) {
            results = results.filter((p) => p.status === filters.status);
        }
        // Sort by creation date descending
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return results;
    }
    /**
     * Rewire a pathway
     */
    rewire(id, newTopology, reason, predictionId, impact) {
        const pathway = this.pathways.get(id);
        if (!pathway) {
            return undefined;
        }
        // Record rewiring event
        const rewiringEvent = {
            id: `rewiring_${id}_${Date.now()}`,
            timestamp: new Date(),
            reason,
            predictionId,
            oldTopology: pathway.topology,
            newTopology,
            impact: impact || {},
        };
        // Update pathway
        const oldStatus = pathway.status;
        pathway.topology = newTopology;
        pathway.status = PathwayStatus.REWIRED;
        pathway.rewiringHistory.push(rewiringEvent);
        pathway.updatedAt = new Date();
        return pathway;
    }
    /**
     * Update pathway metrics
     */
    updateMetrics(id, metrics) {
        const pathway = this.pathways.get(id);
        if (!pathway) {
            return undefined;
        }
        pathway.metrics = {
            ...pathway.metrics,
            ...metrics,
        };
        pathway.updatedAt = new Date();
        return pathway;
    }
    /**
     * Deprecate a pathway
     */
    deprecate(id) {
        const pathway = this.pathways.get(id);
        if (!pathway) {
            return undefined;
        }
        pathway.status = PathwayStatus.DEPRECATED;
        pathway.updatedAt = new Date();
        return pathway;
    }
    /**
     * Simulate rewiring (calculate projected metrics)
     */
    simulateRewiring(id, strategy, newTopology) {
        const pathway = this.pathways.get(id);
        if (!pathway) {
            return undefined;
        }
        // Calculate projected metrics based on strategy
        const projectedMetrics = this.calculateProjectedMetrics(pathway.metrics, strategy, newTopology);
        // Calculate impact
        const impact = {
            throughputChange: projectedMetrics.throughput - pathway.metrics.throughput,
            latencyChange: projectedMetrics.latency - pathway.metrics.latency,
            costChange: projectedMetrics.cost - pathway.metrics.cost,
            reliabilityChange: projectedMetrics.reliability - pathway.metrics.reliability,
        };
        // Generate recommendation
        const recommendation = this.generateRecommendation(impact);
        return {
            originalMetrics: pathway.metrics,
            projectedMetrics,
            impact,
            recommendation,
        };
    }
    /**
     * Calculate projected metrics (simplified logic)
     */
    calculateProjectedMetrics(currentMetrics, strategy, newTopology) {
        const pathLength = newTopology.edges.length;
        const avgWeight = newTopology.edges.reduce((sum, e) => sum + e.weight, 0) / pathLength;
        switch (strategy) {
            case RewiringStrategy.BYPASS:
                // Bypass: shorter path, better latency, similar cost
                return {
                    throughput: currentMetrics.throughput * 1.1,
                    latency: currentMetrics.latency * 0.8,
                    cost: currentMetrics.cost * 1.05,
                    reliability: Math.min(0.99, currentMetrics.reliability * 1.05),
                };
            case RewiringStrategy.PARALLEL:
                // Parallel: higher throughput, higher cost
                return {
                    throughput: currentMetrics.throughput * 1.5,
                    latency: currentMetrics.latency,
                    cost: currentMetrics.cost * 1.4,
                    reliability: Math.min(0.99, currentMetrics.reliability * 1.1),
                };
            case RewiringStrategy.CONSOLIDATE:
                // Consolidate: lower cost, lower throughput
                return {
                    throughput: currentMetrics.throughput * 0.8,
                    latency: currentMetrics.latency * 1.1,
                    cost: currentMetrics.cost * 0.7,
                    reliability: currentMetrics.reliability * 0.95,
                };
            case RewiringStrategy.OPTIMIZE:
                // Optimize: balanced improvements
                return {
                    throughput: currentMetrics.throughput * 1.2,
                    latency: currentMetrics.latency * 0.9,
                    cost: currentMetrics.cost * 0.95,
                    reliability: Math.min(0.99, currentMetrics.reliability * 1.08),
                };
            default:
                return currentMetrics;
        }
    }
    /**
     * Generate recommendation based on impact
     */
    generateRecommendation(impact) {
        const improvements = [];
        const regressions = [];
        if (impact.throughputChange > 0) {
            improvements.push(`+${(impact.throughputChange * 100).toFixed(1)}% throughput`);
        }
        else if (impact.throughputChange < 0) {
            regressions.push(`${(impact.throughputChange * 100).toFixed(1)}% throughput`);
        }
        if (impact.latencyChange < 0) {
            improvements.push(`${(Math.abs(impact.latencyChange) * 100).toFixed(1)}% faster`);
        }
        else if (impact.latencyChange > 0) {
            regressions.push(`+${(impact.latencyChange * 100).toFixed(1)}% latency`);
        }
        if (impact.costChange < 0) {
            improvements.push(`${(Math.abs(impact.costChange) * 100).toFixed(1)}% cost savings`);
        }
        else if (impact.costChange > 0) {
            regressions.push(`+${(impact.costChange * 100).toFixed(1)}% cost`);
        }
        if (impact.reliabilityChange > 0) {
            improvements.push(`+${(impact.reliabilityChange * 100).toFixed(1)}% reliability`);
        }
        else if (impact.reliabilityChange < 0) {
            regressions.push(`${(impact.reliabilityChange * 100).toFixed(1)}% reliability`);
        }
        if (improvements.length === 0 && regressions.length === 0) {
            return 'No significant impact expected';
        }
        const parts = [];
        if (improvements.length > 0) {
            parts.push(`Improvements: ${improvements.join(', ')}`);
        }
        if (regressions.length > 0) {
            parts.push(`Tradeoffs: ${regressions.join(', ')}`);
        }
        const netBenefit = impact.throughputChange + (-impact.latencyChange) +
            (-impact.costChange) + impact.reliabilityChange;
        if (netBenefit > 0.1) {
            parts.push('Recommended: Proceed with rewiring');
        }
        else if (netBenefit < -0.1) {
            parts.push('Not recommended: Negative net impact');
        }
        else {
            parts.push('Marginal: Consider alternatives');
        }
        return parts.join('. ');
    }
    /**
     * Get pathways by node (pathways that include this node)
     */
    getByNode(nodeId) {
        return Array.from(this.pathways.values()).filter((pathway) => {
            return (pathway.topology.startNodeId === nodeId ||
                pathway.topology.endNodeId === nodeId ||
                pathway.topology.intermediateNodes.includes(nodeId));
        });
    }
    /**
     * Delete pathway (for testing)
     */
    delete(id) {
        return this.pathways.delete(id);
    }
    /**
     * Clear all pathways (for testing)
     */
    clear() {
        this.pathways.clear();
    }
}
exports.OperationalPathwayModel = OperationalPathwayModel;
