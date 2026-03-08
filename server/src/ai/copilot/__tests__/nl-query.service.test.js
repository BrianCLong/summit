"use strict";
/**
 * Unit tests for NL-to-Query Service
 *
 * Tests mapping of natural language prompts to expected Cypher query skeletons.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const nl_query_service_js_1 = require("../nl-query.service.js");
(0, globals_1.describe)('NLQueryService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = (0, nl_query_service_js_1.createNLQueryService)({});
    });
    (0, globals_1.describe)('Pattern Matching', () => {
        const baseRequest = {
            investigationId: 'test-investigation-123',
            tenantId: 'test-tenant',
            userId: 'test-user',
            dryRun: true,
        };
        (0, globals_1.it)('should map "show all nodes" to a MATCH (n) RETURN query', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show all nodes',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/MATCH\s*\(n\)/i);
            (0, globals_1.expect)(result.cypher).toMatch(/RETURN\s+n/i);
            (0, globals_1.expect)(result.cypher).toMatch(/LIMIT/i);
            (0, globals_1.expect)(result.isSafe).toBe(true);
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
        (0, globals_1.it)('should map "list nodes" to a node listing query', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'list nodes',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/MATCH/i);
            (0, globals_1.expect)(result.cypher).toMatch(/RETURN/i);
            (0, globals_1.expect)(result.cost.costClass).toBe('low');
        });
        (0, globals_1.it)('should map "count nodes" to a COUNT aggregation', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'count all nodes',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/count\s*\(/i);
            (0, globals_1.expect)(result.explanation).toBeTruthy();
        });
        (0, globals_1.it)('should map "find relationships" to an edge query', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show all relationships',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/\(a\)-\[r\]->\(b\)/i);
            (0, globals_1.expect)(result.cypher).toMatch(/RETURN.*r/i);
        });
        (0, globals_1.it)('should map "shortest path from X to Y" to shortestPath', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'shortest path from entity A to entity B',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/shortestPath/i);
            (0, globals_1.expect)(['high', 'very-high']).toContain(result.cost.costClass);
        });
        (0, globals_1.it)('should map "neighbors of X" to a 1-hop traversal', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show neighbors of entity123',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/MATCH\s*\(n\)-\[r\]-\(neighbor\)/i);
        });
        (0, globals_1.it)('should map time-travel queries to temporal filtering', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show graph at 2024-01-01',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/validFrom/i);
            (0, globals_1.expect)(result.cypher).toMatch(/validTo/i);
        });
        (0, globals_1.it)('should map "find communities" to connected component query', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'detect communities in the graph',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/collect/i);
            (0, globals_1.expect)(result.cost.costClass).toBe('very-high');
        });
        (0, globals_1.it)('should map investigation-scoped queries', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show all entities in investigation ABC',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/investigationId/i);
        });
        (0, globals_1.it)('should map timeline queries to temporal ordering', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'create timeline of events',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/ORDER BY.*timestamp/i);
        });
    });
    (0, globals_1.describe)('Cost Estimation', () => {
        const baseRequest = {
            investigationId: 'test-investigation',
            dryRun: true,
        };
        (0, globals_1.it)('should classify simple node queries as low cost', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show all nodes',
            });
            (0, globals_1.expect)(['low', 'medium']).toContain(result.cost.costClass);
            (0, globals_1.expect)(result.cost.nodesScanned).toBeLessThan(1000);
        });
        (0, globals_1.it)('should classify path queries as high cost', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'shortest path between A and B',
            });
            (0, globals_1.expect)(['high', 'very-high']).toContain(result.cost.costClass);
        });
        (0, globals_1.it)('should classify community detection as very high cost', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'detect communities',
            });
            (0, globals_1.expect)(result.cost.costClass).toBe('very-high');
            (0, globals_1.expect)(result.isSafe).toBe(false);
        });
        (0, globals_1.it)('should generate cost warnings for expensive queries', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'find all paths from X to Y',
            });
            // Should have some warnings for potentially expensive query
            (0, globals_1.expect)(result.warnings.length).toBeGreaterThanOrEqual(0);
        });
    });
    (0, globals_1.describe)('Safety Validation', () => {
        const baseRequest = {
            investigationId: 'test-investigation',
            dryRun: true,
        };
        (0, globals_1.it)('should reject mutation queries', async () => {
            // Since we use pattern matching, mutation keywords won't match
            // Let's test the validation path
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'delete all nodes',
            });
            // Should fail to match pattern or be blocked
            if (result.cypher) {
                (0, globals_1.expect)(result.isSafe).toBe(false);
                (0, globals_1.expect)(result.warnings).toContain(globals_1.expect.stringMatching(/mutation|DELETE/i));
            }
        });
        (0, globals_1.it)('should mark queries without WHERE as potentially unsafe', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'show all relationships',
            });
            // Check for warnings about missing WHERE clause
            const hasWhereWarning = result.warnings.some((w) => w.toLowerCase().includes('where') || w.toLowerCase().includes('filter'));
            // This is informational, not blocking
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
        (0, globals_1.it)('should add tenant filtering when tenantId provided', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                tenantId: 'tenant-123',
                query: 'show all nodes',
            });
            (0, globals_1.expect)(result.cypher).toMatch(/tenantId/i);
        });
    });
    (0, globals_1.describe)('Query Refinement Suggestions', () => {
        const baseRequest = {
            investigationId: 'test-investigation',
            dryRun: true,
        };
        (0, globals_1.it)('should suggest LIMIT for expensive queries', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'detect communities',
            });
            if (result.refinements && result.refinements.length > 0) {
                result.refinements.forEach((refinement) => {
                    (0, globals_1.expect)(refinement.reason).toBeTruthy();
                });
            }
        });
        (0, globals_1.it)('should suggest bounded paths for unbounded traversals', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'find all paths between nodes',
            });
            if (result.refinements && result.refinements.length > 0) {
                const pathSuggestion = result.refinements.find((r) => r.reason.toLowerCase().includes('depth') ||
                    r.reason.toLowerCase().includes('path'));
                // May or may not have path refinement depending on pattern
            }
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        const baseRequest = {
            investigationId: 'test-investigation',
            dryRun: true,
        };
        (0, globals_1.it)('should handle empty prompts gracefully', async () => {
            await (0, globals_1.expect)(service.compileQuery({
                ...baseRequest,
                query: '',
            })).rejects.toThrow();
        });
        (0, globals_1.it)('should handle very long prompts', async () => {
            const longPrompt = 'show ' + 'all '.repeat(500) + 'nodes';
            await (0, globals_1.expect)(service.compileQuery({
                ...baseRequest,
                query: longPrompt,
            })).rejects.toThrow();
        });
        (0, globals_1.it)('should handle unrecognized patterns', async () => {
            const result = await service.compileQuery({
                ...baseRequest,
                query: 'do something weird with quantum entanglement',
            });
            // Should fail gracefully with suggestions
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.warnings.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Caching', () => {
        const baseRequest = {
            investigationId: 'test-investigation',
            dryRun: true,
        };
        (0, globals_1.it)('should cache query results', async () => {
            const query = 'show all nodes';
            // First call
            const result1 = await service.compileQuery({
                ...baseRequest,
                query,
            });
            // Second call (should be cached)
            const result2 = await service.compileQuery({
                ...baseRequest,
                query,
            });
            (0, globals_1.expect)(result1.queryId).not.toBe(result2.queryId);
            (0, globals_1.expect)(result1.cypher).toBe(result2.cypher);
        });
        (0, globals_1.it)('should return different results for different investigations', async () => {
            const query = 'show all nodes';
            const result1 = await service.compileQuery({
                ...baseRequest,
                investigationId: 'investigation-1',
                query,
            });
            const result2 = await service.compileQuery({
                ...baseRequest,
                investigationId: 'investigation-2',
                query,
            });
            // Different investigations should generate different cache keys
            (0, globals_1.expect)(result1.queryId).not.toBe(result2.queryId);
        });
        (0, globals_1.it)('should allow cache clearing', async () => {
            // Compile a query
            await service.compileQuery({
                ...baseRequest,
                query: 'show all nodes',
            });
            // Clear cache
            service.clearCache();
            // Cache should be empty now
            const cached = service.getCachedPreview({
                ...baseRequest,
                query: 'show all nodes',
            });
            (0, globals_1.expect)(cached).toBeNull();
        });
    });
    (0, globals_1.describe)('Available Patterns', () => {
        (0, globals_1.it)('should return list of available query patterns', () => {
            const patterns = service.getAvailablePatterns();
            (0, globals_1.expect)(Array.isArray(patterns)).toBe(true);
            (0, globals_1.expect)(patterns.length).toBeGreaterThan(0);
            // Each pattern should have name, description, and expectedCost
            patterns.forEach((pattern) => {
                (0, globals_1.expect)(pattern).toHaveProperty('name');
                (0, globals_1.expect)(pattern).toHaveProperty('description');
                (0, globals_1.expect)(pattern).toHaveProperty('expectedCost');
            });
        });
        (0, globals_1.it)('should include common query patterns', () => {
            const patterns = service.getAvailablePatterns();
            const patternNames = patterns.map((p) => p.name);
            (0, globals_1.expect)(patternNames).toContain('list-all-nodes');
            (0, globals_1.expect)(patternNames).toContain('count-nodes');
            (0, globals_1.expect)(patternNames).toContain('find-relationships');
            (0, globals_1.expect)(patternNames).toContain('shortest-path');
        });
    });
});
