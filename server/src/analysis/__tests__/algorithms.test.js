"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const shortestPath_js_1 = require("../algorithms/shortestPath.js");
const centrality_js_1 = require("../algorithms/centrality.js");
const community_js_1 = require("../algorithms/community.js");
const traversal_js_1 = require("../algorithms/traversal.js");
const testGraph = {
    nodes: [
        { id: 'A', type: 'person', tenantId: 't1', properties: {} },
        { id: 'B', type: 'person', tenantId: 't1', properties: {} },
        { id: 'C', type: 'person', tenantId: 't1', properties: {} },
        { id: 'D', type: 'person', tenantId: 't1', properties: {} },
        { id: 'E', type: 'person', tenantId: 't1', properties: {} } // Isolated
    ],
    edges: [
        { id: 'e1', source: 'A', target: 'B', type: 'knows', tenantId: 't1', properties: {} },
        { id: 'e2', source: 'B', target: 'C', type: 'knows', tenantId: 't1', properties: {} },
        { id: 'e3', source: 'C', target: 'A', type: 'knows', tenantId: 't1', properties: {} }, // Cycle A-B-C-A
        { id: 'e4', source: 'C', target: 'D', type: 'knows', tenantId: 't1', properties: {} }
    ]
};
(0, globals_1.describe)('Graph Algorithms', () => {
    (0, globals_1.describe)('Shortest Path', () => {
        (0, globals_1.it)('finds path from A to D', () => {
            const result = (0, shortestPath_js_1.shortestPath)(testGraph, 'A', 'D');
            (0, globals_1.expect)(result.distance).toBe(3);
            (0, globals_1.expect)(result.path).toEqual(['A', 'B', 'C', 'D']);
        });
        (0, globals_1.it)('returns null for unreachable nodes', () => {
            const result = (0, shortestPath_js_1.shortestPath)(testGraph, 'A', 'E');
            (0, globals_1.expect)(result.path).toBeNull();
        });
    });
    (0, globals_1.describe)('Degree Centrality', () => {
        (0, globals_1.it)('calculates degree centrality correctly', () => {
            const result = (0, centrality_js_1.degreeCentrality)(testGraph, 'both');
            // A: out 1 (e1), in 1 (e3) = 2
            // B: out 1 (e2), in 1 (e1) = 2
            // C: out 2 (e3, e4), in 1 (e2) = 3
            // D: out 0, in 1 (e4) = 1
            // E: 0
            (0, globals_1.expect)(result.scores['C']).toBe(3);
            (0, globals_1.expect)(result.scores['E']).toBe(0);
            (0, globals_1.expect)(result.sortedNodes[0].id).toBe('C');
        });
    });
    (0, globals_1.describe)('Connected Components', () => {
        (0, globals_1.it)('identifies components correctly', () => {
            const result = (0, community_js_1.connectedComponents)(testGraph);
            (0, globals_1.expect)(result.componentCount).toBe(2); // {A,B,C,D} and {E}
            const componentSizes = result.components.map(c => c.length).sort((a, b) => b - a);
            (0, globals_1.expect)(componentSizes).toEqual([4, 1]);
        });
    });
    (0, globals_1.describe)('k-Hop Neighborhood', () => {
        (0, globals_1.it)('finds 1-hop neighborhood of B', () => {
            const result = (0, traversal_js_1.kHopNeighborhood)(testGraph, 'B', 1, 'out');
            // B -> C
            (0, globals_1.expect)(result.nodes.map(n => n.id)).toContain('C');
            (0, globals_1.expect)(result.nodes.length).toBe(2); // B, C
        });
        (0, globals_1.it)('finds 2-hop neighborhood of A', () => {
            const result = (0, traversal_js_1.kHopNeighborhood)(testGraph, 'A', 2, 'out');
            // A->B->C
            (0, globals_1.expect)(result.nodes.map(n => n.id).sort()).toEqual(['A', 'B', 'C']);
        });
    });
});
