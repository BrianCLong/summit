"use strict";
/**
 * NL Graph Query Copilot Service
 *
 * Translates natural language questions into safe, previewable Cypher graph queries.
 * Does NOT execute queries - only generates and validates them.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlGraphQueryService = void 0;
exports.getNlGraphQueryService = getNlGraphQueryService;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const query_patterns_js_1 = require("./query-patterns.js");
const cost_estimator_js_1 = require("./cost-estimator.js");
const validator_js_1 = require("./validator.js");
const explainer_js_1 = require("./explainer.js");
const logger = pino_1.default({ name: 'nl-graph-query' });
class NlGraphQueryService {
    queryCache = new Map();
    /**
     * Compile a natural language prompt into a Cypher query
     */
    async compile(request) {
        const startTime = Date.now();
        const queryId = (0, crypto_1.randomUUID)();
        logger.info({
            queryId,
            prompt: request.prompt,
            tenantId: request.schemaContext.tenantId,
            userId: request.schemaContext.userId,
        }, 'Compiling NL query');
        try {
            // Validate input
            const inputValidation = this.validateInput(request);
            if (!inputValidation.valid) {
                return this.createError('INVALID_INPUT', inputValidation.message, inputValidation.suggestions || [], request.prompt);
            }
            // Check cache
            const cacheKey = this.getCacheKey(request);
            if (this.queryCache.has(cacheKey)) {
                logger.info({ queryId, cached: true }, 'Returning cached query');
                return this.queryCache.get(cacheKey);
            }
            // Generate Cypher from natural language
            const cypher = await this.generateCypher(request.prompt, request.schemaContext);
            if (!cypher) {
                return this.createError('GENERATION_FAILED', 'Could not generate Cypher query from prompt', [
                    'Try rephrasing your question more specifically',
                    'Include entity types or relationship names if known',
                    'Start with simpler queries like "show all nodes"',
                ], request.prompt);
            }
            // Validate the generated Cypher
            const validation = (0, validator_js_1.validateCypher)(cypher);
            if (!validation.isValid) {
                logger.warn({
                    queryId,
                    syntaxErrors: validation.syntaxErrors,
                    securityIssues: validation.securityIssues,
                }, 'Generated invalid Cypher');
                return this.createError('INVALID_CYPHER', 'Generated query contains errors', [
                    ...validation.syntaxErrors,
                    ...validation.securityIssues,
                    'This is a bug - please report it with your prompt',
                ], request.prompt);
            }
            // Generate warnings
            const estimatedCost = (0, cost_estimator_js_1.estimateQueryCost)(cypher);
            const warnings = [
                ...validation.warnings,
                ...(0, cost_estimator_js_1.generateCostWarnings)(estimatedCost),
            ];
            if (!(0, validator_js_1.isReadOnlyQuery)(cypher)) {
                warnings.push('Query contains mutation operations - execution blocked');
            }
            // Generate explanation
            const explanation = request.verbose
                ? (0, explainer_js_1.explainQuery)(cypher, true)
                : (0, explainer_js_1.summarizeQuery)(cypher);
            const explanationDetails = (0, explainer_js_1.buildQueryExplanation)(cypher, {
                warnings,
                estimatedCost: estimatedCost.costClass,
                verbose: request.verbose,
            });
            // Extract required parameters
            const requiredParameters = (0, validator_js_1.extractRequiredParameters)(cypher);
            // Check safety
            const isSafe = (0, cost_estimator_js_1.isSafeToExecute)(estimatedCost) && (0, validator_js_1.isReadOnlyQuery)(cypher);
            const response = {
                queryId,
                cypher,
                explanationDetails,
                estimatedCost,
                explanation,
                requiredParameters,
                isSafe,
                warnings,
                timestamp: new Date(),
            };
            // Cache the response
            this.queryCache.set(cacheKey, response);
            const compilationTime = Date.now() - startTime;
            logger.info({
                queryId,
                compilationTimeMs: compilationTime,
                costClass: estimatedCost.costClass,
                isSafe,
                warningCount: warnings.length,
                requiredParams: requiredParameters.length,
                explanationConfidence: explanationDetails.confidence,
                evidenceCount: explanationDetails.evidence.length,
            }, 'Query compilation completed');
            return response;
        }
        catch (error) {
            logger.error({
                queryId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            }, 'Query compilation failed');
            return this.createError('INTERNAL_ERROR', 'An unexpected error occurred during compilation', [
                'Please try again',
                'If the problem persists, contact support with the query ID',
            ], request.prompt);
        }
    }
    /**
     * Generate Cypher from natural language using pattern matching
     */
    async generateCypher(prompt, context) {
        const trimmed = prompt.trim();
        // Try pattern matching first
        const patternResult = (0, query_patterns_js_1.generateFromPattern)(trimmed, context);
        if (patternResult) {
            logger.debug({
                patternName: patternResult.patternName,
                expectedCost: patternResult.expectedCost,
            }, 'Generated Cypher from pattern');
            return patternResult.cypher;
        }
        // If no pattern matches, try to generate a generic query
        // For now, return null - in production, this would call an LLM
        logger.warn({ prompt }, 'No matching pattern found for prompt');
        return null;
    }
    /**
     * Validate input request
     */
    validateInput(request) {
        if (!request.prompt || request.prompt.trim().length === 0) {
            return {
                valid: false,
                message: 'Prompt cannot be empty',
                suggestions: ['Provide a natural language question about the graph'],
            };
        }
        if (request.prompt.length > 1000) {
            return {
                valid: false,
                message: 'Prompt is too long (max 1000 characters)',
                suggestions: ['Break down your question into smaller, specific queries'],
            };
        }
        if (!request.schemaContext) {
            return {
                valid: false,
                message: 'Schema context is required',
                suggestions: ['Provide graph schema information'],
            };
        }
        return { valid: true };
    }
    /**
     * Create a cache key for a request
     */
    getCacheKey(request) {
        const parts = [
            request.prompt.trim().toLowerCase(),
            request.schemaContext.tenantId || 'default',
            request.verbose ? 'verbose' : 'concise',
        ];
        return parts.join('::');
    }
    /**
     * Create a standardized error response
     */
    createError(code, message, suggestions, originalPrompt) {
        return {
            code,
            message,
            suggestions,
            originalPrompt,
        };
    }
    /**
     * Get information about available query patterns
     */
    getAvailablePatterns() {
        return query_patterns_js_1.queryPatterns.map((p) => ({
            name: p.name,
            description: p.description,
            expectedCost: p.expectedCost,
        }));
    }
    /**
     * Clear the query cache
     */
    clearCache() {
        this.queryCache.clear();
        logger.info('Query cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.queryCache.size,
            maxSize: 1000, // Could be configurable
        };
    }
}
exports.NlGraphQueryService = NlGraphQueryService;
/**
 * Singleton instance
 */
let serviceInstance = null;
/**
 * Get the singleton service instance
 */
function getNlGraphQueryService() {
    if (!serviceInstance) {
        serviceInstance = new NlGraphQueryService();
    }
    return serviceInstance;
}
