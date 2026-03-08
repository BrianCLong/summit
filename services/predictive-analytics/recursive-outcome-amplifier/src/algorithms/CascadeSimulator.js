"use strict";
/**
 * CascadeSimulator - Build complete cascade maps from root events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeSimulator = void 0;
const CascadeMap_js_1 = require("../models/CascadeMap.js");
const PropagationEngine_js_1 = require("./PropagationEngine.js");
const LeverageIdentifier_js_1 = require("./LeverageIdentifier.js");
class CascadeSimulator {
    propagationEngine;
    leverageIdentifier;
    constructor() {
        this.propagationEngine = new PropagationEngine_js_1.PropagationEngine();
        this.leverageIdentifier = new LeverageIdentifier_js_1.LeverageIdentifier();
    }
    /**
     * Simulate complete cascade from root event
     */
    simulateCascade(rootEvent, options, context) {
        // Phase 1: Generate outcome nodes through propagation
        const nodes = this.propagationEngine.propagateOutcomes(rootEvent, options, context);
        if (nodes.length === 0) {
            throw new Error('No outcomes generated from root event');
        }
        // Phase 2: Build DAG structure
        const dag = (0, CascadeMap_js_1.buildCascadeDAG)(nodes);
        // Phase 3: Identify critical paths
        const criticalPaths = this.findCriticalPaths(dag, {
            minProbability: options.probabilityThreshold,
            minMagnitude: options.magnitudeThreshold,
            maxPathLength: options.maxOrder,
        });
        // Phase 4: Calculate amplification factor
        const rootNode = nodes[0];
        const amplificationFactor = (0, CascadeMap_js_1.calculateAmplification)(nodes, rootNode);
        // Phase 5: Find leverage points
        const leveragePoints = this.leverageIdentifier.identifyLeveragePoints(dag, criticalPaths);
        // Build cascade map
        return new CascadeMap_js_1.CascadeMapBuilder(rootEvent.description, options.maxOrder)
            .withNodes(nodes)
            .withCriticalPaths(criticalPaths)
            .withLeveragePoints(leveragePoints)
            .withAmplificationFactor(amplificationFactor)
            .withMetadata({
            options,
            simulatedAt: new Date().toISOString(),
        })
            .build();
    }
    /**
     * Find critical paths through the cascade
     */
    findCriticalPaths(dag, criteria) {
        const paths = [];
        const rootNodes = dag.nodes.filter((n) => n.order === 1);
        for (const root of rootNodes) {
            this.traversePaths(root, [root], 1.0, 0, paths, criteria, dag);
        }
        // Rank by combined probability × magnitude
        return paths
            .sort((a, b) => b.probability * b.totalMagnitude - a.probability * a.totalMagnitude)
            .slice(0, 20);
    }
    /**
     * Recursively traverse paths through DAG
     */
    traversePaths(node, path, cumulativeProbability, cumulativeMagnitude, results, criteria, dag) {
        const newProbability = cumulativeProbability * node.probability;
        const newMagnitude = cumulativeMagnitude + node.magnitude;
        // Prune low-probability paths
        if (newProbability < criteria.minProbability)
            return;
        // Check path length limit
        if (criteria.maxPathLength && path.length >= criteria.maxPathLength) {
            return;
        }
        // If leaf node, save path
        if (node.childNodes.length === 0) {
            if (newMagnitude >= criteria.minMagnitude) {
                results.push({
                    nodes: [...path],
                    probability: newProbability,
                    totalMagnitude: newMagnitude,
                    pathLength: path.length,
                });
            }
            return;
        }
        // Recurse to children
        for (const childId of node.childNodes) {
            const child = dag.nodes.find((n) => n.id === childId);
            if (!child)
                continue;
            // Prevent cycles (should not occur in DAG, but safety check)
            if (path.some((n) => n.id === child.id))
                continue;
            this.traversePaths(child, [...path, child], newProbability, newMagnitude, results, criteria, dag);
        }
    }
    /**
     * Find path from root to specific target node
     */
    findPathToNode(cascade, targetNodeId) {
        const targetNode = cascade.nodes.find((n) => n.id === targetNodeId);
        if (!targetNode)
            return null;
        const rootNodes = cascade.nodes.filter((n) => n.order === 1);
        for (const root of rootNodes) {
            const path = this.findPathRecursive(root, targetNodeId, [root], cascade.nodes);
            if (path) {
                return {
                    nodes: path,
                    probability: path.reduce((p, n) => p * n.probability, 1.0),
                    totalMagnitude: path.reduce((m, n) => m + n.magnitude, 0),
                    pathLength: path.length,
                };
            }
        }
        return null;
    }
    /**
     * Recursively find path to target node
     */
    findPathRecursive(current, targetId, currentPath, allNodes) {
        if (current.id === targetId) {
            return currentPath;
        }
        for (const childId of current.childNodes) {
            const child = allNodes.find((n) => n.id === childId);
            if (!child)
                continue;
            // Prevent cycles
            if (currentPath.some((n) => n.id === child.id))
                continue;
            const path = this.findPathRecursive(child, targetId, [...currentPath, child], allNodes);
            if (path)
                return path;
        }
        return null;
    }
    /**
     * Calculate path diversity (how many distinct paths exist)
     */
    calculatePathDiversity(cascade) {
        const dag = (0, CascadeMap_js_1.buildCascadeDAG)(cascade.nodes);
        const allPaths = this.findCriticalPaths(dag, {
            minProbability: 0.01,
            minMagnitude: 0.01,
        });
        return allPaths.length;
    }
    /**
     * Find most likely outcome (highest probability path)
     */
    findMostLikelyOutcome(cascade) {
        if (cascade.criticalPaths.length === 0)
            return null;
        return cascade.criticalPaths.reduce((max, path) => path.probability > max.probability ? path : max);
    }
    /**
     * Find highest impact outcome (highest magnitude path)
     */
    findHighestImpactOutcome(cascade) {
        if (cascade.criticalPaths.length === 0)
            return null;
        return cascade.criticalPaths.reduce((max, path) => path.totalMagnitude > max.totalMagnitude ? path : max);
    }
}
exports.CascadeSimulator = CascadeSimulator;
