import { Router } from 'express';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { logger } from '../config/logger.js';
import { handleTelemetryEvent } from '../analytics/telemetry/TelemetryController.js';

const router = Router();
const analyticsService = AnalyticsService.getInstance();

// Helper to handle async route errors
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const singleQueryParam = (value: any): string =>
  Array.isArray(value) ? value[0] : (value as string) || '';

/**
 * @route GET /analytics/path
 * @desc Calculate paths (shortest, k-paths)
 */
router.get(
  '/path',
  asyncHandler(async (req: any, res: any) => {
    const sourceId = singleQueryParam(req.query.sourceId);
    const targetId = singleQueryParam(req.query.targetId);
    const algorithm = singleQueryParam(req.query.algorithm);
    const k = req.query.k ? parseInt(singleQueryParam(req.query.k)) : undefined;
    const maxDepth = req.query.maxDepth ? parseInt(singleQueryParam(req.query.maxDepth)) : undefined;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const result = await analyticsService.findPaths(
      sourceId,
      targetId,
      (algorithm as 'shortest' | 'k-paths') || 'shortest',
      { k, maxDepth }
    );
    res.json(result);
  })
);

/**
 * @route GET /analytics/community
 * @desc Detect communities
 */
router.get(
  '/community',
  asyncHandler(async (req: any, res: any) => {
    const algorithm = singleQueryParam(req.query.algorithm);
    const result = await analyticsService.detectCommunities(
      (algorithm as 'louvain' | 'leiden' | 'lpa') || 'lpa'
    );
    res.json(result);
  })
);

/**
 * @route GET /analytics/centrality
 * @desc Calculate centrality metrics
 */
router.get(
  '/centrality',
  asyncHandler(async (req: any, res: any) => {
    const algorithm = singleQueryParam(req.query.algorithm);
    const limit = singleQueryParam(req.query.limit);
    const result = await analyticsService.calculateCentrality(
      (algorithm as 'betweenness' | 'eigenvector') || 'betweenness',
      { limit: limit ? parseInt(limit) : 20 }
    );
    res.json(result);
  })
);

/**
 * @route GET /analytics/patterns
 * @desc Mine graph patterns
 */
router.get(
  '/patterns',
  asyncHandler(async (req: any, res: any) => {
    const type = singleQueryParam(req.query.type);
    if (!type) {
      return res.status(400).json({ error: 'Pattern type is required (temporal-motifs, co-travel, financial-structuring)' });
    }
    const result = await analyticsService.minePatterns(
      type as 'temporal-motifs' | 'co-travel' | 'financial-structuring'
    );
    res.json(result);
  })
);

/**
 * @route GET /analytics/anomaly
 * @desc Detect anomalies (Graph-based)
 */
router.get(
  '/anomaly',
  asyncHandler(async (req: any, res: any) => {
    const type = singleQueryParam(req.query.type);
    if (!type) {
      return res.status(400).json({ error: 'Anomaly type is required (degree, temporal-spike, selector-misuse)' });
    }
    const result = await analyticsService.detectAnomalies(
      type as 'degree' | 'temporal-spike' | 'selector-misuse'
    );
    res.json(result);
  })
);

/**
 * @route POST /analytics/event
 * @desc Ingest internal telemetry events
 */
router.post('/event', handleTelemetryEvent);

export default router;
