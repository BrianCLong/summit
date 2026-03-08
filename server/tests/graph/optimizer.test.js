"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const IndexAdvisor_js_1 = require("../../src/graph/optimizer/IndexAdvisor.js");
const QueryRewriter_js_1 = require("../../src/graph/optimizer/QueryRewriter.js");
const QueryCostEstimator_js_1 = require("../../src/graph/optimizer/QueryCostEstimator.js");
(0, globals_1.describe)('Graph Optimization Components', () => {
    (0, globals_1.describe)('IndexAdvisor', () => {
        const advisor = new IndexAdvisor_js_1.IndexAdvisor();
        (0, globals_1.it)('should recommend indexes when missing', () => {
            const rule = advisor.recommend(['Person.email', 'Person.name']);
            (0, globals_1.expect)(rule.name).toBe('missing_indexes');
            (0, globals_1.expect)(rule.description).toContain('Person.email');
        });
        (0, globals_1.it)('should pass if no indexes required', () => {
            const rule = advisor.recommend([]);
            (0, globals_1.expect)(rule.name).toBe('index_check');
        });
    });
    (0, globals_1.describe)('QueryRewriter', () => {
        const rewriter = new QueryRewriter_js_1.QueryRewriter();
        (0, globals_1.it)('should add LIMIT to unbounded read queries', () => {
            const query = 'MATCH (n) RETURN n';
            const analysis = {
                hasWildcard: true,
                isRead: true,
                nodeCount: 1,
                relationshipCount: 0,
                filterCount: 0,
                aggregationCount: 0,
                joinCount: 0,
                complexity: 1,
                isWrite: false,
                affectedLabels: [],
                requiredIndexes: []
            };
            const result = rewriter.rewrite(query, analysis);
            (0, globals_1.expect)(result.optimizedQuery).toContain('LIMIT 1000');
            (0, globals_1.expect)(result.optimizations).toHaveLength(1);
        });
        (0, globals_1.it)('should warn about cartesian products', () => {
            const query = 'MATCH (a), (b) RETURN a, b';
            const analysis = {
                hasWildcard: false,
                isRead: true,
                nodeCount: 3,
                relationshipCount: 0, // No rels connecting them
                filterCount: 0,
                aggregationCount: 0,
                joinCount: 0,
                complexity: 1,
                isWrite: false,
                affectedLabels: [],
                requiredIndexes: []
            };
            const result = rewriter.rewrite(query, analysis);
            (0, globals_1.expect)(result.optimizations[0].name).toBe('cartesian_product_warning');
        });
    });
    (0, globals_1.describe)('QueryCostEstimator', () => {
        const estimator = new QueryCostEstimator_js_1.QueryCostEstimator();
        (0, globals_1.it)('should estimate cost based on complexity', () => {
            const analysis = {
                hasWildcard: true,
                isRead: true,
                nodeCount: 5,
                relationshipCount: 5,
                filterCount: 2,
                aggregationCount: 0,
                joinCount: 0,
                complexity: 20,
                isWrite: false,
                affectedLabels: [],
                requiredIndexes: []
            };
            const result = estimator.estimate(analysis);
            (0, globals_1.expect)(result.cost).toBeGreaterThan(100);
            (0, globals_1.expect)(result.rows).toBeGreaterThan(1);
        });
    });
});
