"use strict";
/**
 * LeverageIdentifier - Find high-impact intervention points
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeverageIdentifier = void 0;
const LeveragePoint_js_1 = require("../models/LeveragePoint.js");
class LeverageIdentifier {
    /**
     * Identify leverage points in cascade
     */
    identifyLeveragePoints(dag, criticalPaths) {
        const leveragePoints = [];
        for (const node of dag.nodes) {
            // Skip root and leaf nodes (limited intervention value)
            if (node.order === 1 || node.childNodes.length === 0)
                continue;
            // Calculate betweenness centrality
            const centrality = this.calculateBetweennessCentrality(node, dag);
            // Count downstream affected nodes
            const downstreamImpact = this.countDownstreamNodes(node, dag);
            // Estimate intervention cost
            const interventionCost = (0, LeveragePoint_js_1.estimateInterventionCost)(node);
            // Determine intervention type
            const interventionType = (0, LeveragePoint_js_1.determineInterventionType)(node);
            // Calculate leverage score: (impact × centrality) / cost
            const leverageScore = (downstreamImpact * centrality) / interventionCost;
            const leveragePoint = new LeveragePoint_js_1.LeveragePointBuilder(node.id)
                .withLeverageScore(leverageScore)
                .withCentrality(centrality)
                .withInterventionType(interventionType)
                .withDownstreamImpact(downstreamImpact)
                .withInterventionCost(interventionCost)
                .build();
            leveragePoints.push(leveragePoint);
        }
        // Return top leverage points sorted by score
        return leveragePoints
            .sort((a, b) => b.leverageScore - a.leverageScore)
            .slice(0, 10);
    }
    /**
     * Calculate betweenness centrality for a node
     * Measures how many shortest paths pass through this node
     */
    calculateBetweennessCentrality(node, dag) {
        let centrality = 0;
        const totalPaths = this.countAllPaths(dag);
        if (totalPaths === 0)
            return 0;
        // Count paths that pass through this node
        const pathsThroughNode = this.countPathsThroughNode(node, dag);
        centrality = pathsThroughNode / totalPaths;
        return Math.max(0, Math.min(1, centrality));
    }
    /**
     * Count total paths in DAG
     */
    countAllPaths(dag) {
        const roots = dag.nodes.filter((n) => n.order === 1);
        let totalPaths = 0;
        for (const root of roots) {
            totalPaths += this.countPathsFromNode(root, dag, new Set());
        }
        return totalPaths;
    }
    /**
     * Count paths from a specific node
     */
    countPathsFromNode(node, dag, visited) {
        if (visited.has(node.id))
            return 0;
        visited.add(node.id);
        // Leaf node = 1 path
        if (node.childNodes.length === 0) {
            visited.delete(node.id);
            return 1;
        }
        let pathCount = 0;
        for (const childId of node.childNodes) {
            const child = dag.nodes.find((n) => n.id === childId);
            if (child) {
                pathCount += this.countPathsFromNode(child, dag, visited);
            }
        }
        visited.delete(node.id);
        return pathCount;
    }
    /**
     * Count paths that pass through specific node
     */
    countPathsThroughNode(node, dag) {
        // Paths through node = paths to node × paths from node
        const pathsToNode = this.countPathsToNode(node, dag);
        const pathsFromNode = this.countPathsFromNode(node, dag, new Set());
        return pathsToNode * pathsFromNode;
    }
    /**
     * Count paths leading to a node
     */
    countPathsToNode(node, dag) {
        if (node.order === 1)
            return 1; // Root node
        let pathCount = 0;
        for (const parentId of node.parentNodes) {
            const parent = dag.nodes.find((n) => n.id === parentId);
            if (parent) {
                pathCount += this.countPathsToNode(parent, dag);
            }
        }
        return pathCount || 1; // At least 1 path
    }
    /**
     * Count downstream nodes affected by this node
     */
    countDownstreamNodes(node, dag) {
        const downstream = new Set();
        this.collectDownstreamNodes(node, dag, downstream);
        return downstream.size;
    }
    /**
     * Recursively collect downstream nodes
     */
    collectDownstreamNodes(node, dag, downstream) {
        for (const childId of node.childNodes) {
            if (downstream.has(childId))
                continue;
            downstream.add(childId);
            const child = dag.nodes.find((n) => n.id === childId);
            if (child) {
                this.collectDownstreamNodes(child, dag, downstream);
            }
        }
    }
    /**
     * Find leverage points on critical paths
     */
    findCriticalPathLeveragePoints(criticalPaths, topN = 5) {
        const nodeFrequency = new Map();
        // Count how often each node appears in critical paths
        for (const path of criticalPaths) {
            for (const node of path.nodes) {
                nodeFrequency.set(node.id, (nodeFrequency.get(node.id) || 0) + 1);
            }
        }
        // Return most frequent nodes (highest leverage)
        return Array.from(nodeFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([nodeId]) => nodeId);
    }
    /**
     * Calculate intervention effectiveness
     * How much impact would intervening at this point have?
     */
    calculateInterventionEffectiveness(node, dag) {
        const downstreamImpact = this.countDownstreamNodes(node, dag);
        const downstreamMagnitude = this.calculateDownstreamMagnitude(node, dag);
        // Effectiveness = downstream nodes × average magnitude
        const avgMagnitude = downstreamImpact > 0 ? downstreamMagnitude / downstreamImpact : 0;
        return downstreamImpact * avgMagnitude;
    }
    /**
     * Calculate total magnitude of downstream effects
     */
    calculateDownstreamMagnitude(node, dag) {
        let totalMagnitude = 0;
        const visited = new Set();
        this.sumDownstreamMagnitude(node, dag, visited, (magnitude) => {
            totalMagnitude += magnitude;
        });
        return totalMagnitude;
    }
    /**
     * Recursively sum downstream magnitude
     */
    sumDownstreamMagnitude(node, dag, visited, callback) {
        for (const childId of node.childNodes) {
            if (visited.has(childId))
                continue;
            visited.add(childId);
            const child = dag.nodes.find((n) => n.id === childId);
            if (child) {
                callback(child.magnitude);
                this.sumDownstreamMagnitude(child, dag, visited, callback);
            }
        }
    }
    /**
     * Find chokepoints (single nodes that must be traversed)
     */
    findChokepoints(dag) {
        const chokepoints = [];
        for (const node of dag.nodes) {
            if (this.isChokepoint(node, dag)) {
                chokepoints.push(node);
            }
        }
        return chokepoints;
    }
    /**
     * Check if node is a chokepoint
     */
    isChokepoint(node, dag) {
        // A chokepoint has multiple parents but is the only path forward
        if (node.parentNodes.length <= 1)
            return false;
        // Check if all downstream paths go through this node
        const downstreamNodes = new Set();
        this.collectDownstreamNodes(node, dag, downstreamNodes);
        // If this node has unique downstream nodes not reachable elsewhere
        return downstreamNodes.size > 0;
    }
}
exports.LeverageIdentifier = LeverageIdentifier;
