"use strict";
/**
 * Cypher Generator Service
 * Translates natural language questions into safe, deterministic Cypher queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CypherGenerator = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class CypherGenerator {
    llm;
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * Generate Cypher from a natural language question
     */
    async generate(question, schema) {
        // 1. Try Template Matching (Deterministic)
        const templateResult = this.matchTemplate(question);
        if (templateResult) {
            logger_js_1.default.info({
                message: 'Cypher template matched',
                templateId: templateResult.templateId,
            });
            return {
                cypher: templateResult.cypher,
                params: templateResult.params,
                mode: 'template',
                templateId: templateResult.templateId,
                confidence: 1.0,
            };
        }
        // 2. Fallback to LLM Generation (Probabilistic)
        try {
            const prompt = this.buildPrompt(question, schema);
            const result = await this.llm.generateCypher(prompt);
            // 3. Validate Generated Cypher
            const validation = this.validateCypher(result.cypher);
            if (!validation.valid) {
                logger_js_1.default.warn({
                    message: 'Generated Cypher failed validation',
                    reason: validation.reason,
                    cypher: result.cypher,
                });
                return null;
            }
            return {
                cypher: result.cypher,
                // LLM generation typically doesn't produce params unless we enforce a format.
                // For now we assume no params for LLM or simple literal injection (guarded by read-only check).
                // A better approach would be to ask LLM to return JSON with query and params.
                mode: 'llm',
                confidence: 0.8,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Cypher generation failed',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Match question against known templates
     */
    matchTemplate(question) {
        const normalized = question.toLowerCase().trim();
        // Template 1: "Find connection between X and Y"
        const connectionMatch = normalized.match(/between\s+["']?([^"']+)["']?\s+and\s+["']?([^"']+)["']?/i);
        if (connectionMatch) {
            const [, source, target] = connectionMatch;
            return {
                templateId: 'shortest_path',
                cypher: `
          MATCH (c:Case {id: $caseId})
          MATCH (c)-[*0..4]-(start)
          WHERE (start.name =~ '(?i).*' + $source + '.*' OR start.label =~ '(?i).*' + $source + '.*')
          WITH c, collect(start) as startNodes
          MATCH (c)-[*0..4]-(end)
          WHERE (end.name =~ '(?i).*' + $target + '.*' OR end.label =~ '(?i).*' + $target + '.*')
          WITH startNodes, collect(end) as endNodes
          UNWIND startNodes as start
          UNWIND endNodes as end
          MATCH path = shortestPath((start)-[*..4]-(end))
          RETURN path
          LIMIT 5
        `,
                params: { source, target }
            };
        }
        // Template 2: "What is the timeline of X"
        const timelineMatch = normalized.match(/timeline of\s+["']?([^"']+)["']?/i);
        if (timelineMatch) {
            const [, entity] = timelineMatch;
            return {
                templateId: 'entity_timeline',
                cypher: `
          MATCH (c:Case {id: $caseId})
          MATCH (c)-[*0..4]-(n)
          WHERE (n.name =~ '(?i).*' + $entity + '.*' OR n.label =~ '(?i).*' + $entity + '.*')
          MATCH (n)-[r]->(m)
          WHERE r.date IS NOT NULL
          RETURN n, r, m
          ORDER BY r.date DESC
          LIMIT 20
        `,
                params: { entity }
            };
        }
        return null;
    }
    /**
     * Build prompt for LLM
     */
    buildPrompt(question, schema) {
        return `
You are a Neo4j Cypher expert. Convert the following question into a Cypher query.

## CRITICAL SECURITY RULES
1. The query MUST start with: MATCH (c:Case {id: $caseId})
2. All subsequent MATCH clauses must be connected to node 'c' (the Case).
   Example: MATCH (c)-[*..3]-(n:Person) WHERE ...
3. Do NOT use CALL, CREATE, MERGE, DELETE, SET, REMOVE, DROP.
4. ONLY return the Cypher query text. No markdown.

## SCHEMA
Nodes: ${schema.nodeTypes.join(', ')}
Edges: ${schema.edgeTypes.join(', ')}
Summary: ${schema.schemaSummary}

## QUESTION
"${question}"
    `.trim();
    }
    /**
     * Validate Cypher for safety
     */
    validateCypher(cypher) {
        const forbiddenKeywords = [
            'CREATE', 'MERGE', 'DELETE', 'SET', 'REMOVE', 'DROP',
            'CALL', 'LOAD CSV', 'Show', 'GRANT', 'REVOKE'
        ];
        const upperCypher = cypher.toUpperCase();
        for (const keyword of forbiddenKeywords) {
            if (upperCypher.includes(keyword)) {
                return { valid: false, reason: `Forbidden keyword: ${keyword}` };
            }
        }
        // Check for scoping
        if (!upperCypher.includes('$CASEID')) {
            // This might fail if the user writes $caseId mixed case but Upper check handles keywords.
            // Let's use case-insensitive check for parameter
            if (!/(\$caseId)/i.test(cypher)) {
                return { valid: false, reason: 'Missing $caseId scope' };
            }
        }
        return { valid: true };
    }
}
exports.CypherGenerator = CypherGenerator;
