"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const forest_js_1 = require("../../anomaly/forest.js");
(0, globals_1.describe)('isolation forest graph scoring', () => {
    (0, globals_1.it)('detects high-degree nodes as anomalies', () => {
        const graph = {
            nodes: [
                { id: 'hub', tags: ['core'] },
                { id: 'n1' },
                { id: 'n2' },
                { id: 'n3' },
                { id: 'n4' },
            ],
            edges: [
                { source: 'hub', target: 'n1' },
                { source: 'hub', target: 'n2' },
                { source: 'hub', target: 'n3' },
                { source: 'hub', target: 'n4' },
                { source: 'n1', target: 'n2' },
                { source: 'n2', target: 'n3' },
            ],
        };
        const result = (0, forest_js_1.score)(graph);
        const hub = result.nodes.find((node) => node.id === 'hub');
        (0, globals_1.expect)(result.summary.totalNodes).toBe(5);
        (0, globals_1.expect)(result.summary.totalEdges).toBeCloseTo(6);
        (0, globals_1.expect)(result.summary.anomalyCount).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(hub?.isAnomaly).toBe(true);
        (0, globals_1.expect)(hub?.score).toBeGreaterThanOrEqual(result.summary.threshold);
    });
});
