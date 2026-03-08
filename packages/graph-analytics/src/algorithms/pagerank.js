"use strict";
/**
 * PageRank Algorithm Implementation
 *
 * PageRank is a link analysis algorithm that assigns a numerical weight to each node
 * in a graph, measuring its relative importance within the network. Originally developed
 * by Google for ranking web pages, it's widely used in intelligence analysis for
 * identifying influential entities.
 *
 * @module algorithms/pagerank
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePageRank = calculatePageRank;
exports.calculatePersonalizedPageRank = calculatePersonalizedPageRank;
exports.getTopKNodes = getTopKNodes;
exports.calculateNodeImportance = calculateNodeImportance;
/**
 * Computes PageRank scores for all nodes in a graph
 *
 * @param graph - Graph data with nodes and edges
 * @param options - PageRank configuration options
 * @returns PageRank results including scores for each node
 */
function calculatePageRank(graph, options = {}) {
    const startTime = performance.now();
    const { dampingFactor = 0.85, maxIterations = 100, convergenceThreshold = 0.0001, initialRank = 1.0, weightProperty = 'weight', personalizedVector, } = options;
    const nodes = graph.nodes;
    const nodeCount = nodes.length;
    if (nodeCount === 0) {
        return {
            ranks: new Map(),
            iterations: 0,
            convergenceDelta: 0,
            converged: true,
            executionTime: performance.now() - startTime,
        };
    }
    // Initialize ranks
    const ranks = new Map();
    const newRanks = new Map();
    for (const node of nodes) {
        ranks.set(node, initialRank / nodeCount);
    }
    // Build adjacency structures
    const outLinks = new Map();
    const inLinks = new Map();
    const outDegreeSum = new Map();
    for (const node of nodes) {
        outLinks.set(node, []);
        inLinks.set(node, []);
        outDegreeSum.set(node, 0);
    }
    for (const edge of graph.edges) {
        const weight = edge.weight || 1.0;
        outLinks.get(edge.source)?.push({ target: edge.target, weight });
        inLinks.get(edge.target)?.push({ source: edge.source, weight });
        outDegreeSum.set(edge.source, (outDegreeSum.get(edge.source) || 0) + weight);
    }
    // Identify dangling nodes (nodes with no outgoing links)
    const danglingNodes = nodes.filter((node) => (outLinks.get(node)?.length || 0) === 0);
    let converged = false;
    let iterations = 0;
    let convergenceDelta = Infinity;
    // Power iteration
    for (iterations = 0; iterations < maxIterations; iterations++) {
        // Calculate dangling node contribution
        let danglingContribution = 0;
        for (const node of danglingNodes) {
            danglingContribution += ranks.get(node) || 0;
        }
        danglingContribution *= dampingFactor / nodeCount;
        // Calculate new ranks
        let delta = 0;
        for (const node of nodes) {
            // Base rank from teleportation
            let newRank = (1 - dampingFactor) / nodeCount;
            // Add personalized teleport probability if provided
            if (personalizedVector) {
                const personalizedProb = personalizedVector.get(node) || 0;
                newRank = (1 - dampingFactor) * personalizedProb;
            }
            // Add contribution from dangling nodes
            newRank += danglingContribution;
            // Add contribution from incoming links
            const incoming = inLinks.get(node) || [];
            for (const { source, weight } of incoming) {
                const sourceRank = ranks.get(source) || 0;
                const sourceDegreeSum = outDegreeSum.get(source) || 1;
                newRank += dampingFactor * sourceRank * (weight / sourceDegreeSum);
            }
            newRanks.set(node, newRank);
            // Calculate convergence delta
            delta += Math.abs(newRank - (ranks.get(node) || 0));
        }
        // Swap rank maps
        for (const node of nodes) {
            ranks.set(node, newRanks.get(node) || 0);
        }
        convergenceDelta = delta;
        // Check convergence
        if (delta < convergenceThreshold) {
            converged = true;
            break;
        }
    }
    // Normalize ranks to sum to 1
    const rankSum = Array.from(ranks.values()).reduce((sum, rank) => sum + rank, 0);
    if (rankSum > 0) {
        for (const [node, rank] of ranks.entries()) {
            ranks.set(node, rank / rankSum);
        }
    }
    const executionTime = performance.now() - startTime;
    return {
        ranks,
        iterations: iterations + 1,
        convergenceDelta,
        converged,
        executionTime,
    };
}
/**
 * Computes Personalized PageRank for a set of seed nodes
 *
 * Personalized PageRank biases the random walk to favor certain nodes,
 * useful for finding nodes similar to a given set of seed nodes.
 *
 * @param graph - Graph data
 * @param seedNodes - Nodes to personalize the ranking for
 * @param options - PageRank options
 * @returns PageRank results
 */
function calculatePersonalizedPageRank(graph, seedNodes, options = {}) {
    // Create uniform personalized vector for seed nodes
    const personalizedVector = new Map();
    const seedWeight = 1.0 / seedNodes.length;
    for (const node of seedNodes) {
        personalizedVector.set(node, seedWeight);
    }
    return calculatePageRank(graph, {
        ...options,
        personalizedVector,
    });
}
/**
 * Identifies the top K nodes by PageRank score
 *
 * @param pageRankResult - Result from calculatePageRank
 * @param k - Number of top nodes to return
 * @returns Array of [nodeId, score] tuples sorted by score descending
 */
function getTopKNodes(pageRankResult, k) {
    const sortedNodes = Array.from(pageRankResult.ranks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, k);
    return sortedNodes;
}
/**
 * Calculates the importance score difference if a node were removed
 * Used for identifying critical nodes in the network
 *
 * @param graph - Graph data
 * @param nodeId - Node to test removal of
 * @param options - PageRank options
 * @returns Impact score (0-1, higher means more critical)
 */
function calculateNodeImportance(graph, nodeId, options = {}) {
    // Calculate original PageRank
    const originalResult = calculatePageRank(graph, options);
    // Create graph without the node
    const filteredGraph = {
        nodes: graph.nodes.filter(n => n !== nodeId),
        edges: graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    };
    // Calculate PageRank without the node
    const filteredResult = calculatePageRank(filteredGraph, options);
    // Calculate the total change in ranks
    let totalChange = 0;
    for (const node of filteredGraph.nodes) {
        const originalRank = originalResult.ranks.get(node) || 0;
        const newRank = filteredResult.ranks.get(node) || 0;
        totalChange += Math.abs(originalRank - newRank);
    }
    // Normalize by the number of remaining nodes
    return filteredGraph.nodes.length > 0 ? totalChange / filteredGraph.nodes.length : 0;
}
