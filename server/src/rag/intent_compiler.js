"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentCompiler = exports.EvidenceBudget = exports.IntentSpecSchema = void 0;
const zod_1 = require("zod");
// Define Zod schema matching the JSON schema for runtime validation
exports.IntentSpecSchema = zod_1.z.object({
    query_id: zod_1.z.string().uuid(),
    original_query: zod_1.z.string(),
    intent_type: zod_1.z.enum(["traversal", "aggregation", "path_finding", "neighbor_expansion"]),
    target_entities: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    })),
    constraints: zod_1.z.object({
        max_hops: zod_1.z.number().int().min(1).max(5).optional(),
        min_confidence: zod_1.z.number().min(0).max(1).optional(),
        relationship_types: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    evidence_budget: zod_1.z.object({
        max_nodes: zod_1.z.number().int().default(50),
        max_edges: zod_1.z.number().int().default(100),
        max_paths: zod_1.z.number().int().default(10)
    }),
    ordering: zod_1.z.object({
        by: zod_1.z.enum(["centrality", "recency", "confidence"]),
        direction: zod_1.z.enum(["ASC", "DESC"])
    })
});
class EvidenceBudget {
    config;
    constructor(config) {
        this.config = config;
    }
    validate(spec) {
        if (spec.evidence_budget.max_nodes > this.config.maxNodes) {
            return { valid: false, reason: `Requested nodes (${spec.evidence_budget.max_nodes}) exceeds limit (${this.config.maxNodes})` };
        }
        if (spec.evidence_budget.max_edges > this.config.maxEdges) {
            return { valid: false, reason: `Requested edges (${spec.evidence_budget.max_edges}) exceeds limit (${this.config.maxEdges})` };
        }
        if (spec.evidence_budget.max_paths > this.config.maxPaths) {
            return { valid: false, reason: `Requested paths (${spec.evidence_budget.max_paths}) exceeds limit (${this.config.maxPaths})` };
        }
        return { valid: true };
    }
}
exports.EvidenceBudget = EvidenceBudget;
class IntentCompiler {
    budget;
    constructor(budget) {
        this.budget = budget;
    }
    /**
     * Mocks the compilation of a natural language query into an IntentSpec.
     * In a real implementation, this would invoke an LLM.
     */
    async compile(query) {
        // Stub implementation
        throw new Error("LLM Integration not available in this context.");
    }
    validateBudget(spec) {
        const result = this.budget.validate(spec);
        return result.valid;
    }
    generateCypher(spec) {
        const { target_entities, constraints, evidence_budget, ordering } = spec;
        // 1. Where Clause (Entity Binding)
        const entityIds = target_entities.map(e => e.id);
        const params = {
            startIds: entityIds
        };
        // 2. Traversal
        const hops = constraints?.max_hops || 1;
        const relTypes = constraints?.relationship_types
            ? `:${constraints.relationship_types.map(t => `\`${t}\``).join('|')}`
            : '';
        // 3. Construct Query
        // Pattern: Match start nodes -> traverse -> end nodes
        let cypher = `MATCH (start) WHERE start.id IN $startIds`;
        cypher += `\nMATCH path = (start)-[r${relTypes}*1..${hops}]->(end)`;
        if (constraints?.min_confidence) {
            cypher += `\nWHERE all(x in relationships(path) WHERE x.confidence >= $minConfidence)`;
            params.minConfidence = constraints.min_confidence;
        }
        // 4. Return
        cypher += `\nRETURN path`;
        // 5. Order By (Deterministic)
        // Coalesce is important for null safety in sorting
        cypher += `\nORDER BY coalesce(end.${ordering.by}, 0) ${ordering.direction}`;
        // 6. Limit (Budget)
        cypher += `\nLIMIT ${evidence_budget.max_paths}`;
        return { query: cypher, params };
    }
}
exports.IntentCompiler = IntentCompiler;
