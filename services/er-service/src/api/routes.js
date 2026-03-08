"use strict";
/**
 * API Routes
 *
 * REST API endpoints for the Entity Resolution service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const pino_1 = __importDefault(require("pino"));
const ResolutionService_js_1 = require("../core/ResolutionService.js");
const IdentityNodeRepository_js_1 = require("../db/IdentityNodeRepository.js");
const IdentityClusterRepository_js_1 = require("../db/IdentityClusterRepository.js");
const ReviewQueueRepository_js_1 = require("../db/ReviewQueueRepository.js");
const BatchProcessor_js_1 = require("../batch/BatchProcessor.js");
const ExplainabilityService_js_1 = require("../explainability/ExplainabilityService.js");
const index_js_1 = require("../types/index.js");
const logger = (0, pino_1.default)({ name: 'ERApi' });
const router = (0, express_1.Router)();
exports.apiRouter = router;
// =============================================================================
// Middleware
// =============================================================================
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: result.error.errors,
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
// =============================================================================
// Health & Info
// =============================================================================
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'er-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
router.get('/info', (req, res) => {
    res.json({
        service: 'Entity Resolution Service',
        version: '1.0.0',
        capabilities: [
            'online-resolution',
            'batch-resolution',
            'deterministic-matching',
            'probabilistic-matching',
            'explainability',
            'review-queue',
        ],
        supportedEntityTypes: ['Person', 'Organization', 'Device', 'Account', 'Asset', 'Location'],
    });
});
// =============================================================================
// Online Resolution API
// =============================================================================
router.post('/api/v1/resolve', validateBody(index_js_1.ResolveNowRequestSchema), asyncHandler(async (req, res) => {
    const result = await ResolutionService_js_1.resolutionService.resolveNow(req.body);
    res.json(result);
}));
// =============================================================================
// Cluster Management API
// =============================================================================
router.get('/api/v1/clusters/:clusterId', asyncHandler(async (req, res) => {
    const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(req.params.clusterId);
    if (!cluster) {
        res.status(404).json({ error: 'Cluster not found' });
        return;
    }
    res.json(cluster);
}));
router.get('/api/v1/clusters', asyncHandler(async (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
    }
    const clusters = await IdentityClusterRepository_js_1.identityClusterRepository.search({
        tenantId,
        entityType: req.query.entityType,
        minSize: req.query.minSize ? parseInt(req.query.minSize, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({ clusters, count: clusters.length });
}));
router.post('/api/v1/clusters/:clusterId/merge', asyncHandler(async (req, res) => {
    const { sourceClusterId, decidedBy, notes } = req.body;
    if (!sourceClusterId || !decidedBy) {
        res.status(400).json({ error: 'sourceClusterId and decidedBy are required' });
        return;
    }
    const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.merge(req.params.clusterId, sourceClusterId, decidedBy, notes ?? 'Manual merge via API');
    res.json(cluster);
}));
router.post('/api/v1/clusters/:clusterId/split', asyncHandler(async (req, res) => {
    const { nodeIds, splitBy, reason } = req.body;
    if (!nodeIds?.length || !splitBy || !reason) {
        res.status(400).json({ error: 'nodeIds, splitBy, and reason are required' });
        return;
    }
    const clusters = await IdentityClusterRepository_js_1.identityClusterRepository.split(req.params.clusterId, nodeIds, splitBy, reason);
    res.json({ clusters });
}));
router.get('/api/v1/clusters/:clusterId/explain', asyncHandler(async (req, res) => {
    const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(req.params.clusterId);
    if (!cluster) {
        res.status(404).json({ error: 'Cluster not found' });
        return;
    }
    const nodes = await IdentityNodeRepository_js_1.identityNodeRepository.getByClusterId(cluster.clusterId);
    const explanation = ExplainabilityService_js_1.explainabilityService.explainCluster({ cluster, nodes });
    res.json(explanation);
}));
// =============================================================================
// Node Management API
// =============================================================================
router.get('/api/v1/nodes/:nodeId', asyncHandler(async (req, res) => {
    const node = await IdentityNodeRepository_js_1.identityNodeRepository.getById(req.params.nodeId);
    if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
    }
    res.json(node);
}));
router.get('/api/v1/nodes/:nodeId/cluster', asyncHandler(async (req, res) => {
    const cluster = await ResolutionService_js_1.resolutionService.getClusterForNode(req.params.nodeId);
    if (!cluster) {
        res.status(404).json({ error: 'Node has no cluster assignment' });
        return;
    }
    res.json(cluster);
}));
router.post('/api/v1/nodes/merge', asyncHandler(async (req, res) => {
    const { tenantId, nodeAId, nodeBId, decidedBy, notes } = req.body;
    if (!tenantId || !nodeAId || !nodeBId || !decidedBy) {
        res.status(400).json({ error: 'tenantId, nodeAId, nodeBId, and decidedBy are required' });
        return;
    }
    const cluster = await ResolutionService_js_1.resolutionService.manualMerge(tenantId, nodeAId, nodeBId, decidedBy, notes);
    res.json(cluster);
}));
router.post('/unmerge/:id', asyncHandler(async (req, res) => {
    // Stub implementation: Reversible unmerge
    // In a real implementation, this would fetch the merge record and invert it
    // For now, we return a success response with the new decision
    // Log intent to append a new record with decision=NO_MERGE and valid_from=now
    logger.info({ id: req.params.id }, 'Processing unmerge request');
    res.json({
        ok: true,
        id: req.params.id,
        decision: 'NO_MERGE',
        timestamp: new Date().toISOString()
    });
}));
// =============================================================================
// Explainability API
// =============================================================================
router.get('/api/v1/explain/:nodeAId/:nodeBId', asyncHandler(async (req, res) => {
    const result = await ResolutionService_js_1.resolutionService.explainMatch(req.params.nodeAId, req.params.nodeBId);
    res.json(result);
}));
router.get('/api/v1/why-linked/:nodeAId/:nodeBId', asyncHandler(async (req, res) => {
    const [nodeA, nodeB] = await Promise.all([
        IdentityNodeRepository_js_1.identityNodeRepository.getById(req.params.nodeAId),
        IdentityNodeRepository_js_1.identityNodeRepository.getById(req.params.nodeBId),
    ]);
    if (!nodeA || !nodeB) {
        res.status(404).json({ error: 'One or both nodes not found' });
        return;
    }
    // Find cluster and path
    let path = [];
    if (nodeA.clusterId && nodeA.clusterId === nodeB.clusterId) {
        const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(nodeA.clusterId);
        if (cluster) {
            const directEdge = cluster.edges.find((e) => (e.nodeAId === nodeA.nodeId && e.nodeBId === nodeB.nodeId) ||
                (e.nodeAId === nodeB.nodeId && e.nodeBId === nodeA.nodeId));
            if (directEdge)
                path = [directEdge];
        }
    }
    const response = ExplainabilityService_js_1.explainabilityService.generateWhyLinkedResponse(nodeA, nodeB, path);
    res.json({ explanation: response, path });
}));
// =============================================================================
// Review Queue API
// =============================================================================
router.get('/api/v1/reviews', asyncHandler(async (req, res) => {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
    }
    const items = await ReviewQueueRepository_js_1.reviewQueueRepository.search({
        tenantId,
        status: req.query.status,
        entityType: req.query.entityType,
        priority: req.query.priority,
        assignedTo: req.query.assignedTo,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({ items, count: items.length });
}));
router.get('/api/v1/reviews/:reviewId', asyncHandler(async (req, res) => {
    const item = await ReviewQueueRepository_js_1.reviewQueueRepository.getById(req.params.reviewId);
    if (!item) {
        res.status(404).json({ error: 'Review item not found' });
        return;
    }
    res.json(item);
}));
router.post('/api/v1/reviews/:reviewId/assign', asyncHandler(async (req, res) => {
    const { assignedTo } = req.body;
    if (!assignedTo) {
        res.status(400).json({ error: 'assignedTo is required' });
        return;
    }
    await ReviewQueueRepository_js_1.reviewQueueRepository.assign(req.params.reviewId, assignedTo);
    const item = await ReviewQueueRepository_js_1.reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
}));
router.post('/api/v1/reviews/:reviewId/decide', asyncHandler(async (req, res) => {
    const { decision, decidedBy, notes } = req.body;
    if (!decision || !decidedBy) {
        res.status(400).json({ error: 'decision and decidedBy are required' });
        return;
    }
    const parseResult = index_js_1.MatchDecisionSchema.safeParse(decision);
    if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid decision value' });
        return;
    }
    await ResolutionService_js_1.resolutionService.processReviewDecision(req.params.reviewId, parseResult.data, decidedBy, notes);
    const item = await ReviewQueueRepository_js_1.reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
}));
router.post('/api/v1/reviews/:reviewId/escalate', asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
        res.status(400).json({ error: 'reason is required' });
        return;
    }
    await ReviewQueueRepository_js_1.reviewQueueRepository.escalate(req.params.reviewId, reason);
    const item = await ReviewQueueRepository_js_1.reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
}));
router.get('/api/v1/reviews/stats/:tenantId', asyncHandler(async (req, res) => {
    const stats = await ReviewQueueRepository_js_1.reviewQueueRepository.getStats(req.params.tenantId);
    res.json(stats);
}));
// =============================================================================
// Batch Processing API
// =============================================================================
router.post('/api/v1/batch', asyncHandler(async (req, res) => {
    const { tenantId, entityType, datasetRef, records, thresholds, createdBy } = req.body;
    if (!tenantId || !entityType || !datasetRef || !records?.length || !createdBy) {
        res.status(400).json({
            error: 'tenantId, entityType, datasetRef, records, and createdBy are required',
        });
        return;
    }
    const job = await BatchProcessor_js_1.batchProcessor.submitBatch({
        tenantId,
        entityType,
        datasetRef,
        records,
        thresholds,
        createdBy,
    });
    res.status(202).json(job);
}));
router.get('/api/v1/batch/:jobId', asyncHandler(async (req, res) => {
    const job = await BatchProcessor_js_1.batchProcessor.getJobStatus(req.params.jobId);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json(job);
}));
router.get('/api/v1/batch/:jobId/results', asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const results = await BatchProcessor_js_1.batchProcessor.getResults(req.params.jobId, limit, offset);
    res.json({ results, count: results.length });
}));
router.post('/api/v1/batch/:jobId/cancel', asyncHandler(async (req, res) => {
    await BatchProcessor_js_1.batchProcessor.cancelJob(req.params.jobId);
    const job = await BatchProcessor_js_1.batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
}));
router.post('/api/v1/batch/:jobId/pause', asyncHandler(async (req, res) => {
    await BatchProcessor_js_1.batchProcessor.pauseJob(req.params.jobId);
    const job = await BatchProcessor_js_1.batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
}));
router.post('/api/v1/batch/:jobId/resume', asyncHandler(async (req, res) => {
    await BatchProcessor_js_1.batchProcessor.resumeJob(req.params.jobId);
    const job = await BatchProcessor_js_1.batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
}));
// =============================================================================
// Metrics API
// =============================================================================
router.get('/api/v1/metrics/:tenantId', asyncHandler(async (req, res) => {
    const entityType = req.query.entityType;
    const [clusterStats, reviewStats] = await Promise.all([
        IdentityClusterRepository_js_1.identityClusterRepository.getStats(req.params.tenantId, entityType),
        ReviewQueueRepository_js_1.reviewQueueRepository.getStats(req.params.tenantId),
    ]);
    res.json({
        clusters: clusterStats,
        reviews: reviewStats,
        timestamp: new Date().toISOString(),
    });
}));
// =============================================================================
// Error Handler
// =============================================================================
router.use((err, req, res, next) => {
    logger.error({ err, path: req.path, method: req.method }, 'API error');
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
