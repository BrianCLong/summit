/**
 * API Routes
 *
 * REST API endpoints for the Entity Resolution service.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { ResolutionService, resolutionService } from '../core/ResolutionService.js';
import { identityNodeRepository } from '../db/IdentityNodeRepository.js';
import { identityClusterRepository } from '../db/IdentityClusterRepository.js';
import { reviewQueueRepository } from '../db/ReviewQueueRepository.js';
import { batchProcessor } from '../batch/BatchProcessor.js';
import { explainabilityService } from '../explainability/ExplainabilityService.js';
import {
  ResolveNowRequestSchema,
  EntityTypeSchema,
  MatchDecisionSchema,
  ReviewStatusSchema,
  ReviewPrioritySchema,
} from '../types/index.js';

const logger = pino({ name: 'ERApi' });

const router = Router();

// =============================================================================
// Middleware
// =============================================================================

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
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

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'er-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.get('/info', (req: Request, res: Response) => {
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

router.post(
  '/api/v1/resolve',
  validateBody(ResolveNowRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await resolutionService.resolveNow(req.body);
    res.json(result);
  })
);

// =============================================================================
// Cluster Management API
// =============================================================================

router.get(
  '/api/v1/clusters/:clusterId',
  asyncHandler(async (req: Request, res: Response) => {
    const cluster = await identityClusterRepository.getById(req.params.clusterId);
    if (!cluster) {
      res.status(404).json({ error: 'Cluster not found' });
      return;
    }
    res.json(cluster);
  })
);

router.get(
  '/api/v1/clusters',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const clusters = await identityClusterRepository.search({
      tenantId,
      entityType: req.query.entityType as string | undefined as import('../types/index.js').EntityType | undefined,
      minSize: req.query.minSize ? parseInt(req.query.minSize as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });

    res.json({ clusters, count: clusters.length });
  })
);

router.post(
  '/api/v1/clusters/:clusterId/merge',
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceClusterId, decidedBy, notes } = req.body;

    if (!sourceClusterId || !decidedBy) {
      res.status(400).json({ error: 'sourceClusterId and decidedBy are required' });
      return;
    }

    const cluster = await identityClusterRepository.merge(
      req.params.clusterId,
      sourceClusterId,
      decidedBy,
      notes ?? 'Manual merge via API'
    );

    res.json(cluster);
  })
);

router.post(
  '/api/v1/clusters/:clusterId/split',
  asyncHandler(async (req: Request, res: Response) => {
    const { nodeIds, splitBy, reason } = req.body;

    if (!nodeIds?.length || !splitBy || !reason) {
      res.status(400).json({ error: 'nodeIds, splitBy, and reason are required' });
      return;
    }

    const clusters = await identityClusterRepository.split(
      req.params.clusterId,
      nodeIds,
      splitBy,
      reason
    );

    res.json({ clusters });
  })
);

router.get(
  '/api/v1/clusters/:clusterId/explain',
  asyncHandler(async (req: Request, res: Response) => {
    const cluster = await identityClusterRepository.getById(req.params.clusterId);
    if (!cluster) {
      res.status(404).json({ error: 'Cluster not found' });
      return;
    }

    const nodes = await identityNodeRepository.getByClusterId(cluster.clusterId);
    const explanation = explainabilityService.explainCluster({ cluster, nodes });

    res.json(explanation);
  })
);

// =============================================================================
// Node Management API
// =============================================================================

router.get(
  '/api/v1/nodes/:nodeId',
  asyncHandler(async (req: Request, res: Response) => {
    const node = await identityNodeRepository.getById(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    res.json(node);
  })
);

router.get(
  '/api/v1/nodes/:nodeId/cluster',
  asyncHandler(async (req: Request, res: Response) => {
    const cluster = await resolutionService.getClusterForNode(req.params.nodeId);
    if (!cluster) {
      res.status(404).json({ error: 'Node has no cluster assignment' });
      return;
    }
    res.json(cluster);
  })
);

router.post(
  '/api/v1/nodes/merge',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, nodeAId, nodeBId, decidedBy, notes } = req.body;

    if (!tenantId || !nodeAId || !nodeBId || !decidedBy) {
      res.status(400).json({ error: 'tenantId, nodeAId, nodeBId, and decidedBy are required' });
      return;
    }

    const cluster = await resolutionService.manualMerge(
      tenantId,
      nodeAId,
      nodeBId,
      decidedBy,
      notes
    );

    res.json(cluster);
  })
);

// =============================================================================
// Explainability API
// =============================================================================

router.get(
  '/api/v1/explain/:nodeAId/:nodeBId',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await resolutionService.explainMatch(
      req.params.nodeAId,
      req.params.nodeBId
    );
    res.json(result);
  })
);

router.get(
  '/api/v1/why-linked/:nodeAId/:nodeBId',
  asyncHandler(async (req: Request, res: Response) => {
    const [nodeA, nodeB] = await Promise.all([
      identityNodeRepository.getById(req.params.nodeAId),
      identityNodeRepository.getById(req.params.nodeBId),
    ]);

    if (!nodeA || !nodeB) {
      res.status(404).json({ error: 'One or both nodes not found' });
      return;
    }

    // Find cluster and path
    let path: import('../types/index.js').MatchEdge[] = [];
    if (nodeA.clusterId && nodeA.clusterId === nodeB.clusterId) {
      const cluster = await identityClusterRepository.getById(nodeA.clusterId);
      if (cluster) {
        const directEdge = cluster.edges.find(
          (e) =>
            (e.nodeAId === nodeA.nodeId && e.nodeBId === nodeB.nodeId) ||
            (e.nodeAId === nodeB.nodeId && e.nodeBId === nodeA.nodeId)
        );
        if (directEdge) path = [directEdge];
      }
    }

    const response = explainabilityService.generateWhyLinkedResponse(nodeA, nodeB, path);
    res.json({ explanation: response, path });
  })
);

// =============================================================================
// Review Queue API
// =============================================================================

router.get(
  '/api/v1/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const items = await reviewQueueRepository.search({
      tenantId,
      status: req.query.status as import('../types/index.js').ReviewStatus | undefined,
      entityType: req.query.entityType as import('../types/index.js').EntityType | undefined,
      priority: req.query.priority as import('../types/index.js').ReviewPriority | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });

    res.json({ items, count: items.length });
  })
);

router.get(
  '/api/v1/reviews/:reviewId',
  asyncHandler(async (req: Request, res: Response) => {
    const item = await reviewQueueRepository.getById(req.params.reviewId);
    if (!item) {
      res.status(404).json({ error: 'Review item not found' });
      return;
    }
    res.json(item);
  })
);

router.post(
  '/api/v1/reviews/:reviewId/assign',
  asyncHandler(async (req: Request, res: Response) => {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      res.status(400).json({ error: 'assignedTo is required' });
      return;
    }

    await reviewQueueRepository.assign(req.params.reviewId, assignedTo);
    const item = await reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
  })
);

router.post(
  '/api/v1/reviews/:reviewId/decide',
  asyncHandler(async (req: Request, res: Response) => {
    const { decision, decidedBy, notes } = req.body;

    if (!decision || !decidedBy) {
      res.status(400).json({ error: 'decision and decidedBy are required' });
      return;
    }

    const parseResult = MatchDecisionSchema.safeParse(decision);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid decision value' });
      return;
    }

    await resolutionService.processReviewDecision(
      req.params.reviewId,
      parseResult.data,
      decidedBy,
      notes
    );

    const item = await reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
  })
);

router.post(
  '/api/v1/reviews/:reviewId/escalate',
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    await reviewQueueRepository.escalate(req.params.reviewId, reason);
    const item = await reviewQueueRepository.getById(req.params.reviewId);
    res.json(item);
  })
);

router.get(
  '/api/v1/reviews/stats/:tenantId',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await reviewQueueRepository.getStats(req.params.tenantId);
    res.json(stats);
  })
);

// =============================================================================
// Batch Processing API
// =============================================================================

router.post(
  '/api/v1/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, entityType, datasetRef, records, thresholds, createdBy } = req.body;

    if (!tenantId || !entityType || !datasetRef || !records?.length || !createdBy) {
      res.status(400).json({
        error: 'tenantId, entityType, datasetRef, records, and createdBy are required',
      });
      return;
    }

    const job = await batchProcessor.submitBatch({
      tenantId,
      entityType,
      datasetRef,
      records,
      thresholds,
      createdBy,
    });

    res.status(202).json(job);
  })
);

router.get(
  '/api/v1/batch/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await batchProcessor.getJobStatus(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  })
);

router.get(
  '/api/v1/batch/:jobId/results',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const results = await batchProcessor.getResults(req.params.jobId, limit, offset);
    res.json({ results, count: results.length });
  })
);

router.post(
  '/api/v1/batch/:jobId/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    await batchProcessor.cancelJob(req.params.jobId);
    const job = await batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
  })
);

router.post(
  '/api/v1/batch/:jobId/pause',
  asyncHandler(async (req: Request, res: Response) => {
    await batchProcessor.pauseJob(req.params.jobId);
    const job = await batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
  })
);

router.post(
  '/api/v1/batch/:jobId/resume',
  asyncHandler(async (req: Request, res: Response) => {
    await batchProcessor.resumeJob(req.params.jobId);
    const job = await batchProcessor.getJobStatus(req.params.jobId);
    res.json(job);
  })
);

// =============================================================================
// Metrics API
// =============================================================================

router.get(
  '/api/v1/metrics/:tenantId',
  asyncHandler(async (req: Request, res: Response) => {
    const entityType = req.query.entityType as import('../types/index.js').EntityType | undefined;

    const [clusterStats, reviewStats] = await Promise.all([
      identityClusterRepository.getStats(req.params.tenantId, entityType),
      reviewQueueRepository.getStats(req.params.tenantId),
    ]);

    res.json({
      clusters: clusterStats,
      reviews: reviewStats,
      timestamp: new Date().toISOString(),
    });
  })
);

// =============================================================================
// Error Handler
// =============================================================================

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'API error');
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

export { router as apiRouter };
