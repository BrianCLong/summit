"use strict";
// @ts-nocheck
/**
 * NL Graph Query Copilot API Endpoints
 * Provides a natural language to Cypher compilation service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_1 = __importDefault(require("pino"));
const index_js_1 = require("../ai/nl-graph-query/index.js");
const logger = pino_1.default({ name: 'nl-graph-query-routes' });
const router = express_1.default.Router();
// Rate limiting for NL query compilation (moderate limits)
const nlQueryRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many query compilation requests, please try again later',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply rate limiting to all routes
router.use(nlQueryRateLimit);
// Validation middleware for compile endpoint
const validateCompileRequest = [
    (0, express_validator_1.body)('prompt')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('prompt is required')
        .isLength({ max: 1000 })
        .withMessage('prompt must be at most 1000 characters'),
    (0, express_validator_1.body)('schemaContext')
        .isObject()
        .withMessage('schemaContext is required and must be an object'),
    (0, express_validator_1.body)('schemaContext.nodeLabels')
        .optional()
        .isArray()
        .withMessage('nodeLabels must be an array'),
    (0, express_validator_1.body)('schemaContext.relationshipTypes')
        .optional()
        .isArray()
        .withMessage('relationshipTypes must be an array'),
    (0, express_validator_1.body)('schemaContext.policyTags')
        .optional()
        .isArray()
        .withMessage('policyTags must be an array'),
    (0, express_validator_1.body)('schemaContext.tenantId')
        .optional()
        .isString()
        .withMessage('tenantId must be a string'),
    (0, express_validator_1.body)('schemaContext.userId')
        .optional()
        .isString()
        .withMessage('userId must be a string'),
    (0, express_validator_1.body)('schemaContext.investigationId')
        .optional()
        .isString()
        .withMessage('investigationId must be a string'),
    (0, express_validator_1.body)('parameters')
        .optional()
        .isObject()
        .withMessage('parameters must be an object'),
    (0, express_validator_1.body)('verbose')
        .optional()
        .isBoolean()
        .withMessage('verbose must be a boolean'),
];
// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
};
/**
 * POST /ai/nl-graph-query/compile
 * Compile a natural language prompt into a Cypher query
 *
 * Request body:
 * {
 *   prompt: string,
 *   schemaContext: SchemaContext,
 *   parameters?: Record<string, any>,
 *   verbose?: boolean
 * }
 *
 * Response:
 * Success (200):
 * {
 *   queryId: string,
 *   cypher: string,
 *   explanationDetails: {
 *     summary: string,
 *     rationale: string[],
 *     evidence: { source: string, snippet: string, reason: string }[],
 *     confidence: number
 *   },
 *   estimatedCost: CostEstimate,
 *   explanation: string,
 *   requiredParameters: string[],
 *   isSafe: boolean,
 *   warnings: string[],
 *   timestamp: Date
 * }
 *
 * Error (400, 500):
 * {
 *   code: string,
 *   message: string,
 *   suggestions: string[],
 *   originalPrompt: string
 * }
 */
router.post('/compile', validateCompileRequest, handleValidationErrors, async (req, res) => {
    const startTime = Date.now();
    try {
        const { prompt, schemaContext, parameters, verbose } = req.body;
        logger.info({
            prompt: prompt.substring(0, 100), // Log first 100 chars
            tenantId: schemaContext.tenantId,
            userId: schemaContext.userId,
            hasParameters: !!parameters,
            verbose,
        }, 'NL query compilation request received');
        const compileRequest = {
            prompt,
            schemaContext: schemaContext,
            parameters,
            verbose: verbose || false,
        };
        const service = (0, index_js_1.getNlGraphQueryService)();
        const result = await service.compile(compileRequest);
        const responseTime = Date.now() - startTime;
        // Check if result is an error
        if ('code' in result) {
            // CompileError
            logger.warn({
                errorCode: result.code,
                message: result.message,
                responseTimeMs: responseTime,
            }, 'Query compilation failed with error');
            return res.status(400).json(result);
        }
        // Success - CompileResponse
        logger.info({
            queryId: result.queryId,
            costClass: result.estimatedCost.costClass,
            isSafe: result.isSafe,
            warningCount: result.warnings.length,
            requiredParamsCount: result.requiredParameters.length,
            explanationConfidence: result.explanationDetails.confidence,
            evidenceCount: result.explanationDetails.evidence.length,
            responseTimeMs: responseTime,
        }, 'Query compilation successful with explanation payload');
        return res.status(200).json({
            ...result,
            metadata: {
                compilationTimeMs: responseTime,
                service: 'nl-graph-query-copilot',
                version: '1.0.0',
                explanation: {
                    confidence: result.explanationDetails.confidence,
                    evidenceCount: result.explanationDetails.evidence.length,
                },
            },
        });
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            responseTimeMs: responseTime,
        }, 'Unexpected error in compile endpoint');
        return res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred during query compilation',
            suggestions: [
                'Please try again',
                'If the problem persists, contact support',
            ],
            originalPrompt: req.body.prompt || '',
        });
    }
});
/**
 * GET /ai/nl-graph-query/patterns
 * Get information about available query patterns
 *
 * Response:
 * {
 *   patterns: Array<{
 *     name: string,
 *     description: string,
 *     expectedCost: string
 *   }>,
 *   count: number
 * }
 */
router.get('/patterns', async (req, res) => {
    try {
        const service = (0, index_js_1.getNlGraphQueryService)();
        const patterns = service.getAvailablePatterns();
        logger.info({ patternCount: patterns.length }, 'Returning available query patterns');
        return res.status(200).json({
            patterns,
            count: patterns.length,
        });
    }
    catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Error retrieving patterns');
        return res.status(500).json({
            error: 'Failed to retrieve patterns',
            message: 'An unexpected error occurred',
        });
    }
});
/**
 * GET /ai/nl-graph-query/health
 * Health check for the NL query service
 *
 * Response:
 * {
 *   status: 'healthy' | 'degraded',
 *   cache: { size: number, maxSize: number },
 *   uptime: number
 * }
 */
router.get('/health', async (req, res) => {
    try {
        const service = (0, index_js_1.getNlGraphQueryService)();
        const cacheStats = service.getCacheStats();
        return res.status(200).json({
            status: 'healthy',
            cache: cacheStats,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Health check failed');
        return res.status(503).json({
            status: 'degraded',
            error: 'Service health check failed',
        });
    }
});
/**
 * POST /ai/nl-graph-query/cache/clear
 * Clear the query compilation cache
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/cache/clear', async (req, res) => {
    try {
        const service = (0, index_js_1.getNlGraphQueryService)();
        service.clearCache();
        logger.info('Query cache cleared via API request');
        return res.status(200).json({
            success: true,
            message: 'Query cache cleared successfully',
        });
    }
    catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to clear cache');
        return res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
        });
    }
});
exports.default = router;
