"use strict";
/**
 * Cypher Generator Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cypher_generator_js_1 = require("../utils/cypher-generator.js");
(0, globals_1.describe)('CypherGenerator', () => {
    const simpleMotif = {
        id: 'motif-simple',
        name: 'Simple Pattern',
        description: 'A simple two-node pattern',
        nodes: [
            { id: 'actor', type: 'THREAT_ACTOR', label: 'Actor' },
            { id: 'target', type: 'ASSET', label: 'Target' },
        ],
        edges: [
            {
                id: 'e1',
                sourceNodeId: 'actor',
                targetNodeId: 'target',
                type: 'TARGETS',
                direction: 'OUTGOING',
            },
        ],
        weight: 1,
    };
    const complexMotif = {
        id: 'motif-complex',
        name: 'Complex Pattern',
        description: 'A complex multi-node pattern with constraints',
        nodes: [
            {
                id: 'actor',
                type: 'THREAT_ACTOR',
                requiredProperties: ['name'],
                propertyFilters: [
                    { property: 'sophistication', operator: 'EQUALS', value: 'ADVANCED' },
                ],
            },
            {
                id: 'malware',
                type: 'MALWARE',
                propertyFilters: [{ property: 'family', operator: 'CONTAINS', value: 'Cobalt' }],
            },
            {
                id: 'c2',
                type: 'INFRASTRUCTURE',
                propertyFilters: [{ property: 'type', operator: 'EQUALS', value: 'C2' }],
            },
        ],
        edges: [
            {
                id: 'e1',
                sourceNodeId: 'actor',
                targetNodeId: 'malware',
                type: 'USES',
                direction: 'OUTGOING',
            },
            {
                id: 'e2',
                sourceNodeId: 'malware',
                targetNodeId: 'c2',
                type: 'COMMUNICATES_WITH',
                direction: 'OUTGOING',
            },
        ],
        timeConstraints: [
            {
                operator: 'WITHIN',
                referenceNodeId: 'malware',
                targetNodeId: 'c2',
                durationMs: 3600000,
            },
        ],
        aggregations: [
            {
                nodeId: 'c2',
                property: 'connections',
                function: 'COUNT',
                threshold: 10,
            },
        ],
        weight: 0.85,
    };
    (0, globals_1.describe)('generateCypherFromMotif', () => {
        (0, globals_1.it)('should generate a basic Cypher query', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(simpleMotif);
            (0, globals_1.expect)(result.query).toContain('MATCH');
            (0, globals_1.expect)(result.query).toContain('RETURN');
            (0, globals_1.expect)(result.query).toContain(':THREAT_ACTOR');
            (0, globals_1.expect)(result.query).toContain(':ASSET');
            (0, globals_1.expect)(result.query).toContain(':TARGETS');
        });
        (0, globals_1.it)('should include tenant isolation when tenantId is provided', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(simpleMotif, { tenantId: 'tenant-123' });
            (0, globals_1.expect)(result.query).toContain('tenantId = $tenantId');
            (0, globals_1.expect)(result.parameters.tenantId).toBe('tenant-123');
        });
        (0, globals_1.it)('should generate property filters', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(complexMotif);
            (0, globals_1.expect)(result.query).toContain('sophistication = $');
            (0, globals_1.expect)(result.query).toContain('CONTAINS');
        });
        (0, globals_1.it)('should generate required property checks', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(complexMotif);
            (0, globals_1.expect)(result.query).toContain('IS NOT NULL');
        });
        (0, globals_1.it)('should generate time constraints', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(complexMotif);
            (0, globals_1.expect)(result.query).toContain('duration');
        });
        (0, globals_1.it)('should respect maxResults option', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(simpleMotif, { maxResults: 50 });
            (0, globals_1.expect)(result.query).toContain('LIMIT 50');
        });
        (0, globals_1.it)('should generate count return format', () => {
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(simpleMotif, { returnFormat: 'count' });
            (0, globals_1.expect)(result.query).toContain('count(*)');
        });
        (0, globals_1.it)('should handle variable-length paths', () => {
            const motifWithVarPath = {
                ...simpleMotif,
                edges: [
                    {
                        id: 'e1',
                        sourceNodeId: 'actor',
                        targetNodeId: 'target',
                        type: 'RELATED_TO',
                        direction: 'OUTGOING',
                        minHops: 1,
                        maxHops: 3,
                    },
                ],
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(motifWithVarPath);
            (0, globals_1.expect)(result.query).toContain('*1..3');
        });
        (0, globals_1.it)('should handle incoming edge direction', () => {
            const motifWithIncoming = {
                ...simpleMotif,
                edges: [
                    {
                        id: 'e1',
                        sourceNodeId: 'actor',
                        targetNodeId: 'target',
                        type: 'TARGETS',
                        direction: 'INCOMING',
                    },
                ],
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(motifWithIncoming);
            (0, globals_1.expect)(result.query).toContain('<-[');
        });
        (0, globals_1.it)('should handle bidirectional edges', () => {
            const motifWithBoth = {
                ...simpleMotif,
                edges: [
                    {
                        id: 'e1',
                        sourceNodeId: 'actor',
                        targetNodeId: 'target',
                        type: 'RELATED_TO',
                        direction: 'BOTH',
                    },
                ],
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(motifWithBoth);
            (0, globals_1.expect)(result.query).toMatch(/-\[r0:RELATED_TO\]-/);
        });
    });
    (0, globals_1.describe)('generatePatternQueries', () => {
        (0, globals_1.it)('should generate multiple queries for complex patterns', () => {
            const queries = (0, cypher_generator_js_1.generatePatternQueries)(complexMotif);
            (0, globals_1.expect)(queries.length).toBeGreaterThan(1);
            // Should have main query, count query, and aggregation queries
        });
        (0, globals_1.it)('should include main and count queries', () => {
            const queries = (0, cypher_generator_js_1.generatePatternQueries)(simpleMotif);
            const mainQuery = queries.find((q) => q.query.includes('AS actor'));
            const countQuery = queries.find((q) => q.query.includes('count(*)'));
            (0, globals_1.expect)(mainQuery).toBeDefined();
            (0, globals_1.expect)(countQuery).toBeDefined();
        });
    });
    (0, globals_1.describe)('validateCypherQuery', () => {
        (0, globals_1.it)('should validate correct query', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('MATCH (n) RETURN n LIMIT 10');
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect missing MATCH clause', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('RETURN n LIMIT 10');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Query must contain at least one MATCH clause');
        });
        (0, globals_1.it)('should detect missing RETURN clause', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('MATCH (n)');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Query must contain a RETURN clause');
        });
        (0, globals_1.it)('should detect unbalanced parentheses', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('MATCH (n RETURN n');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Unbalanced parentheses in query');
        });
        (0, globals_1.it)('should detect unbalanced brackets', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('MATCH (n)-[r RETURN n');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Unbalanced brackets in query');
        });
        (0, globals_1.it)('should detect empty MATCH pattern', () => {
            const result = (0, cypher_generator_js_1.validateCypherQuery)('MATCH() RETURN 1');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Empty MATCH pattern');
        });
    });
    (0, globals_1.describe)('Edge cases', () => {
        (0, globals_1.it)('should handle motif with no edges', () => {
            const noEdgeMotif = {
                id: 'motif-no-edges',
                name: 'No Edge Pattern',
                description: 'Pattern with single node',
                nodes: [{ id: 'single', type: 'THREAT_ACTOR' }],
                edges: [],
                weight: 1,
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(noEdgeMotif);
            (0, globals_1.expect)(result.query).toContain('MATCH');
            (0, globals_1.expect)(result.query).toContain(':THREAT_ACTOR');
        });
        (0, globals_1.it)('should handle spatial constraints - same location', () => {
            const spatialMotif = {
                ...simpleMotif,
                spatialConstraints: {
                    sameLocation: ['actor', 'target'],
                },
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(spatialMotif);
            (0, globals_1.expect)(result.query).toContain('.location =');
        });
        (0, globals_1.it)('should handle sequence time constraints', () => {
            const sequenceMotif = {
                id: 'motif-sequence',
                name: 'Sequence Pattern',
                description: 'Pattern with sequence constraint',
                nodes: [
                    { id: 'first', type: 'INDICATOR' },
                    { id: 'second', type: 'INDICATOR' },
                    { id: 'third', type: 'INDICATOR' },
                ],
                edges: [],
                timeConstraints: [
                    {
                        operator: 'SEQUENCE',
                        sequence: ['first', 'second', 'third'],
                    },
                ],
                weight: 1,
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(sequenceMotif);
            (0, globals_1.expect)(result.query).toContain('.timestamp <');
        });
        (0, globals_1.it)('should handle property filters with IN operator', () => {
            const inFilterMotif = {
                ...simpleMotif,
                nodes: [
                    {
                        id: 'actor',
                        type: 'THREAT_ACTOR',
                        propertyFilters: [
                            { property: 'category', operator: 'IN', value: ['APT', 'Criminal'] },
                        ],
                    },
                    { id: 'target', type: 'ASSET' },
                ],
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(inFilterMotif);
            (0, globals_1.expect)(result.query).toContain('IN $');
        });
        (0, globals_1.it)('should handle NOT_IN operator', () => {
            const notInMotif = {
                ...simpleMotif,
                nodes: [
                    {
                        id: 'actor',
                        type: 'THREAT_ACTOR',
                        propertyFilters: [
                            { property: 'status', operator: 'NOT_IN', value: ['inactive', 'archived'] },
                        ],
                    },
                    { id: 'target', type: 'ASSET' },
                ],
            };
            const result = (0, cypher_generator_js_1.generateCypherFromMotif)(notInMotif);
            (0, globals_1.expect)(result.query).toContain('NOT');
            (0, globals_1.expect)(result.query).toContain('IN $');
        });
    });
});
