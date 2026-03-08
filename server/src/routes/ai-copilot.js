"use strict";
// @ts-nocheck
/**
 * AI Copilot API Routes
 *
 * RESTful API for AI-powered analyst capabilities:
 * - Natural language queries
 * - Graph RAG
 * - Query preview & sandbox
 * - Citation & provenance
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const auth_js_1 = require("../middleware/auth.js");
const tenant_js_1 = require("../middleware/tenant.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const TenantIsolationGuard_js_1 = require("../tenancy/TenantIsolationGuard.js");
const router = (0, express_1.Router)();
// Apply middleware
router.use(auth_js_1.authMiddleware);
router.use(tenant_js_1.tenantMiddleware);
// Request schemas for validation
const CopilotQuerySchema = zod_1.z.object({
    investigationId: zod_1.z.string().min(1),
    question: zod_1.z.string().min(3).max(1000),
    mode: zod_1.z.enum(['nl2cypher', 'graphrag', 'auto']).optional(),
    focusEntityIds: zod_1.z.array(zod_1.z.string()).optional(),
    maxHops: zod_1.z.number().int().min(1).max(3).optional(),
    redactionPolicy: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        rules: zod_1.z.array(zod_1.z.enum(['pii', 'financial', 'sensitive', 'k_anon'])),
        allowedFields: zod_1.z.array(zod_1.z.string()).optional(),
        classificationLevel: zod_1.z.enum(['public', 'internal', 'confidential', 'secret']).optional(),
    }).optional(),
    provenanceContext: zod_1.z.object({
        claimId: zod_1.z.string().optional(),
        evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
        authorityId: zod_1.z.string(),
        reasonForAccess: zod_1.z.string(),
    }).optional(),
    registerClaim: zod_1.z.boolean().optional(),
    generateQueryPreview: zod_1.z.boolean().optional(),
    autoExecute: zod_1.z.boolean().optional(),
    dryRun: zod_1.z.boolean().optional(),
    maxRows: zod_1.z.number().int().min(1).max(1000).optional(),
    timeout: zod_1.z.number().int().min(1000).max(60000).optional(),
    enableGuardrails: zod_1.z.boolean().optional(),
    riskTolerance: zod_1.z.enum(['low', 'medium', 'high']).optional(),
});
const ReplayQuerySchema = zod_1.z.object({
    modifiedQuestion: zod_1.z.string().min(3).max(1000).optional(),
    modifiedParameters: zod_1.z.record(zod_1.z.unknown()).optional(),
    skipCache: zod_1.z.boolean().optional(),
});
/**
 * POST /api/ai-copilot/query
 *
 * Main AI Copilot query endpoint
 */
router.post('/query', rateLimit_js_1.rateLimitMiddleware, async (req, res, next) => {
    const startTime = Date.now();
    try {
        // Validate request
        const validated = CopilotQuerySchema.parse(req.body);
        const userId = req.user?.id;
        const tenantContext = req.tenant;
        const tenantId = tenantContext?.tenantId || req.tenant?.id;
        if (!userId || !tenantId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User and tenant context required',
            });
        }
        if (!tenantContext) {
            return res.status(400).json({
                error: 'TenantContextMissing',
                message: 'Tenant context is required for AI copilot operations',
            });
        }
        const llmDecision = await TenantIsolationGuard_js_1.tenantIsolationGuard.enforceLlmCeiling(tenantContext);
        res.setHeader('X-Tenant-LLM-Limit', String(llmDecision.limit));
        res.setHeader('X-Tenant-LLM-Reset', String(Math.ceil(llmDecision.reset / 1000)));
        if (llmDecision.warning) {
            res.setHeader('Warning', llmDecision.warning);
        }
        if (!llmDecision.allowed) {
            return res.status(llmDecision.status || 429).json({
                error: 'LLMQuotaExceeded',
                message: llmDecision.reason || 'LLM quota exceeded for tenant',
            });
        }
        // Get orchestrator instance (would be injected via DI in production)
        const orchestrator = req.orchestrator;
        if (!orchestrator) {
            return res.status(500).json({
                error: 'ServiceUnavailable',
                message: 'AI Copilot service not available',
            });
        }
        const request = {
            ...validated,
            userId,
            tenantId,
        };
        logger_js_1.logger.info({
            investigationId: request.investigationId,
            userId,
            tenantId,
            mode: request.mode || 'auto',
            questionLength: request.question.length,
        }, 'AI Copilot query request');
        // Execute query
        const response = await orchestrator.query(request);
        const executionTimeMs = Date.now() - startTime;
        metrics_js_1.metrics.copilotApiRequestTotal.inc({
            endpoint: '/query',
            mode: response.mode,
            status: 'success',
        });
        metrics_js_1.metrics.copilotApiRequestDurationMs.observe({ endpoint: '/query', mode: response.mode }, executionTimeMs);
        return res.status(200).json({
            success: true,
            data: response,
            meta: {
                executionTimeMs,
                mode: response.mode,
                runId: response.runId,
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            error: error.message,
            stack: error.stack,
            body: req.body,
        }, 'AI Copilot query failed');
        metrics_js_1.metrics.copilotApiRequestTotal.inc({
            endpoint: '/query',
            status: 'error',
        });
        // Handle validation errors
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Invalid request parameters',
                details: error.errors,
            });
        }
        // Handle user-facing errors
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.name || 'Error',
                message: error.message,
                code: error.code,
            });
        }
        // Generic error
        return res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to process query',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});
/**
 * GET /api/ai-copilot/history/:investigationId
 *
 * Get query history for an investigation
 */
router.get('/history/:investigationId', auth_js_1.requireAuth, async (req, res, next) => {
    try {
        const { investigationId } = req.params;
        const { limit = '20', offset = '0', mode } = req.query;
        const orchestrator = req.orchestrator;
        if (!orchestrator) {
            return res.status(500).json({
                error: 'ServiceUnavailable',
                message: 'AI Copilot service not available',
            });
        }
        const history = await orchestrator.getQueryHistory(investigationId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            mode: mode,
        });
        return res.status(200).json({
            success: true,
            data: history.queries,
            meta: {
                total: history.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            error: error.message,
            investigationId: req.params.investigationId,
        }, 'Failed to fetch query history');
        return res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to fetch query history',
        });
    }
});
/**
 * GET /api/ai-copilot/run/:runId
 *
 * Get detailed information about a specific run
 */
router.get('/run/:runId', auth_js_1.requireAuth, async (req, res, next) => {
    try {
        const { runId } = req.params;
        const orchestrator = req.orchestrator;
        if (!orchestrator) {
            return res.status(500).json({
                error: 'ServiceUnavailable',
                message: 'AI Copilot service not available',
            });
        }
        const run = await orchestrator.getRun(runId);
        if (!run) {
            return res.status(404).json({
                error: 'NotFound',
                message: `Run ${runId} not found`,
            });
        }
        return res.status(200).json({
            success: true,
            data: run,
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            error: error.message,
            runId: req.params.runId,
        }, 'Failed to fetch run details');
        return res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to fetch run details',
        });
    }
});
/**
 * POST /api/ai-copilot/replay/:runId
 *
 * Replay a previous query with optional modifications
 */
router.post('/replay/:runId', rateLimit_js_1.rateLimitMiddleware, async (req, res, next) => {
    try {
        const { runId } = req.params;
        const validated = ReplayQuerySchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User context required',
            });
        }
        const orchestrator = req.orchestrator;
        if (!orchestrator) {
            return res.status(500).json({
                error: 'ServiceUnavailable',
                message: 'AI Copilot service not available',
            });
        }
        const response = await orchestrator.replayQuery(runId, userId, validated);
        return res.status(200).json({
            success: true,
            data: response,
            meta: {
                originalRunId: runId,
                replayRunId: response.runId,
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            error: error.message,
            runId: req.params.runId,
        }, 'Failed to replay query');
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: 'NotFound',
                message: error.message,
            });
        }
        return res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to replay query',
        });
    }
});
/**
 * GET /api/ai-copilot/health
 *
 * Health check for AI Copilot services
 */
router.get('/health', async (req, res) => {
    try {
        const orchestrator = req.orchestrator;
        if (!orchestrator) {
            return res.status(503).json({
                status: 'unhealthy',
                message: 'AI Copilot service not available',
            });
        }
        const health = await orchestrator.healthCheck();
        const statusCode = health.status === 'healthy' ? 200
            : health.status === 'degraded' ? 200
                : 503;
        return res.status(statusCode).json({
            success: true,
            data: health,
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            error: error.message,
        }, 'Health check failed');
        return res.status(503).json({
            status: 'unhealthy',
            error: 'Health check failed',
            message: error.message,
        });
    }
});
/**
 * GET /api/ai-copilot/capabilities
 *
 * Get available AI Copilot capabilities
 */
router.get('/capabilities', async (req, res) => {
    return res.status(200).json({
        success: true,
        data: {
            modes: [
                {
                    mode: 'graphrag',
                    name: 'Graph RAG',
                    description: 'Retrieval Augmented Generation over knowledge graphs for contextual Q&A',
                    capabilities: [
                        'Natural language understanding',
                        'Contextual answers with citations',
                        'Graph traversal and reasoning',
                        'Provenance tracking',
                        'Redaction awareness',
                    ],
                },
                {
                    mode: 'nl2cypher',
                    name: 'Natural Language to Cypher',
                    description: 'Convert natural language questions to Cypher graph queries',
                    capabilities: [
                        'Structured query generation',
                        'Query preview and explanation',
                        'Cost estimation',
                        'Sandbox execution',
                        'Safety validation',
                    ],
                },
                {
                    mode: 'auto',
                    name: 'Auto',
                    description: 'Automatically select the best mode based on query characteristics',
                    capabilities: [
                        'Intelligent mode selection',
                        'Seamless UX',
                        'All capabilities of both modes',
                    ],
                },
            ],
            features: [
                'Guardrails and safety checks',
                'Redaction and policy enforcement',
                'Citation and provenance tracking',
                'Query history and replay',
                'Glass-box run observability',
            ],
        },
    });
});
exports.default = router;
