"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SimpleGraph_js_1 = require("../SimpleGraph.js");
(0, globals_1.describe)('SimpleGraphEngine', () => {
    const mockSnapshot = {
        metadata: { timestamp: Date.now() },
        nodes: [
            { id: '1', label: 'Person', properties: {} },
            { id: '2', label: 'Person', properties: {} },
            { id: '3', label: 'Person', properties: {} }
        ],
        edges: [
            { id: 'e1', source: '1', target: '2', type: 'KNOWS', properties: {} },
            { id: 'e2', source: '2', target: '3', type: 'KNOWS', properties: {} }
        ]
    };
    (0, globals_1.it)('calculates metrics correctly', () => {
        const engine = new SimpleGraph_js_1.SimpleGraphEngine(mockSnapshot);
        const metrics = engine.getMetrics();
        (0, globals_1.expect)(metrics.density).toBeCloseTo(2 / (3 * 2)); // 2 edges, 3 nodes => 6 possible
        (0, globals_1.expect)(metrics.avgDegree).toBeCloseTo(2 / 3);
        (0, globals_1.expect)(metrics.communities).toBe(1); // All connected
    });
    (0, globals_1.it)('calculates centrality correctly', () => {
        const engine = new SimpleGraph_js_1.SimpleGraphEngine(mockSnapshot);
        const metrics = engine.getMetrics();
        // Node 2 has 2 connections (1 incoming, 1 outgoing), others have 1
        // My simple implementation sums them up.
        // Node 1: 1 edge (source)
        // Node 2: 2 edges (target of 1, source of 2)
        // Node 3: 1 edge (target)
        (0, globals_1.expect)(metrics.centrality['2']).toBeGreaterThan(metrics.centrality['1']);
        (0, globals_1.expect)(metrics.centrality['2']).toBeGreaterThan(metrics.centrality['3']);
    });
    (0, globals_1.it)('handles disconnected components', () => {
        const disconnectedSnapshot = {
            ...mockSnapshot,
            nodes: [...mockSnapshot.nodes, { id: '4', label: 'Loner', properties: {} }]
        };
        const engine = new SimpleGraph_js_1.SimpleGraphEngine(disconnectedSnapshot);
        const metrics = engine.getMetrics();
        (0, globals_1.expect)(metrics.communities).toBe(2);
    });
});
