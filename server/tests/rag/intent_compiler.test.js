"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const intent_compiler_js_1 = require("../../src/rag/intent_compiler.js");
const uuid_1 = require("uuid");
(0, globals_1.describe)('IntentCompiler', () => {
    const defaultBudget = new intent_compiler_js_1.EvidenceBudget({ maxNodes: 50, maxEdges: 100, maxPaths: 10 });
    const compiler = new intent_compiler_js_1.IntentCompiler(defaultBudget);
    const validSpec = {
        query_id: (0, uuid_1.v4)(),
        original_query: "Who knows Malfoy?",
        intent_type: "neighbor_expansion",
        target_entities: [{ id: "p1", type: "Person", confidence: 1.0 }],
        constraints: { max_hops: 2 },
        evidence_budget: { max_nodes: 10, max_edges: 20, max_paths: 5 },
        ordering: { by: "centrality", direction: "DESC" }
    };
    (0, globals_1.it)('validates budget correctly', () => {
        (0, globals_1.expect)(compiler.validateBudget(validSpec)).toBe(true);
        const invalidSpec = { ...validSpec, evidence_budget: { ...validSpec.evidence_budget, max_nodes: 1000 } };
        (0, globals_1.expect)(compiler.validateBudget(invalidSpec)).toBe(false);
    });
    (0, globals_1.it)('generates deterministic cypher with params', () => {
        const result = compiler.generateCypher(validSpec);
        const cypher = result.query;
        const params = result.params;
        (0, globals_1.expect)(cypher).toContain("MATCH (start) WHERE start.id IN $startIds");
        (0, globals_1.expect)(params.startIds).toEqual(['p1']);
        (0, globals_1.expect)(cypher).toContain("-[r*1..2]->");
        (0, globals_1.expect)(cypher).toContain("ORDER BY coalesce(end.centrality, 0) DESC");
        (0, globals_1.expect)(cypher).toContain("LIMIT 5");
    });
    (0, globals_1.it)('generates cypher with relationship constraints', () => {
        const spec = {
            ...validSpec,
            constraints: {
                ...validSpec.constraints,
                relationship_types: ["KNOWS", "WORKS_WITH"]
            }
        };
        const result = compiler.generateCypher(spec);
        (0, globals_1.expect)(result.query).toContain("-[r:`KNOWS`|`WORKS_WITH`*1..2]->");
    });
    (0, globals_1.it)('generates cypher with min confidence param', () => {
        const spec = {
            ...validSpec,
            constraints: {
                ...validSpec.constraints,
                min_confidence: 0.8
            }
        };
        const result = compiler.generateCypher(spec);
        (0, globals_1.expect)(result.query).toContain("WHERE all(x in relationships(path) WHERE x.confidence >= $minConfidence)");
        (0, globals_1.expect)(result.params.minConfidence).toBe(0.8);
    });
});
