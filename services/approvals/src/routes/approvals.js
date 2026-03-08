"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const approval_service_js_1 = require("../services/approval-service.js");
const types_js_1 = require("../types.js");
const logger_js_1 = require("../utils/logger.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const log = logger_js_1.logger.child({ component: 'approvals-routes' });
// ============================================================================
// Middleware
// ============================================================================
function extractTenantId(req, res, next) {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(400).json({
            code: 'MISSING_TENANT_ID',
            message: 'X-Tenant-ID header is required',
        });
        return;
    }
    req.tenantId = tenantId;
    next();
}
function handleError(err, req, res, next) {
    if (err instanceof zod_1.ZodError) {
        res.status(422).json({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
                code: e.code,
            })),
        });
        return;
    }
    if (err instanceof types_js_1.AppError) {
        res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            ...(err.details && { details: err.details }),
        });
        return;
    }
    log.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
    });
}
// Apply tenant extraction to all routes
router.use(extractTenantId);
// ============================================================================
// Routes
// ============================================================================
/**
 * POST /api/v1/requests - Create approval request
 */
router.post('/requests', async (req, res, next) => {
    try {
        const idempotencyKey = req.headers['x-idempotency-key'];
        const input = types_js_1.CreateApprovalRequestSchema.parse(req.body);
        const request = await approval_service_js_1.approvalService.createRequest(req.tenantId, input, idempotencyKey);
        res.status(201).json(request);
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/requests - List approval requests
 */
router.get('/requests', async (req, res, next) => {
    try {
        const query = types_js_1.ListRequestsQuerySchema.parse(req.query);
        const result = await approval_service_js_1.approvalService.listRequests(req.tenantId, query);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/requests/:requestId - Get single request
 */
router.get('/requests/:requestId', async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const request = await approval_service_js_1.approvalService.getRequest(req.tenantId, requestId);
        if (!request) {
            res.status(404).json({
                code: 'NOT_FOUND',
                message: `Approval request '${requestId}' not found`,
            });
            return;
        }
        res.json(request);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/requests/:requestId/decision - Submit decision
 */
router.post('/requests/:requestId/decision', async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const input = types_js_1.ApprovalDecisionSchema.parse(req.body);
        const request = await approval_service_js_1.approvalService.submitDecision(req.tenantId, requestId, input);
        res.json(request);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/requests/:requestId/cancel - Cancel request
 */
router.post('/requests/:requestId/cancel', async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const input = types_js_1.CancelRequestSchema.parse(req.body);
        const request = await approval_service_js_1.approvalService.cancelRequest(req.tenantId, requestId, input);
        res.json(request);
    }
    catch (err) {
        next(err);
    }
});
// Error handler
router.use(handleError);
exports.default = router;
