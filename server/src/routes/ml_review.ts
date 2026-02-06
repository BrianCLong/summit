import { Router } from 'express';
import { reviewQueueService } from '../services/ReviewQueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../config/logger.js';

const router = Router();
const singleParam = (value: unknown): string | undefined =>
    Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;

// Zod schemas for validation
const CreateQueueSchema = z.object({
    name: z.string().min(1),
    priorityConfig: z.record(z.any()).optional()
});

const UpdateQueueSchema = z.object({
    name: z.string().min(1).optional(),
    priorityConfig: z.record(z.any()).optional()
});

const EnqueueItemSchema = z.object({
    data: z.any(),
    confidence: z.number().min(0).max(1)
});

const SubmitDecisionSchema = z.object({
    decision: z.enum(['ACCEPTED', 'REJECTED', 'ABSTAIN']),
    metadata: z.record(z.any()).optional()
});

const BatchDecisionsSchema = z.object({
    decisions: z.array(z.object({
        itemId: z.string().uuid(),
        decision: z.enum(['ACCEPTED', 'REJECTED', 'ABSTAIN']),
        metadata: z.record(z.any()).optional()
    })).min(1).max(100)
});

// Middleware to ensure tenant context
// Assuming req.user!.tenantId is populated by ensureAuthenticated
const ensureTenant = (req: any, res: any, next: any) => {
    if (!req.user || !req.user!.tenantId) {
        return next(new AppError('Tenant context missing', 403));
    }
    next();
};

// Create a new review queue
router.post('/queues', ensureAuthenticated, ensureTenant, async (req: any, res: any, next: any) => {
    try {
        const { name, priorityConfig } = CreateQueueSchema.parse(req.body);
        const queue = await reviewQueueService.createQueue(
            req.user!.tenantId,
            name,
            priorityConfig
        );
        res.status(201).json(queue);
    } catch (e: any) {
        next(e);
    }
});

// List queues
router.get('/queues', ensureAuthenticated, ensureTenant, async (req: any, res: any, next: any) => {
    try {
        const queues = await reviewQueueService.listQueues(req.user!.tenantId);
        res.json(queues);
    } catch (e: any) {
        next(e);
    }
});

// Update queue
router.put('/queues/:queueId', ensureAuthenticated, ensureTenant, async (req: any, res: any, next: any) => {
    try {
        const queueId = singleParam(req.params.queueId) ?? '';
        const updates = UpdateQueueSchema.parse(req.body);
        const queue = await reviewQueueService.updateQueue(
            queueId,
            req.user!.tenantId,
            updates
        );
        res.json(queue);
    } catch (e: any) {
        next(e);
    }
});

// Delete queue
router.delete('/queues/:queueId', ensureAuthenticated, ensureTenant, async (req: any, res: any, next: any) => {
    try {
        const queueId = singleParam(req.params.queueId) ?? '';
        await reviewQueueService.deleteQueue(queueId, req.user!.tenantId);
        res.status(204).send();
    } catch (e: any) {
        next(e);
    }
});

// Enqueue an item (likely called by internal services, but exposed for flexibility/testing)
// Should probably be protected by specific permission
router.post('/queues/:queueId/items', ensureAuthenticated, ensureTenant, async (req: any, res, next) => {
    try {
        const queueId = singleParam(req.params.queueId) ?? '';
        const { data, confidence } = EnqueueItemSchema.parse(req.body);
        const item = await reviewQueueService.enqueueItem(
            queueId,
            req.user!.tenantId,
            data,
            confidence
        );
        res.status(201).json(item);
    } catch (e: any) {
        next(e);
    }
});

// Get items for review (with priority sampling)
router.get('/queues/:queueId/items', ensureAuthenticated, ensureTenant, async (req: any, res, next) => {
    try {
        const queueId = singleParam(req.params.queueId) ?? '';
        let limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        if (isNaN(limit) || limit < 1) limit = 10;
        if (limit > 100) limit = 100; // Cap limit

        const items = await reviewQueueService.getItemsForReview(
            queueId,
            req.user!.tenantId,
            limit
        );
        res.json(items);
    } catch (e: any) {
        next(e);
    }
});

// Submit a review decision
router.post('/items/:itemId/decision', ensureAuthenticated, ensureTenant, async (req: any, res, next) => {
    try {
        const itemId = singleParam(req.params.itemId) ?? '';
        const userId = req.user!.id;
        const { decision, metadata } = SubmitDecisionSchema.parse(req.body);

        await reviewQueueService.submitDecision(
            itemId,
            req.user!.tenantId,
            userId,
            decision,
            metadata
        );
        res.status(200).json({ success: true });
    } catch (e: any) {
        next(e);
    }
});

// Submit batch decisions
router.post('/items/batch-decision', ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const { decisions } = BatchDecisionsSchema.parse(req.body);

        await reviewQueueService.submitBatchDecisions(
            decisions,
            req.user!.tenantId,
            req.user!.id
        );
        res.status(200).json({ success: true, count: decisions.length });
    } catch (e: any) {
        next(e);
    }
});

// Get queue stats
router.get('/queues/:queueId/stats', ensureAuthenticated, ensureTenant, async (req, res, next) => {
    try {
        const queueId = singleParam(req.params.queueId) ?? '';
        const stats = await reviewQueueService.getQueueStats(
            queueId,
            req.user!.tenantId
        );
        res.json(stats);
    } catch (e: any) {
        next(e);
    }
});

export default router;
