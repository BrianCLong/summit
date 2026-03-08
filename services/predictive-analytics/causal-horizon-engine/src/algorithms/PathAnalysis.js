"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathType = void 0;
exports.analyzeCausalPaths = analyzeCausalPaths;
exports.calculatePathSpecificEffects = calculatePathSpecificEffects;
exports.findMediators = findMediators;
exports.findConfounders = findConfounders;
exports.findColliders = findColliders;
exports.computeDirectEffect = computeDirectEffect;
exports.computeIndirectEffect = computeIndirectEffect;
exports.computeTotalEffect = computeTotalEffect;
const CausalGraph_js_1 = require("../models/CausalGraph.js");
var PathType;
(function (PathType) {
    PathType["DIRECT"] = "DIRECT";
    PathType["MEDIATED"] = "MEDIATED";
    PathType["CONFOUNDED"] = "CONFOUNDED";
    PathType["BLOCKED"] = "BLOCKED";
})(PathType || (exports.PathType = PathType = {}));
/**
 * Analyze all causal paths between source and target
 */
function analyzeCausalPaths(graph, source, target) {
    const allPaths = graph.findAllPaths(source, target);
    const causalPaths = [];
    for (const nodePath of allPaths) {
        const path = createCausalPath(graph, nodePath);
        causalPaths.push(path);
    }
    // Separate direct and indirect paths
    const directPaths = causalPaths.filter((p) => p.type === PathType.DIRECT);
    const indirectPaths = causalPaths.filter((p) => p.type === PathType.MEDIATED);
    // Calculate effects
    const totalEffect = causalPaths.reduce((sum, p) => sum + p.contribution, 0);
    const directEffect = directPaths.reduce((sum, p) => sum + p.contribution, 0);
    const indirectEffect = indirectPaths.reduce((sum, p) => sum + p.contribution, 0);
    return {
        source,
        target,
        directPaths,
        indirectPaths,
        totalEffect,
        directEffect,
        indirectEffect,
    };
}
/**
 * Create a CausalPath object from a node path
 */
function createCausalPath(graph, nodePath) {
    const edges = [];
    let strength = 1;
    // Collect edges and calculate path strength
    for (let i = 0; i < nodePath.length - 1; i++) {
        const edgeId = `${nodePath[i]}->${nodePath[i + 1]}`;
        const edge = graph.getEdge(edgeId);
        if (edge) {
            edges.push(edge);
            strength *= edge.strength;
        }
        else {
            // Edge doesn't exist, path is invalid
            strength = 0;
        }
    }
    // Classify path type
    const type = classifyPath(nodePath, edges);
    // Determine if path is active (not blocked)
    const isActive = type !== PathType.BLOCKED;
    return {
        nodes: nodePath,
        edges,
        type,
        strength,
        contribution: isActive ? strength : 0,
        isActive,
    };
}
/**
 * Classify the type of causal path
 */
function classifyPath(nodePath, edges) {
    // Direct path: only 2 nodes
    if (nodePath.length === 2) {
        return PathType.DIRECT;
    }
    // Check if path contains confounders or colliders
    let hasConfounder = false;
    let hasCollider = false;
    for (const edge of edges) {
        if (edge.type === CausalGraph_js_1.EdgeType.CONFOUNDER) {
            hasConfounder = true;
        }
        if (edge.type === CausalGraph_js_1.EdgeType.COLLIDER) {
            hasCollider = true;
        }
    }
    if (hasCollider) {
        return PathType.BLOCKED; // Colliders block paths by default
    }
    if (hasConfounder) {
        return PathType.CONFOUNDED;
    }
    // Otherwise, it's a mediated path
    return PathType.MEDIATED;
}
/**
 * Calculate path-specific effects
 * This decomposes total effect into contributions from each path
 */
function calculatePathSpecificEffects(paths) {
    const totalStrength = paths.reduce((sum, p) => sum + Math.abs(p.strength), 0);
    if (totalStrength === 0) {
        return paths.map((p) => ({ ...p, contribution: 0 }));
    }
    // Normalize contributions
    return paths.map((p) => ({
        ...p,
        contribution: p.strength / totalStrength,
    }));
}
/**
 * Find mediators on paths between source and target
 */
function findMediators(graph, source, target) {
    const mediators = new Set();
    const paths = graph.findAllPaths(source, target);
    for (const path of paths) {
        // Mediators are nodes in the middle of the path
        for (let i = 1; i < path.length - 1; i++) {
            mediators.add(path[i]);
        }
    }
    return Array.from(mediators);
}
/**
 * Find confounders between source and target
 * Confounders are common causes of both
 */
function findConfounders(graph, source, target) {
    const ancestorsSource = graph.getAncestors(source);
    const ancestorsTarget = graph.getAncestors(target);
    // Common ancestors are potential confounders
    const confounders = [];
    for (const ancestor of ancestorsSource) {
        if (ancestorsTarget.has(ancestor)) {
            confounders.push(ancestor);
        }
    }
    return confounders;
}
/**
 * Find colliders on paths between source and target
 * Collider: A node with two incoming edges on the path
 */
function findColliders(graph, source, target) {
    const colliders = new Set();
    const paths = graph.findAllPaths(source, target);
    for (const path of paths) {
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            // Check if both edges point into current
            const hasEdgeFromPrev = graph.getChildren(prev).includes(current);
            const hasEdgeFromNext = graph.getChildren(next).includes(current);
            if (hasEdgeFromPrev && hasEdgeFromNext) {
                colliders.add(current);
            }
        }
    }
    return Array.from(colliders);
}
/**
 * Compute the direct effect (not mediated)
 */
function computeDirectEffect(graph, source, target) {
    const edgeId = `${source}->${target}`;
    const edge = graph.getEdge(edgeId);
    return edge ? edge.strength : 0;
}
/**
 * Compute the indirect effect (through mediators)
 */
function computeIndirectEffect(graph, source, target) {
    const analysis = analyzeCausalPaths(graph, source, target);
    return analysis.indirectEffect;
}
/**
 * Compute the total causal effect
 */
function computeTotalEffect(graph, source, target) {
    const analysis = analyzeCausalPaths(graph, source, target);
    return analysis.totalEffect;
}
