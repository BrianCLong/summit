
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IndexAdvisor } from '../../src/graph/optimizer/IndexAdvisor.js';
import { QueryRewriter } from '../../src/graph/optimizer/QueryRewriter.js';
import { QueryCostEstimator } from '../../src/graph/optimizer/QueryCostEstimator.js';

describe('Graph Optimization Components', () => {

    describe('IndexAdvisor', () => {
        const advisor = new IndexAdvisor();

        it('should recommend indexes when missing', () => {
            const rule = advisor.recommend(['Person.email', 'Person.name']);
            expect(rule.name).toBe('missing_indexes');
            expect(rule.description).toContain('Person.email');
        });

        it('should pass if no indexes required', () => {
             const rule = advisor.recommend([]);
             expect(rule.name).toBe('index_check');
        });
    });

    describe('QueryRewriter', () => {
        const rewriter = new QueryRewriter();

        it('should add LIMIT to unbounded read queries', () => {
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
            expect(result.optimizedQuery).toContain('LIMIT 1000');
            expect(result.optimizations).toHaveLength(1);
        });

        it('should warn about cartesian products', () => {
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
            expect(result.optimizations[0].name).toBe('cartesian_product_warning');
        });
    });

    describe('QueryCostEstimator', () => {
        const estimator = new QueryCostEstimator();

        it('should estimate cost based on complexity', () => {
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
            expect(result.cost).toBeGreaterThan(100);
            expect(result.rows).toBeGreaterThan(1);
        });
    });

});
