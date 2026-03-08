"use strict";
// @ts-nocheck
/**
 * NL-to-Cypher Service - Minimum Lovable AI Copilot
 *
 * Converts natural language queries to Cypher with:
 * - LLM-powered translation
 * - Query preview and explanation
 * - Cost/complexity estimation
 * - Safety validation
 * - Audit trail
 *
 * Implements "Auditable by Design" from Wishbook requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLToCypherService = void 0;
exports.getNLToCypherService = getNLToCypherService;
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
const logger = logger_js_1.logger.child({ module: 'NLToCypherService' });
// Zod schemas for type safety
const NLQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(5),
    investigationId: zod_1.z.string().min(1),
    userId: zod_1.z.string().optional(),
    dryRun: zod_1.z.boolean().optional().default(true),
});
const CypherResultSchema = zod_1.z.object({
    cypher: zod_1.z.string(),
    explanation: zod_1.z.string(),
    estimatedRows: zod_1.z.number().int().min(0),
    estimatedCost: zod_1.z.number().min(0),
    complexity: zod_1.z.enum(['low', 'medium', 'high']),
    warnings: zod_1.z.array(zod_1.z.string()).optional(),
    allowed: zod_1.z.boolean(),
    blockReason: zod_1.z.string().optional(),
    auditId: zod_1.z.string().optional(),
});
class NLToCypherService {
    llmService;
    guardrails;
    neo4j;
    constructor(llmService, guardrails, neo4jDriver) {
        this.llmService = llmService;
        this.guardrails = guardrails;
        this.neo4j = neo4jDriver;
    }
    /**
     * Main method: Convert natural language to Cypher with preview
     */
    async translateQuery(input) {
        const validated = NLQuerySchema.parse(input);
        logger.info({
            investigationId: validated.investigationId,
            queryLength: validated.query.length,
            dryRun: validated.dryRun,
        }, 'NL-to-Cypher translation requested');
        // Step 1: Guardrail validation
        const guardrailCheck = await this.guardrails.validateInput({
            prompt: validated.query,
            userId: validated.userId,
            modelProvider: 'openai',
            modelName: 'gpt-4',
            privacyLevel: 'internal',
        });
        if (!guardrailCheck.allowed) {
            logger.warn({
                investigationId: validated.investigationId,
                blockReason: guardrailCheck.reason,
            }, 'Query blocked by guardrails');
            return {
                cypher: '',
                explanation: '',
                estimatedRows: 0,
                estimatedCost: 0,
                complexity: 'low',
                warnings: guardrailCheck.warnings,
                allowed: false,
                blockReason: guardrailCheck.reason,
                auditId: guardrailCheck.audit_id,
            };
        }
        // Step 2: Get investigation schema context
        const schemaContext = await this.getInvestigationSchema(validated.investigationId);
        // Step 3: Generate Cypher using LLM
        const cypherGeneration = await this.generateCypherWithLLM(validated.query, schemaContext, validated.investigationId);
        // Step 4: Validate and estimate cost
        const validation = await this.validateAndEstimate(cypherGeneration.cypher, validated.investigationId);
        if (!validation.valid) {
            logger.error({
                investigationId: validated.investigationId,
                errors: validation.errors,
            }, 'Generated Cypher is invalid');
            return {
                cypher: cypherGeneration.cypher,
                explanation: cypherGeneration.explanation,
                estimatedRows: 0,
                estimatedCost: 0,
                complexity: 'low',
                warnings: [`Invalid Cypher generated: ${validation.errors.join(', ')}`],
                allowed: false,
                blockReason: 'Invalid Cypher query generated',
                auditId: guardrailCheck.audit_id,
            };
        }
        // Step 5: Check complexity thresholds
        if (validation.complexity === 'high' && validation.estimatedRows > 10000) {
            logger.warn({
                investigationId: validated.investigationId,
                estimatedRows: validation.estimatedRows,
                complexity: validation.complexity,
            }, 'Query exceeds complexity threshold');
            return {
                cypher: cypherGeneration.cypher,
                explanation: cypherGeneration.explanation,
                estimatedRows: validation.estimatedRows,
                estimatedCost: validation.estimatedCost,
                complexity: validation.complexity,
                warnings: validation.warnings,
                allowed: false,
                blockReason: `Query too complex: estimated ${validation.estimatedRows} rows. Please narrow your search criteria.`,
                auditId: guardrailCheck.audit_id,
            };
        }
        logger.info({
            investigationId: validated.investigationId,
            estimatedRows: validation.estimatedRows,
            complexity: validation.complexity,
            auditId: guardrailCheck.audit_id,
        }, 'NL-to-Cypher translation successful');
        return {
            cypher: cypherGeneration.cypher,
            explanation: cypherGeneration.explanation,
            estimatedRows: validation.estimatedRows,
            estimatedCost: validation.estimatedCost,
            complexity: validation.complexity,
            warnings: validation.warnings,
            allowed: true,
            auditId: guardrailCheck.audit_id,
        };
    }
    /**
     * Execute validated Cypher query (after preview approval)
     */
    async executeQuery(cypher, investigationId, auditId) {
        logger.info({
            investigationId,
            auditId,
            cypherLength: cypher.length,
        }, 'Executing approved Cypher query');
        const session = this.neo4j.session();
        try {
            const result = await session.run(cypher, { investigationId });
            const records = result.records.map((record) => {
                const obj = {};
                record.keys.forEach((key) => {
                    obj[key] = record.get(key);
                });
                return obj;
            });
            logger.info({
                investigationId,
                auditId,
                recordCount: records.length,
            }, 'Query executed successfully');
            return {
                records,
                summary: {
                    recordCount: records.length,
                    executionTime: result.summary.resultAvailableAfter.toNumber(),
                },
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get investigation schema for context
     */
    async getInvestigationSchema(investigationId) {
        const session = this.neo4j.session();
        try {
            // Get entity types and relationship types in investigation
            const entityTypesQuery = `
        MATCH (e:Entity {investigationId: $investigationId})
        WITH DISTINCT e.type AS entityType, COUNT(*) AS count
        RETURN entityType, count
        ORDER BY count DESC
        LIMIT 20
      `;
            const relTypesQuery = `
        MATCH (:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]->(:Entity)
        WITH DISTINCT r.type AS relType, COUNT(*) AS count
        RETURN relType, count
        ORDER BY count DESC
        LIMIT 20
      `;
            const [entityResult, relResult] = await Promise.all([
                session.run(entityTypesQuery, { investigationId }),
                session.run(relTypesQuery, { investigationId }),
            ]);
            const entityTypes = entityResult.records.map((r) => `${r.get('entityType')} (${r.get('count')} entities)`);
            const relTypes = relResult.records.map((r) => `${r.get('relType')} (${r.get('count')} relationships)`);
            return `
Investigation Schema:

Entity Types:
${entityTypes.join('\n')}

Relationship Types:
${relTypes.join('\n')}
      `.trim();
        }
        finally {
            await session.close();
        }
    }
    /**
     * Generate Cypher using LLM with schema-aware prompting
     */
    async generateCypherWithLLM(naturalLanguage, schemaContext, investigationId) {
        const prompt = `You are a **Neo4j Expert and Intelligence Analysis Copilot**.
Your goal is to translate natural language questions into efficient, read-only Cypher queries.
Treat the Neo4j graph as the source of truth for: entity identity, relationships, temporal ordering, and network structure.

${schemaContext}

## NEO4J PERFORMANCE GUIDANCE
- Use batch patterns where applicable.
- Avoid variable-length paths with unbounded depth (e.g. [*]). Always specify a max depth (e.g. [*..3]).
- Always include a LIMIT clause (default 100) to prevent blowing up result sizes.
- For write operations (if any), group nodes/relationships by type and write each group with its own statement.
- Avoid over-using MERGE with large property maps.

## QUERY RULES
1. All Entity nodes have an 'investigationId' property that MUST be filtered
2. Use MATCH (e:Entity {investigationId: $investigationId}) for entity queries
3. Relationships between entities use the generic RELATIONSHIP type with a 'type' property
4. Always include LIMIT clauses (max 1000 results)
5. Return entity properties: id, type, label, confidence
6. Avoid expensive operations like collecting all paths
7. Use OPTIONAL MATCH for optional patterns
8. Filter by entity.confidence > 0.5 for quality results

USER QUERY: ${naturalLanguage}

Respond with JSON containing:
{
  "cypher": "the Cypher query",
  "explanation": "plain English explanation of what the query does"
}`;
        const response = await this.llmService.complete({
            prompt,
            maxTokens: 500,
            temperature: 0,
            responseFormat: 'json',
        });
        try {
            const parsed = JSON.parse(response);
            return {
                cypher: parsed.cypher,
                explanation: parsed.explanation,
            };
        }
        catch (error) {
            logger.error({ error, response }, 'Failed to parse LLM response');
            throw new Error('Failed to generate valid Cypher query');
        }
    }
    /**
     * Validate Cypher and estimate execution cost
     */
    async validateAndEstimate(cypher, investigationId) {
        const errors = [];
        const warnings = [];
        // Basic syntax validation
        if (!cypher.trim().toUpperCase().startsWith('MATCH')) {
            errors.push('Query must start with MATCH');
        }
        if (!cypher.includes('investigationId')) {
            warnings.push('Query does not filter by investigationId');
        }
        if (!cypher.toUpperCase().includes('LIMIT')) {
            warnings.push('Query has no LIMIT clause');
        }
        // Dangerous patterns
        const dangerousPatterns = [
            { pattern: /DELETE/i, message: 'DELETE operations not allowed' },
            { pattern: /CREATE/i, message: 'CREATE operations not allowed in queries' },
            { pattern: /MERGE/i, message: 'MERGE operations not allowed in queries' },
            { pattern: /SET/i, message: 'SET operations not allowed in queries' },
            { pattern: /REMOVE/i, message: 'REMOVE operations not allowed in queries' },
            { pattern: /DROP/i, message: 'DROP operations not allowed' },
        ];
        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(cypher)) {
                errors.push(message);
            }
        }
        // Estimate cost based on query patterns
        let estimatedRows = 100; // Default estimate
        let complexity = 'low';
        // Extract LIMIT value if present
        const limitMatch = cypher.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            estimatedRows = Math.min(parseInt(limitMatch[1], 10), estimatedRows);
        }
        else {
            estimatedRows = 1000; // No limit = high estimate
            complexity = 'high';
        }
        // Check for complexity indicators
        if (cypher.match(/\*\d{2,}/)) {
            complexity = 'high';
            warnings.push('Variable-length path query may be expensive');
        }
        if (cypher.split('MATCH').length > 3) {
            complexity = 'medium';
            warnings.push('Multiple MATCH clauses may increase query time');
        }
        // Try to explain the query to Neo4j for a real estimate
        try {
            const session = this.neo4j.session();
            try {
                const explainResult = await session.run(`EXPLAIN ${cypher}`, {
                    investigationId,
                });
                // Parse explain plan for more accurate estimates
                if (explainResult.summary.plan) {
                    const plan = explainResult.summary.plan;
                    if (plan.arguments?.EstimatedRows) {
                        estimatedRows = Math.round(plan.arguments.EstimatedRows);
                    }
                }
            }
            finally {
                await session.close();
            }
        }
        catch (error) {
            logger.warn({ error, cypher }, 'Failed to EXPLAIN query');
            errors.push('Query syntax invalid or cannot be explained');
        }
        const estimatedCost = this.calculateCost(estimatedRows, complexity);
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            estimatedRows,
            estimatedCost,
            complexity,
        };
    }
    /**
     * Calculate cost units based on rows and complexity
     */
    calculateCost(rows, complexity) {
        const basePerRow = 0.01;
        const multipliers = { low: 1, medium: 2, high: 4 };
        const multiplier = multipliers[complexity] || 1;
        return Math.round(rows * basePerRow * multiplier * 100) / 100;
    }
}
exports.NLToCypherService = NLToCypherService;
// Singleton instance
let nlToCypherService = null;
function getNLToCypherService(llmService, guardrails, neo4jDriver) {
    if (!nlToCypherService) {
        nlToCypherService = new NLToCypherService(llmService, guardrails, neo4jDriver);
    }
    return nlToCypherService;
}
