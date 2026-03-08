"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const execution_js_1 = require("../dsl/execution.js");
(0, globals_1.describe)('DSL Execution', () => {
    (0, globals_1.it)('should parse valid JSON DSL', () => {
        const json = '{"start": {"type": "Actor"}}';
        const dsl = (0, execution_js_1.parseDSL)(json);
        (0, globals_1.expect)(dsl.start.type).toBe('Actor');
    });
    (0, globals_1.it)('should build valid Cypher for simple start query', () => {
        const dsl = { start: { type: 'Actor' } };
        const { cypher, params } = (0, execution_js_1.buildCypherFromDSL)(dsl, 'tenant-1');
        (0, globals_1.expect)(cypher).toContain('MATCH (n:GraphNode { tenantId: $tenantId })');
        (0, globals_1.expect)(cypher).toContain('WHERE n.entityType = $startType');
        (0, globals_1.expect)(params.tenantId).toBe('tenant-1');
        (0, globals_1.expect)(params.startType).toBe('Actor');
    });
    (0, globals_1.it)('should handle traversal', () => {
        const dsl = {
            start: { id: 'root' },
            traverse: [
                { edgeTypes: ['USES'], direction: 'out', depth: 2 }
            ]
        };
        const { cypher } = (0, execution_js_1.buildCypherFromDSL)(dsl, 'tenant-1');
        (0, globals_1.expect)(cypher).toContain('MATCH (n)-[:USES*1..2]->(m0)');
    });
});
