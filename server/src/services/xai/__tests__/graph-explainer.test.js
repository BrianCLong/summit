"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const graph_explainer_js_1 = require("../graph-explainer.js");
const sampleGraph = {
    nodes: [
        { id: 'alpha', type: 'entity' },
        { id: 'beta', type: 'entity' },
    ],
    edges: [{ source: 'alpha', target: 'beta', type: 'link' }],
};
(0, globals_1.describe)('graph-explainer', () => {
    (0, globals_1.it)('loads the module without throwing', () => {
        (0, globals_1.expect)(graph_explainer_js_1.explainGraph).toBeInstanceOf(Function);
    });
    (0, globals_1.it)('returns explanations for node importance requests', async () => {
        const result = await (0, graph_explainer_js_1.explainGraph)({
            type: 'node_importance',
            graph: sampleGraph,
            query: 'find hubs',
        });
        (0, globals_1.expect)(Array.isArray(result)).toBe(true);
        (0, globals_1.expect)(result.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result[0]?.kind).toBe('node_importance');
    });
    (0, globals_1.it)('fails open for unsupported types', async () => {
        const result = await (0, graph_explainer_js_1.explainGraph)({
            // @ts-expect-error testing invalid value
            type: 'unsupported',
            graph: sampleGraph,
        });
        (0, globals_1.expect)(result).toHaveLength(1);
        (0, globals_1.expect)(result[0]?.kind).toBe('error');
        (0, globals_1.expect)(result[0]?.title).toContain('Explainability unavailable');
    });
    (0, globals_1.it)('is deterministic for the same input', async () => {
        const first = await (0, graph_explainer_js_1.explainGraph)({
            type: 'edge_importance',
            graph: sampleGraph,
            query: 'connectivity',
        });
        const second = await (0, graph_explainer_js_1.explainGraph)({
            type: 'edge_importance',
            graph: sampleGraph,
            query: 'connectivity',
        });
        (0, globals_1.expect)(first).toEqual(second);
    });
});
