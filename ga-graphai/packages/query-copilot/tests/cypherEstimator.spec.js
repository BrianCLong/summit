"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('cypher estimator', () => {
    (0, vitest_1.it)('derives depth and rows from Cypher structure', () => {
        const cypher = 'MATCH (p:Person)-[r:EMPLOYED_BY]->(o:Org)\nWHERE p.location = "Berlin"\nRETURN p, r LIMIT 20';
        const depth = (0, index_js_1.estimateDepth)(cypher);
        const rows = (0, index_js_1.estimateRows)(cypher, {
            anticipatedRows: 120,
            estimatedLatencyMs: 300,
            estimatedRru: 2,
        });
        const costScore = (0, index_js_1.buildCostScore)(rows, depth);
        (0, vitest_1.expect)(depth).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(rows).toBeLessThanOrEqual(20);
        (0, vitest_1.expect)(costScore).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('flags write intent and enforces expansion caps', () => {
        const { estimate, warnings } = (0, index_js_1.analyzeCypherPlan)('MATCH (n)-[r]->(m) DELETE r', { maxDepth: 0 });
        (0, vitest_1.expect)(estimate.containsWrite).toBe(true);
        (0, vitest_1.expect)(warnings.some((warning) => warning.includes('write'))).toBe(true);
        (0, vitest_1.expect)(warnings.some((warning) => warning.includes('sandbox cap'))).toBe(true);
    });
});
