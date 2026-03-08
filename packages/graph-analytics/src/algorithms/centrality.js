"use strict";
/**
 * Additional Centrality Measures
 *
 * This module implements Closeness and Eigenvector centrality algorithms.
 * These complement PageRank and Betweenness to provide a complete picture
 * of node importance in intelligence networks.
 *
 * @module algorithms/centrality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateClosenessCentrality = calculateClosenessCentrality;
exports.calculateEigenvectorCentrality = calculateEigenvectorCentrality;
exports.calculateCompositeCentrality = calculateCompositeCentrality;
exports.findMostCentralNodes = findMostCentralNodes;
/**
 * Calculates Closeness Centrality for all nodes
 *
 * Closeness centrality measures how close a node is to all other nodes in the network.
 * High closeness indicates a node can quickly reach all other nodes, making it central
 * for information dissemination or coordination.
 *
 * @param graph - Graph data
 * @param options - Closeness calculation options
 * @returns Closeness centrality scores
 */
function calculateClosenessCentrality(graph, options = {}) {
    const startTime = performance.now();
    const { normalized = true, directed = false, weightProperty, harmonic = false, } = options;
    const nodes = graph.nodes;
    const nodeCount = nodes.length;
    const closeness = new Map();
    if (nodeCount === 0) {
        return {
            closeness,
            avgCloseness: 0,
            executionTime: performance.now() - startTime,
            normalized,
        };
    }
    // Build adjacency list
    const adjacency = new Map();
    for (const node of nodes) {
        adjacency.set(node, new Map());
    }
    for (const edge of graph.edges) {
        const weight = weightProperty && edge.weight ? edge.weight : 1;
        adjacency.get(edge.source)?.set(edge.target, weight);
        if (!directed) {
            adjacency.get(edge.target)?.set(edge.source, weight);
        }
    }
    // Calculate closeness for each node
    for (const source of nodes) {
        const distances = calculateShortestPaths(source, adjacency, weightProperty !== undefined);
        if (harmonic) {
            // Harmonic closeness - works for disconnected graphs
            let harmonicSum = 0;
            for (const [target, distance] of distances.entries()) {
                if (target !== source && distance < Infinity) {
                    harmonicSum += 1 / distance;
                }
            }
            closeness.set(source, harmonicSum);
        }
        else {
            // Standard closeness
            let totalDistance = 0;
            let reachableNodes = 0;
            for (const [target, distance] of distances.entries()) {
                if (target !== source && distance < Infinity) {
                    totalDistance += distance;
                    reachableNodes++;
                }
            }
            if (reachableNodes > 0) {
                const closenessCentrality = reachableNodes / totalDistance;
                if (normalized && nodeCount > 1) {
                    // Normalize by reachability
                    closeness.set(source, (closenessCentrality * reachableNodes) / (nodeCount - 1));
                }
                else {
                    closeness.set(source, closenessCentrality);
                }
            }
            else {
                closeness.set(source, 0);
            }
        }
    }
    // Normalize harmonic closeness if requested
    if (harmonic && normalized && nodeCount > 1) {
        for (const [node, score] of closeness.entries()) {
            closeness.set(node, score / (nodeCount - 1));
        }
    }
    const avgCloseness = Array.from(closeness.values()).reduce((sum, c) => sum + c, 0) / nodeCount;
    const executionTime = performance.now() - startTime;
    return {
        closeness,
        avgCloseness,
        executionTime,
        normalized,
    };
}
/**
 * Calculates Eigenvector Centrality using power iteration
 *
 * Eigenvector centrality assigns scores based on the principle that connections
 * to high-scoring nodes contribute more than connections to low-scoring nodes.
 * It's similar to PageRank but without the damping factor.
 *
 * @param graph - Graph data
 * @param options - Eigenvector calculation options
 * @returns Eigenvector centrality scores
 */
function calculateEigenvectorCentrality(graph, options = {}) {
    const startTime = performance.now();
    const { maxIterations = 100, convergenceThreshold = 0.0001, directed = false, weightProperty, } = options;
    const nodes = graph.nodes;
    const nodeCount = nodes.length;
    const centrality = new Map();
    const newCentrality = new Map();
    if (nodeCount === 0) {
        return {
            centrality,
            iterations: 0,
            converged: true,
            executionTime: performance.now() - startTime,
        };
    }
    // Initialize centrality scores
    for (const node of nodes) {
        centrality.set(node, 1.0 / Math.sqrt(nodeCount));
    }
    // Build adjacency list
    const adjacency = new Map();
    for (const node of nodes) {
        adjacency.set(node, new Map());
    }
    for (const edge of graph.edges) {
        const weight = weightProperty && edge.weight ? edge.weight : 1;
        // For eigenvector centrality, we look at incoming edges
        adjacency.get(edge.target)?.set(edge.source, weight);
        if (!directed) {
            adjacency.get(edge.source)?.set(edge.target, weight);
        }
    }
    let converged = false;
    let iterations = 0;
    // Power iteration
    for (iterations = 0; iterations < maxIterations; iterations++) {
        let maxChange = 0;
        // Calculate new centrality values
        for (const node of nodes) {
            let newValue = 0;
            // Sum of centralities of neighbors
            const neighbors = adjacency.get(node) || new Map();
            for (const [neighbor, weight] of neighbors) {
                newValue += (centrality.get(neighbor) || 0) * weight;
            }
            newCentrality.set(node, newValue);
        }
        // Normalize (L2 norm)
        let norm = 0;
        for (const [node, value] of newCentrality) {
            norm += value * value;
        }
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (const [node, value] of newCentrality) {
                newCentrality.set(node, value / norm);
            }
        }
        // Check convergence
        for (const node of nodes) {
            const oldValue = centrality.get(node) || 0;
            const newValue = newCentrality.get(node) || 0;
            maxChange = Math.max(maxChange, Math.abs(newValue - oldValue));
            centrality.set(node, newValue);
        }
        if (maxChange < convergenceThreshold) {
            converged = true;
            break;
        }
    }
    const executionTime = performance.now() - startTime;
    return {
        centrality,
        iterations: iterations + 1,
        converged,
        executionTime,
    };
}
/**
 * Calculate shortest paths from source using BFS or Dijkstra
 */
function calculateShortestPaths(source, adjacency, weighted) {
    const distances = new Map();
    // Initialize all distances to infinity
    for (const [node] of adjacency) {
        distances.set(node, Infinity);
    }
    distances.set(source, 0);
    if (weighted) {
        // Dijkstra's algorithm
        const queue = [{ node: source, dist: 0 }];
        const visited = new Set();
        while (queue.length > 0) {
            queue.sort((a, b) => a.dist - b.dist);
            const { node: current, dist: currentDist } = queue.shift();
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const neighbors = adjacency.get(current) || new Map();
            for (const [neighbor, weight] of neighbors) {
                const newDist = currentDist + weight;
                const oldDist = distances.get(neighbor) || Infinity;
                if (newDist < oldDist) {
                    distances.set(neighbor, newDist);
                    queue.push({ node: neighbor, dist: newDist });
                }
            }
        }
    }
    else {
        // BFS for unweighted graphs
        const queue = [source];
        const visited = new Set([source]);
        while (queue.length > 0) {
            const current = queue.shift();
            const currentDist = distances.get(current) || 0;
            const neighbors = adjacency.get(current) || new Map();
            for (const [neighbor] of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    distances.set(neighbor, currentDist + 1);
                    queue.push(neighbor);
                }
            }
        }
    }
    return distances;
}
/**
 * Combines multiple centrality measures into a composite score
 * Useful for getting an overall importance ranking
 */
function calculateCompositeCentrality(pageRank, betweenness, closeness, eigenvector, weights = {}) {
    const { pr = 0.25, bc = 0.25, cc = 0.25, ec = 0.25, } = weights;
    // Normalize weights
    const totalWeight = pr + bc + cc + ec;
    const wPR = pr / totalWeight;
    const wBC = bc / totalWeight;
    const wCC = cc / totalWeight;
    const wEC = ec / totalWeight;
    const composite = new Map();
    // Get all unique nodes
    const allNodes = new Set([
        ...pageRank.keys(),
        ...betweenness.keys(),
        ...closeness.keys(),
        ...eigenvector.keys(),
    ]);
    for (const node of allNodes) {
        const prScore = pageRank.get(node) || 0;
        const bcScore = betweenness.get(node) || 0;
        const ccScore = closeness.get(node) || 0;
        const ecScore = eigenvector.get(node) || 0;
        const compositeScore = wPR * prScore + wBC * bcScore + wCC * ccScore + wEC * ecScore;
        composite.set(node, compositeScore);
    }
    return composite;
}
/**
 * Identifies the most central nodes by multiple metrics
 */
function findMostCentralNodes(composite, k = 10) {
    return Array.from(composite.entries())
        .map(([node, score]) => ({ node, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
}
