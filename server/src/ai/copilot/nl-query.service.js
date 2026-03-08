"use strict";
/**
 * Enhanced NL-to-Query Service
 *
 * Converts natural language questions into safe, previewable graph queries.
 * Features:
 * - Pattern-based matching for common queries
 * - LLM fallback for complex queries
 * - Query cost estimation and refinement suggestions
 * - Sandbox execution path with dry-run planner
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLQueryService = void 0;
exports.getNLQueryService = getNLQueryService;
exports.createNLQueryService = createNLQueryService;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const query_patterns_js_1 = require("../nl-graph-query/query-patterns.js");
const cost_estimator_js_1 = require("../nl-graph-query/cost-estimator.js");
const validator_js_1 = require("../nl-graph-query/validator.js");
const explainer_js_1 = require("../nl-graph-query/explainer.js");
const logger = pino_1.default({ name: 'nl-query-service' });
// Configuration from environment
const LLM_ENABLED = process.env.COPILOT_LLM_ENABLED !== 'false';
const MAX_COST_CLASS = process.env.COPILOT_MAX_COST_CLASS || 'high';
const MAX_ESTIMATED_TIME_MS = parseInt(process.env.COPILOT_MAX_ESTIMATED_TIME_MS || '10000', 10);
/**
 * Prompt templates for LLM-based query generation
 */
const CYPHER_GENERATION_PROMPT = `You are an expert Neo4j Cypher query generator for an intelligence analysis platform.

SCHEMA CONTEXT:
{{SCHEMA}}

USER QUESTION: {{QUESTION}}

RULES:
1. Generate ONLY read-only Cypher queries (MATCH, RETURN, WITH, WHERE, ORDER BY, LIMIT)
2. NEVER generate CREATE, MERGE, SET, DELETE, or REMOVE statements
3. Always include a LIMIT clause (max 500)
4. Use parameterized queries with $paramName syntax for user inputs
5. Include WHERE clauses to filter by investigationId when applicable
6. For path queries, limit depth to max 8 hops
7. Add tenant filtering if tenantId is in context

Generate a valid Cypher query and provide a brief explanation of what it does.

Response format (JSON):
{
  "cypher": "YOUR_CYPHER_QUERY_HERE",
  "explanation": "Brief explanation of what this query does"
}`;
/**
 * Enhanced NL-to-Query Service
 */
class NLQueryService {
    queryCache = new Map();
    llmAdapter;
    schemaFetcher;
    constructor(options) {
        this.llmAdapter = options?.llmAdapter;
        this.schemaFetcher = options?.schemaFetcher;
    }
    /**
     * Compile a natural language query into a Cypher query preview
     */
    async compileQuery(request) {
        const validated = types_js_1.NLQueryRequestSchema.parse(request);
        const queryId = (0, crypto_1.randomUUID)();
        const startTime = Date.now();
        logger.info({
            queryId,
            query: validated.query.substring(0, 100),
            investigationId: validated.investigationId,
            userId: validated.userId,
        }, 'Compiling NL query');
        try {
            // Get schema context
            const schemaContext = await this.getSchemaContext(validated.investigationId, validated.tenantId, validated.userId);
            // Try pattern matching first
            let cypher = null;
            let explanation = '';
            let usedLLM = false;
            const patternResult = (0, query_patterns_js_1.generateFromPattern)(validated.query, schemaContext);
            if (patternResult) {
                cypher = patternResult.cypher;
                explanation = (0, explainer_js_1.summarizeQuery)(cypher);
                logger.debug({ queryId, pattern: patternResult.patternName }, 'Generated from pattern');
            }
            else if (LLM_ENABLED && this.llmAdapter) {
                // Fallback to LLM
                const llmResult = await this.generateWithLLM(validated.query, schemaContext, validated.temperature);
                if (llmResult) {
                    cypher = llmResult.cypher;
                    explanation = llmResult.explanation;
                    usedLLM = true;
                    logger.debug({ queryId, usedLLM }, 'Generated with LLM fallback');
                }
            }
            if (!cypher) {
                // Could not generate query
                return this.createFailedPreview(queryId, validated.query, 'Could not generate Cypher query from prompt', this.getSuggestions(validated.query));
            }
            // Validate the generated Cypher
            const validation = (0, validator_js_1.validateCypher)(cypher);
            if (!validation.isValid) {
                logger.warn({ queryId, syntaxErrors: validation.syntaxErrors }, 'Generated invalid Cypher');
                return this.createFailedPreview(queryId, validated.query, 'Generated query contains errors', validation.syntaxErrors);
            }
            // Estimate cost
            const cost = (0, cost_estimator_js_1.estimateQueryCost)(cypher);
            // Check if query is safe to execute
            const isSafe = (0, cost_estimator_js_1.isSafeToExecute)(cost) &&
                (0, validator_js_1.isReadOnlyQuery)(cypher) &&
                this.isWithinBudget(cost);
            // Generate refinement suggestions if over budget
            const refinements = isSafe
                ? []
                : this.generateRefinements(validated.query, cypher, cost);
            // Extract parameters
            const requiredParams = (0, validator_js_1.extractRequiredParameters)(cypher);
            const parameters = {};
            // Bind known parameters
            for (const param of requiredParams) {
                if (param === 'investigationId') {
                    parameters[param] = validated.investigationId;
                }
                else if (param === 'tenantId' && validated.tenantId) {
                    parameters[param] = validated.tenantId;
                }
                else if (param === 'userId' && validated.userId) {
                    parameters[param] = validated.userId;
                }
                // Other parameters need to be provided by the user
            }
            // Generate warnings
            const warnings = [
                ...validation.warnings,
                ...(0, cost_estimator_js_1.generateCostWarnings)(cost),
            ];
            if (usedLLM) {
                warnings.push('Query was generated using AI - review carefully before execution');
            }
            if (!(0, validator_js_1.isReadOnlyQuery)(cypher)) {
                warnings.push('Query contains mutation operations - execution blocked');
            }
            const preview = {
                queryId,
                cypher,
                explanation,
                cost,
                isSafe,
                parameters,
                warnings,
                refinements: refinements.length > 0 ? refinements : undefined,
                allowed: isSafe,
                blockReason: isSafe
                    ? undefined
                    : this.getBlockReason(cost, (0, validator_js_1.isReadOnlyQuery)(cypher)),
            };
            // Cache the preview
            this.cachePreview(validated, preview);
            const compilationTime = Date.now() - startTime;
            logger.info({
                queryId,
                compilationTimeMs: compilationTime,
                costClass: cost.costClass,
                isSafe,
                usedLLM,
            }, 'Query compilation completed');
            return preview;
        }
        catch (error) {
            logger.error({
                queryId,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, 'Query compilation failed');
            return this.createFailedPreview(queryId, validated.query, 'An error occurred during compilation', ['Please try again', 'Simplify your question']);
        }
    }
    /**
     * Generate Cypher using LLM adapter
     */
    async generateWithLLM(prompt, schemaContext, temperature) {
        if (!this.llmAdapter) {
            return null;
        }
        try {
            const result = await this.llmAdapter.generateCypher({
                prompt,
                schemaContext,
                maxTokens: 500,
                temperature: temperature ?? 0,
            });
            // Validate the LLM output
            if (!result.cypher || result.cypher.trim().length === 0) {
                return null;
            }
            return result;
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'LLM generation failed');
            return null;
        }
    }
    /**
     * Get schema context for an investigation
     */
    async getSchemaContext(investigationId, tenantId, userId) {
        if (this.schemaFetcher) {
            const context = await this.schemaFetcher.getSchemaContext(investigationId);
            return {
                ...context,
                tenantId,
                userId,
                investigationId,
            };
        }
        // Default schema context
        return {
            nodeLabels: [
                'Entity',
                'Person',
                'Organization',
                'Location',
                'Event',
                'Document',
            ],
            relationshipTypes: [
                'RELATED_TO',
                'CONNECTED_TO',
                'COMMUNICATES_WITH',
                'MEMBER_OF',
                'LOCATED_AT',
                'PARTICIPATED_IN',
            ],
            tenantId,
            userId,
            investigationId,
        };
    }
    /**
     * Check if query is within configured budget
     */
    isWithinBudget(cost) {
        const costClassOrder = ['low', 'medium', 'high', 'very-high'];
        const maxClassIndex = costClassOrder.indexOf(MAX_COST_CLASS);
        const currentClassIndex = costClassOrder.indexOf(cost.costClass);
        if (currentClassIndex > maxClassIndex) {
            return false;
        }
        if (cost.estimatedTimeMs > MAX_ESTIMATED_TIME_MS) {
            return false;
        }
        return true;
    }
    /**
     * Generate refinement suggestions for over-budget queries
     */
    generateRefinements(originalPrompt, cypher, cost) {
        const refinements = [];
        // Suggest adding LIMIT if missing
        if (!cypher.toUpperCase().includes('LIMIT')) {
            refinements.push({
                original: originalPrompt,
                suggested: `${originalPrompt} (limit to first 25 results)`,
                reason: 'Adding a limit reduces the result set size',
                estimatedCostReduction: 'medium',
            });
        }
        // Suggest narrowing scope for path queries
        if (cypher.includes('[*')) {
            refinements.push({
                original: originalPrompt,
                suggested: `${originalPrompt} (within 2 hops)`,
                reason: 'Reducing path depth significantly decreases computational cost',
                estimatedCostReduction: 'high',
            });
        }
        // Suggest adding filters
        if (!cypher.toUpperCase().includes('WHERE')) {
            refinements.push({
                original: originalPrompt,
                suggested: `${originalPrompt} for a specific entity type`,
                reason: 'Filtering by entity type reduces the search space',
                estimatedCostReduction: 'medium',
            });
        }
        // Suggest time bounds for large graphs
        if (cost.nodesScanned > 10000) {
            refinements.push({
                original: originalPrompt,
                suggested: `${originalPrompt} in the last 30 days`,
                reason: 'Time-bounding the query reduces the data scanned',
                estimatedCostReduction: 'high',
            });
        }
        return refinements;
    }
    /**
     * Get suggestions for failed query generation
     */
    getSuggestions(prompt) {
        const suggestions = [
            'Try rephrasing your question more specifically',
            'Include entity types or relationship names if known',
        ];
        // Suggest available patterns
        const availablePatterns = query_patterns_js_1.queryPatterns
            .slice(0, 3)
            .map((p) => p.description);
        suggestions.push(...availablePatterns.map((d) => `Try: "${d}"`));
        return suggestions;
    }
    /**
     * Get block reason for unsafe queries
     */
    getBlockReason(cost, isReadOnly) {
        if (!isReadOnly) {
            return 'Query contains mutation operations which are not allowed';
        }
        if (cost.costClass === 'very-high') {
            return `Query cost is too high (${cost.costClass}). Consider adding filters or limits.`;
        }
        if (cost.estimatedTimeMs > MAX_ESTIMATED_TIME_MS) {
            return `Estimated execution time (${cost.estimatedTimeMs}ms) exceeds limit (${MAX_ESTIMATED_TIME_MS}ms)`;
        }
        return 'Query does not meet safety requirements';
    }
    /**
     * Create a failed preview response
     */
    createFailedPreview(queryId, originalQuery, reason, suggestions) {
        return {
            queryId,
            cypher: '',
            explanation: reason,
            cost: {
                nodesScanned: 0,
                edgesScanned: 0,
                costClass: 'low',
                estimatedTimeMs: 0,
                estimatedMemoryMb: 0,
                costDrivers: [],
            },
            isSafe: false,
            parameters: {},
            warnings: suggestions,
            allowed: false,
            blockReason: reason,
        };
    }
    /**
     * Cache a query preview
     */
    cachePreview(request, preview) {
        const cacheKey = this.getCacheKey(request);
        this.queryCache.set(cacheKey, preview);
        // Limit cache size
        if (this.queryCache.size > 1000) {
            const firstKey = this.queryCache.keys().next().value;
            if (firstKey) {
                this.queryCache.delete(firstKey);
            }
        }
    }
    /**
     * Generate cache key for a request
     */
    getCacheKey(request) {
        return [
            request.query.trim().toLowerCase(),
            request.investigationId,
            request.tenantId || 'default',
        ].join('::');
    }
    /**
     * Get cached preview if available
     */
    getCachedPreview(request) {
        const cacheKey = this.getCacheKey(request);
        return this.queryCache.get(cacheKey) || null;
    }
    /**
     * Clear the query cache
     */
    clearCache() {
        this.queryCache.clear();
        logger.info('Query cache cleared');
    }
    /**
     * Get available query patterns
     */
    getAvailablePatterns() {
        return query_patterns_js_1.queryPatterns.map((p) => ({
            name: p.name,
            description: p.description,
            expectedCost: p.expectedCost,
        }));
    }
}
exports.NLQueryService = NLQueryService;
/**
 * Singleton instance
 */
let serviceInstance = null;
/**
 * Get the singleton service instance
 */
function getNLQueryService() {
    if (!serviceInstance) {
        serviceInstance = new NLQueryService();
    }
    return serviceInstance;
}
/**
 * Create a new service instance with custom adapters
 */
function createNLQueryService(options) {
    return new NLQueryService(options);
}
