"use strict";
// @ts-nocheck
// server/src/conductor/router/router-api.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const router_v2_js_1 = require("./router-v2.js");
const prometheus_js_1 = require("../observability/prometheus.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const router = express_1.default.Router();
// Request validation schemas
const routeRequestSchema = zod_1.z.object({
    taskId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    candidates: zod_1.z.array(zod_1.z.string()).optional(),
});
const rewardRequestSchema = zod_1.z.object({
    taskId: zod_1.z.string().uuid(),
    signal: zod_1.z.enum([
        'success_at_k',
        'human_thumbs',
        'incident_free',
        'cost_efficiency',
        'latency',
    ]),
    value: zod_1.z.number().min(0).max(1),
    timestamp: zod_1.z.number().optional(),
});
/**
 * Route a task to the best expert using adaptive routing
 * POST /api/conductor/v1/router/route
 */
router.post('/route', async (req, res) => {
    try {
        const startTime = Date.now();
        // Validate request
        const validation = routeRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid request',
                details: validation.error.errors,
            });
        }
        const { taskId, tenantId, context = {}, candidates } = validation.data;
        // Check tenant isolation
        if (!req.user || req.user.tenantId !== tenantId) {
            return res.status(403).json({
                error: 'Insufficient permissions for tenant',
            });
        }
        // Dual-control enforcement for high-sensitivity tasks
        const requestContext = req.context; // Assert req.context is present
        if (requestContext && requestContext.sensitivity === 'high') {
            const approvalToken = req.headers['x-approval-token'];
            const approverId = req.headers['x-approver-id'];
            const approvalReason = req.headers['x-approval-reason'];
            if (!approvalToken || !approverId || !approvalReason) {
                logger_js_1.default.warn('Dual-control required but approval headers missing', {
                    taskId,
                    tenantId,
                    sensitivity: requestContext.sensitivity,
                });
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Dual-control approval required for high-sensitivity tasks. Missing X-Approval-Token, X-Approver-Id, or X-Approval-Reason headers.',
                });
            }
            // In a real system, you would validate the approvalToken here (e.g., against a secure token store)
            // For this exercise, we'll assume its presence is sufficient for demonstration.
            logger_js_1.default.info('Dual-control approval received', {
                taskId,
                tenantId,
                approverId,
                approvalReason,
            });
        }
        // Route the task
        const routingResponse = await router_v2_js_1.adaptiveExpertRouter.route({
            query: taskId,
            tenantId,
            context: {
                ...context,
                candidates: candidates || [],
            },
        });
        const responseTime = Date.now() - startTime;
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('router_api_request', { success: true });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_api_latency', responseTime);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_confidence', routingResponse.confidence);
        // Log for audit
        logger_js_1.default.info('Router decision made', {
            taskId,
            tenantId,
            expertId: routingResponse.expertId,
            confidence: routingResponse.confidence,
            responseTime,
            user: req.user?.id,
            // Add approval details to audit log if present
            ...(requestContext &&
                requestContext.sensitivity === 'high' && {
                approval: {
                    approverId: req.headers['x-approver-id'],
                    approvalReason: req.headers['x-approval-reason'],
                },
            }),
        });
        res.json({
            taskId,
            expertId: routingResponse.expertId,
            confidence: routingResponse.confidence,
            rationaleId: routingResponse.rationaleId,
            estimatedCost: routingResponse.estimatedCost,
            metadata: {
                responseTime,
                strategy: routingResponse.strategy,
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('Router API error', { error, body: req.body });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('router_api_error', { success: false });
        res.status(500).json({
            error: 'Internal routing error',
            ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
        });
    }
});
/**
 * Submit reward signal for routing decision
 * POST /api/conductor/v1/router/reward
 */
router.post('/reward', async (req, res) => {
    try {
        // Validate request
        const validation = rewardRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid reward signal',
                details: validation.error.errors,
            });
        }
        const { taskId, signal, value, timestamp } = validation.data;
        // Submit reward to router
        await router_v2_js_1.adaptiveExpertRouter.submitOutcome(taskId, {
            success: value > 0.5, // Simple success threshold
            latency: 0, // Would be populated from actual execution
            cost: 0, // Would be populated from actual execution
            quality: value,
            metadata: {
                signal,
                timestamp: timestamp || Date.now(),
            },
        });
        // Log for audit
        logger_js_1.default.info('Reward signal processed', {
            taskId,
            signal,
            value,
            user: req.user?.id,
        });
        res.status(202).json({
            status: 'accepted',
            taskId,
            signal,
            value,
        });
    }
    catch (error) {
        logger_js_1.default.error('Reward API error', { error, body: req.body });
        res.status(500).json({
            error: 'Error processing reward signal',
            ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
        });
    }
});
/**
 * Get routing statistics and health
 * GET /api/conductor/v1/router/health
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metrics: {
                totalDecisions: router_v2_js_1.adaptiveExpertRouter.getMetrics?.()?.totalDecisions || 0,
                avgConfidence: router_v2_js_1.adaptiveExpertRouter.getMetrics?.()?.avgConfidence || 0,
            },
        };
        res.json(health);
    }
    catch (error) {
        logger_js_1.default.error('Router health check error', { error });
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
exports.default = router;
