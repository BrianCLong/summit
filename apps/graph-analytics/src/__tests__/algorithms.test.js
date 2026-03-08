"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pathfinding_1 = require("../algorithms/pathfinding");
const centrality_1 = require("../algorithms/centrality");
const community_1 = require("../algorithms/community");
const patterns_1 = require("../algorithms/patterns");
/**
 * Test Graph Algorithms
 *
 * Tests pathfinding, centrality, community detection, and pattern detection
 */
(0, globals_1.describe)('Graph Analytics Algorithms', () => {
    let testGraphA;
    let testGraphB;
    (0, globals_1.beforeEach)(() => {
        // Test Graph A: Small graph with known structure
        // A -> B -> D
        // A -> C -> D
        // B <-> C (undirected)
        testGraphA = {
            nodes: [
                { id: 'A', labels: ['Person'], properties: { name: 'Alice' } },
                { id: 'B', labels: ['Person'], properties: { name: 'Bob' } },
                { id: 'C', labels: ['Person'], properties: { name: 'Charlie' } },
                { id: 'D', labels: ['Person'], properties: { name: 'Dave' } },
            ],
            edges: [
                { id: 'e1', fromId: 'A', toId: 'B', type: 'KNOWS', properties: {} },
                { id: 'e2', fromId: 'B', toId: 'D', type: 'KNOWS', properties: {} },
                { id: 'e3', fromId: 'A', toId: 'C', type: 'KNOWS', properties: {} },
                { id: 'e4', fromId: 'C', toId: 'D', type: 'KNOWS', properties: {} },
                { id: 'e5', fromId: 'B', toId: 'C', type: 'FRIENDS', properties: {} },
            ],
        };
        // Test Graph B: Larger graph with communities and patterns
        testGraphB = createTestGraphWithCommunities();
    });
    (0, globals_1.describe)('Pathfinding', () => {
        (0, globals_1.it)('should find shortest path between nodes', () => {
            const result = (0, pathfinding_1.shortestPath)(testGraphA, 'A', 'D');
            (0, globals_1.expect)(result.path).not.toBeNull();
            (0, globals_1.expect)(result.path?.length).toBe(2); // A->B->D or A->C->D
            (0, globals_1.expect)(result.path?.nodeIds[0]).toBe('A');
            (0, globals_1.expect)(result.path?.nodeIds[result.path.nodeIds.length - 1]).toBe('D');
        });
        (0, globals_1.it)('should return null when no path exists', () => {
            const isolatedGraph = {
                nodes: [
                    { id: 'X', labels: [], properties: {} },
                    { id: 'Y', labels: [], properties: {} },
                ],
                edges: [],
            };
            const result = (0, pathfinding_1.shortestPath)(isolatedGraph, 'X', 'Y');
            (0, globals_1.expect)(result.path).toBeNull();
        });
        (0, globals_1.it)('should find K shortest paths', () => {
            const result = (0, pathfinding_1.kShortestPaths)(testGraphA, 'A', 'D', 2);
            (0, globals_1.expect)(result.paths.length).toBe(2);
            (0, globals_1.expect)(result.paths[0].length).toBeLessThanOrEqual(result.paths[1].length);
            // All paths should start with A and end with D
            for (const path of result.paths) {
                (0, globals_1.expect)(path.nodeIds[0]).toBe('A');
                (0, globals_1.expect)(path.nodeIds[path.nodeIds.length - 1]).toBe('D');
            }
        });
        (0, globals_1.it)('should respect path constraints', () => {
            const result = (0, pathfinding_1.kShortestPaths)(testGraphA, 'A', 'D', 3, {
                disallowedEdgeTypes: ['FRIENDS'],
                maxDepth: 3,
            });
            // Should find paths, but none should use FRIENDS edges
            for (const path of result.paths) {
                (0, globals_1.expect)(path.relationships).not.toContain('FRIENDS');
            }
        });
        (0, globals_1.it)('should apply policy filters', () => {
            const nodePolicyFilter = (node) => node.id !== 'B';
            const result = (0, pathfinding_1.shortestPath)(testGraphA, 'A', 'D', undefined, nodePolicyFilter);
            // Should find path through C, not B
            if (result.path) {
                (0, globals_1.expect)(result.path.nodeIds).not.toContain('B');
                (0, globals_1.expect)(result.filteredNodesCount).toBe(1);
            }
        });
    });
    (0, globals_1.describe)('Centrality Metrics', () => {
        (0, globals_1.it)('should calculate degree centrality', () => {
            const result = (0, centrality_1.computeCentrality)(testGraphA);
            (0, globals_1.expect)(result.scores.degree).toBeDefined();
            (0, globals_1.expect)(Object.keys(result.scores.degree).length).toBe(4);
            // B and C should have highest degree (3 each)
            (0, globals_1.expect)(result.scores.degree.B).toBe(3);
            (0, globals_1.expect)(result.scores.degree.C).toBe(3);
        });
        (0, globals_1.it)('should calculate betweenness centrality', () => {
            const result = (0, centrality_1.computeCentrality)(testGraphA);
            (0, globals_1.expect)(result.scores.betweenness).toBeDefined();
            // B and C are on shortest paths between A and D
            (0, globals_1.expect)(result.scores.betweenness.B).toBeGreaterThan(0);
            (0, globals_1.expect)(result.scores.betweenness.C).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should identify top central nodes', () => {
            const result = (0, centrality_1.computeCentrality)(testGraphA, { topN: 2 });
            (0, globals_1.expect)(result.summaries.topByDegree.length).toBeLessThanOrEqual(2);
            (0, globals_1.expect)(result.summaries.topByBetweenness.length).toBeLessThanOrEqual(2);
        });
        (0, globals_1.it)('should calculate eigenvector centrality when requested', () => {
            const result = (0, centrality_1.computeCentrality)(testGraphA, {
                includeEigenvector: true,
            });
            (0, globals_1.expect)(result.scores.eigenvector).toBeDefined();
            (0, globals_1.expect)(result.summaries.topByEigenvector).toBeDefined();
        });
    });
    (0, globals_1.describe)('Community Detection', () => {
        (0, globals_1.it)('should detect communities with Louvain', () => {
            const result = (0, community_1.detectCommunities)(testGraphB, 'louvain');
            (0, globals_1.expect)(result.numCommunities).toBeGreaterThan(1);
            (0, globals_1.expect)(result.communities.length).toBe(testGraphB.nodes.length);
            // Each node should be assigned to a community
            for (const node of testGraphB.nodes) {
                const assignment = result.communities.find((c) => c.nodeId === node.id);
                (0, globals_1.expect)(assignment).toBeDefined();
                (0, globals_1.expect)(assignment?.communityId).toBeDefined();
            }
        });
        (0, globals_1.it)('should detect communities with Label Propagation', () => {
            const result = (0, community_1.detectCommunities)(testGraphB, 'label_propagation');
            (0, globals_1.expect)(result.numCommunities).toBeGreaterThan(0);
            (0, globals_1.expect)(result.communities.length).toBe(testGraphB.nodes.length);
        });
        (0, globals_1.it)('should calculate community sizes and densities', () => {
            const result = (0, community_1.detectCommunities)(testGraphB, 'louvain');
            (0, globals_1.expect)(result.sizes).toBeDefined();
            (0, globals_1.expect)(result.densities).toBeDefined();
            // Sizes should sum to total nodes
            const totalNodes = Object.values(result.sizes).reduce((sum, size) => sum + size, 0);
            (0, globals_1.expect)(totalNodes).toBe(testGraphB.nodes.length);
        });
    });
    (0, globals_1.describe)('Pattern Detection', () => {
        (0, globals_1.it)('should detect star patterns', () => {
            const starGraph = createStarGraph();
            const patterns = (0, patterns_1.detectStarPatterns)(starGraph, { minDegree: 5 });
            (0, globals_1.expect)(patterns.length).toBeGreaterThan(0);
            (0, globals_1.expect)(patterns[0].patternType).toBe('STAR');
            (0, globals_1.expect)(patterns[0].nodes.length).toBeGreaterThan(5);
        });
        (0, globals_1.it)('should detect bipartite fan patterns', () => {
            const fanGraph = createBipartiteFanGraph();
            const patterns = (0, patterns_1.detectBipartiteFanPatterns)(fanGraph, {
                minSources: 3,
                minTargets: 2,
            });
            (0, globals_1.expect)(patterns.length).toBeGreaterThan(0);
            (0, globals_1.expect)(patterns[0].patternType).toBe('BIPARTITE_FAN');
            (0, globals_1.expect)(patterns[0].metrics?.sources).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(patterns[0].metrics?.targets).toBeGreaterThanOrEqual(2);
        });
        (0, globals_1.it)('should run pattern miner with multiple patterns', () => {
            const result = (0, patterns_1.runPatternMiner)(testGraphB, {
                star: { minDegree: 4 },
                bipartiteFan: { minSources: 2, minTargets: 2 },
            });
            (0, globals_1.expect)(result.patterns).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.patterns)).toBe(true);
        });
        (0, globals_1.it)('should include pattern summaries', () => {
            const starGraph = createStarGraph();
            const patterns = (0, patterns_1.detectStarPatterns)(starGraph, { minDegree: 5 });
            (0, globals_1.expect)(patterns.length).toBeGreaterThan(0);
            (0, globals_1.expect)(patterns[0].summary).toBeDefined();
            (0, globals_1.expect)(typeof patterns[0].summary).toBe('string');
            (0, globals_1.expect)(patterns[0].summary.length).toBeGreaterThan(0);
        });
    });
});
/**
 * Helper: Create a graph with clear community structure
 */
function createTestGraphWithCommunities() {
    const nodes = [];
    const edges = [];
    // Community 1: nodes 1-5
    for (let i = 1; i <= 5; i++) {
        nodes.push({
            id: `n${i}`,
            labels: ['Community1'],
            properties: { group: 1 },
        });
    }
    // Community 2: nodes 6-10
    for (let i = 6; i <= 10; i++) {
        nodes.push({
            id: `n${i}`,
            labels: ['Community2'],
            properties: { group: 2 },
        });
    }
    // Dense connections within community 1
    for (let i = 1; i <= 5; i++) {
        for (let j = i + 1; j <= 5; j++) {
            edges.push({
                id: `e_c1_${i}_${j}`,
                fromId: `n${i}`,
                toId: `n${j}`,
                type: 'CONNECTED',
                properties: {},
            });
        }
    }
    // Dense connections within community 2
    for (let i = 6; i <= 10; i++) {
        for (let j = i + 1; j <= 10; j++) {
            edges.push({
                id: `e_c2_${i}_${j}`,
                fromId: `n${i}`,
                toId: `n${j}`,
                type: 'CONNECTED',
                properties: {},
            });
        }
    }
    // Sparse connections between communities
    edges.push({
        id: 'e_bridge1',
        fromId: 'n3',
        toId: 'n7',
        type: 'CONNECTED',
        properties: {},
    });
    return { nodes, edges };
}
/**
 * Helper: Create a star graph
 */
function createStarGraph() {
    const nodes = [{ id: 'center', labels: ['Hub'], properties: {} }];
    const edges = [];
    for (let i = 1; i <= 10; i++) {
        nodes.push({
            id: `spoke${i}`,
            labels: ['Spoke'],
            properties: {},
        });
        edges.push({
            id: `e${i}`,
            fromId: 'center',
            toId: `spoke${i}`,
            type: 'CONNECTS',
            properties: {},
        });
    }
    return { nodes, edges };
}
/**
 * Helper: Create a bipartite fan graph
 */
function createBipartiteFanGraph() {
    const nodes = [{ id: 'intermediate', labels: ['Middle'], properties: {} }];
    const edges = [];
    // Sources
    for (let i = 1; i <= 5; i++) {
        nodes.push({
            id: `source${i}`,
            labels: ['Source'],
            properties: {},
        });
        edges.push({
            id: `e_in${i}`,
            fromId: `source${i}`,
            toId: 'intermediate',
            type: 'FLOWS_TO',
            properties: {},
        });
    }
    // Targets
    for (let i = 1; i <= 3; i++) {
        nodes.push({
            id: `target${i}`,
            labels: ['Target'],
            properties: {},
        });
        edges.push({
            id: `e_out${i}`,
            fromId: 'intermediate',
            toId: `target${i}`,
            type: 'FLOWS_TO',
            properties: {},
        });
    }
    return { nodes, edges };
}
