/**
 * Asset Tracking Routes
 *
 * REST API endpoints for HUMINT asset tracking and graph integration.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ServiceContext } from '../context.js';
import { AssetTrackingService } from '../services/AssetTrackingService.js';
import { requireRoles, requireClearance } from '../middleware/auth.js';
import { AssetTrackingQuerySchema } from '@intelgraph/humint-types';

export function createAssetTrackingRoutes(ctx: ServiceContext): Router {
  const router = Router();
  const assetService = new AssetTrackingService(ctx);

  /**
   * Record asset activity
   * POST /api/v1/asset-tracking/activities
   */
  router.post(
    '/activities',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const activity = await assetService.recordActivity(
          req.body,
          req.user!.id,
          req.tenantId!,
        );
        res.status(201).json(activity);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Create risk indicator
   * POST /api/v1/asset-tracking/risk-indicators
   */
  router.post(
    '/risk-indicators',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const indicator = await assetService.createRiskIndicator(
          req.body,
          req.user!.id,
          req.tenantId!,
        );
        res.status(201).json(indicator);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Create graph link
   * POST /api/v1/asset-tracking/graph-links
   */
  router.post(
    '/graph-links',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const link = await assetService.createGraphLink(
          req.body,
          req.user!.id,
          req.tenantId!,
        );
        res.status(201).json(link);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get asset dashboard
   * GET /api/v1/asset-tracking/dashboard/:sourceId
   */
  router.get(
    '/dashboard/:sourceId',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dashboard = await assetService.getAssetDashboard(
          req.params.sourceId,
          req.tenantId!,
        );
        res.json(dashboard);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Query assets
   * GET /api/v1/asset-tracking
   */
  router.get(
    '/',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const criteria = AssetTrackingQuerySchema.parse({
          sourceIds: req.query.sourceIds
            ? (req.query.sourceIds as string).split(',')
            : undefined,
          statuses: req.query.statuses
            ? (req.query.statuses as string).split(',')
            : undefined,
          riskLevels: req.query.riskLevels
            ? (req.query.riskLevels as string).split(',')
            : undefined,
          hasActiveIndicators: req.query.hasActiveIndicators === 'true',
          handlerId: req.query.handlerId as string,
          includeActivities: req.query.includeActivities === 'true',
          includeGraphLinks: req.query.includeGraphLinks === 'true',
          includeRiskIndicators: req.query.includeRiskIndicators === 'true',
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        });

        const result = await assetService.queryAssets(criteria, req.tenantId!);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Analyze source network
   * GET /api/v1/asset-tracking/network/:sourceId
   */
  router.get(
    '/network/:sourceId',
    requireRoles('analyst', 'admin'),
    requireClearance('SECRET'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const depth = req.query.depth ? Number(req.query.depth) : 2;
        const analysis = await assetService.analyzeNetwork(
          req.params.sourceId,
          depth,
          req.tenantId!,
        );
        res.json(analysis);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Find path between source and entity
   * GET /api/v1/asset-tracking/path/:sourceId/:targetId
   */
  router.get(
    '/path/:sourceId/:targetId',
    requireRoles('analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const maxHops = req.query.maxHops ? Number(req.query.maxHops) : 5;
        const result = await assetService.findPath(
          req.params.sourceId,
          req.params.targetId,
          maxHops,
          req.tenantId!,
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
