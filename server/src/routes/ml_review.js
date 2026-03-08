"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReviewQueueService_js_1 = require("../services/ReviewQueueService.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const errors_js_1 = require("../lib/errors.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
// Zod schemas for validation
const CreateQueueSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    priorityConfig: zod_1.z.record(zod_1.z.any()).optional()
});
const UpdateQueueSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    priorityConfig: zod_1.z.record(zod_1.z.any()).optional()
});
const EnqueueItemSchema = zod_1.z.object({
    data: zod_1.z.any(),
    confidence: zod_1.z.number().min(0).max(1)
});
const SubmitDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['ACCEPTED', 'REJECTED', 'ABSTAIN']),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
const BatchDecisionsSchema = zod_1.z.object({
    decisions: zod_1.z.array(zod_1.z.object({
        itemId: zod_1.z.string().uuid(),
        decision: zod_1.z.enum(['ACCEPTED', 'REJECTED', 'ABSTAIN']),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    })).min(1).max(100)
});
// Middleware to ensure tenant context
// Assuming req.user!.tenantId is populated by ensureAuthenticated
const ensureTenant = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return next(new errors_js_1.AppError('Tenant context missing', 403));
    }
    next();
};
// Create a new review queue
router.post('/queues', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const { name, priorityConfig } = CreateQueueSchema.parse(req.body);
        const queue = await ReviewQueueService_js_1.reviewQueueService.createQueue(req.user.tenantId, name, priorityConfig);
        res.status(201).json(queue);
    }
    catch (e) {
        next(e);
    }
});
// List queues
router.get('/queues', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queues = await ReviewQueueService_js_1.reviewQueueService.listQueues(req.user.tenantId);
        res.json(queues);
    }
    catch (e) {
        next(e);
    }
});
// Update queue
router.put('/queues/:queueId', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = (0, http_param_js_1.firstStringOr)(req.params.queueId, '');
        const updates = UpdateQueueSchema.parse(req.body);
        const queue = await ReviewQueueService_js_1.reviewQueueService.updateQueue(queueId, req.user.tenantId, updates);
        res.json(queue);
    }
    catch (e) {
        next(e);
    }
});
// Delete queue
router.delete('/queues/:queueId', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = (0, http_param_js_1.firstStringOr)(req.params.queueId, '');
        await ReviewQueueService_js_1.reviewQueueService.deleteQueue(queueId, req.user.tenantId);
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
// Enqueue an item (likely called by internal services, but exposed for flexibility/testing)
// Should probably be protected by specific permission
router.post('/queues/:queueId/items', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = (0, http_param_js_1.firstStringOr)(req.params.queueId, '');
        const { data, confidence } = EnqueueItemSchema.parse(req.body);
        const item = await ReviewQueueService_js_1.reviewQueueService.enqueueItem(queueId, req.user.tenantId, data, confidence);
        res.status(201).json(item);
    }
    catch (e) {
        next(e);
    }
});
// Get items for review (with priority sampling)
router.get('/queues/:queueId/items', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = (0, http_param_js_1.firstStringOr)(req.params.queueId, '');
        let limit = (0, http_param_js_1.firstString)(req.query.limit) ? parseInt((0, http_param_js_1.firstStringOr)(req.query.limit, '10')) : 10;
        if (isNaN(limit) || limit < 1)
            limit = 10;
        if (limit > 100)
            limit = 100; // Cap limit
        const items = await ReviewQueueService_js_1.reviewQueueService.getItemsForReview(queueId, req.user.tenantId, limit);
        res.json(items);
    }
    catch (e) {
        next(e);
    }
});
// Submit a review decision
router.post('/items/:itemId/decision', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const itemId = (0, http_param_js_1.firstStringOr)(req.params.itemId, '');
        const userId = req.user.id;
        const { decision, metadata } = SubmitDecisionSchema.parse(req.body);
        await ReviewQueueService_js_1.reviewQueueService.submitDecision(itemId, req.user.tenantId, userId, decision, metadata);
        res.status(200).json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
// Submit batch decisions
router.post('/items/batch-decision', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const { decisions } = BatchDecisionsSchema.parse(req.body);
        await ReviewQueueService_js_1.reviewQueueService.submitBatchDecisions(decisions, req.user.tenantId, req.user.id);
        res.status(200).json({ success: true, count: decisions.length });
    }
    catch (e) {
        next(e);
    }
});
// Get queue stats
router.get('/queues/:queueId/stats', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = (0, http_param_js_1.firstStringOr)(req.params.queueId, '');
        const stats = await ReviewQueueService_js_1.reviewQueueService.getQueueStats(queueId, req.user.tenantId);
        res.json(stats);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
