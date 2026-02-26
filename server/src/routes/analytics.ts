import { Router } from 'express';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { logger } from '../config/logger.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import { dpEngine } from '../privacy/dp/DifferentialPrivacyEngine.js';
import { handleTelemetryEvent } from '../analytics/telemetry/TelemetryController.js';

const router = Router();
const analyticsService = AnalyticsService.getInstance();

// All analytics routes require authentication and appropriate roles
router.use(ensureAuthenticated);
router.use(ensureRole(['ADMIN', 'admin', 'ANALYST', 'analyst']));

// Helper to handle async route errors
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @route GET /analytics/path
 * @desc Calculate paths (shortest, k-paths)
 */
router.get(
  '/path',
  asyncHandler(async (req: any, res: any) => {
    const sourceId = req.query.sourceId as string;
    const targetId = req.query.targetId as string;
    const algorithm = req.query.algorithm as 'shortest' | 'k-paths' | undefined;
    const { k, maxDepth } = req.query;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const result = await analyticsService.findPaths(
      sourceId,
      targetId,
      algorithm || 'shortest',
      { k, maxDepth }
    );
    res.json(result);
  })
);

/**
 * @route GET /analytics/community
 * @desc Detect communities (Privacy-Preserving)
 */
router.get(
  '/community',
  asyncHandler(async (req: any, res: any) => {
    const algorithm = req.query.algorithm as 'louvain' | 'leiden' | 'lpa' | undefined;
    const dp = (req.query.dp as string) || 'true';
    const result = await analyticsService.detectCommunities(
      algorithm || 'lpa'
    );

    // Apply Differential Privacy to community sizes if enabled
    if (dp === 'true' && result.communities) {
      result.communities = result.communities.map((c: any) => ({
        ...c,
        size: dpEngine.privatizeAggregate(c.size, { epsilon: 0.5 }),
        isPrivatized: true
      }));
    }

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
    const algorithm = req.query.algorithm as 'betweenness' | 'eigenvector' | undefined;
    const limit = req.query.limit;
    const result = await analyticsService.calculateCentrality(
      algorithm || 'betweenness',
      { limit: limit ? parseInt(limit as string) : 20 }
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
    const type = req.query.type as 'temporal-motifs' | 'co-travel' | 'financial-structuring' | undefined;
    if (!type) {
      return res.status(400).json({ error: 'Pattern type is required (temporal-motifs, co-travel, financial-structuring)' });
    }
    const result = await analyticsService.minePatterns(
      type
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
    const type = req.query.type as 'degree' | 'temporal-spike' | 'selector-misuse' | undefined;
    if (!type) {
      return res.status(400).json({ error: 'Anomaly type is required (degree, temporal-spike, selector-misuse)' });
    }
    const result = await analyticsService.detectAnomalies(
      type
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
