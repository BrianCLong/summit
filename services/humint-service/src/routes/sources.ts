/**
 * Source Routes
 *
 * REST API endpoints for HUMINT source management.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ServiceContext } from '../context.js';
import { SourceService } from '../services/SourceService.js';
import { requireRoles, requireClearance } from '../middleware/auth.js';
import { CreateSourceSchema, UpdateSourceSchema, SourceSearchCriteriaSchema } from '@intelgraph/humint-types';

export function createSourceRoutes(ctx: ServiceContext): Router {
  const router = Router();
  const sourceService = new SourceService(ctx);

  /**
   * Create a new source
   * POST /api/v1/sources
   */
  router.post(
    '/',
    requireRoles('handler', 'admin'),
    requireClearance('SECRET'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const source = await sourceService.createSource(
          req.body,
          req.user!.id,
          req.tenantId!,
        );
        res.status(201).json(source);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get source by ID
   * GET /api/v1/sources/:id
   */
  router.get(
    '/:id',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const source = await sourceService.getSource(req.params.id, req.tenantId!);
        res.json(source);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Update source
   * PATCH /api/v1/sources/:id
   */
  router.patch(
    '/:id',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const source = await sourceService.updateSource(
          { id: req.params.id, ...req.body },
          req.user!.id,
          req.tenantId!,
        );
        res.json(source);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Search sources
   * GET /api/v1/sources
   */
  router.get(
    '/',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const criteria = SourceSearchCriteriaSchema.parse({
          cryptonym: req.query.cryptonym,
          sourceTypes: req.query.sourceTypes
            ? (req.query.sourceTypes as string).split(',')
            : undefined,
          statuses: req.query.statuses
            ? (req.query.statuses as string).split(',')
            : undefined,
          handlerId: req.query.handlerId,
          minCredibilityScore: req.query.minCredibilityScore
            ? Number(req.query.minCredibilityScore)
            : undefined,
          maxCredibilityScore: req.query.maxCredibilityScore
            ? Number(req.query.maxCredibilityScore)
            : undefined,
          riskLevels: req.query.riskLevels
            ? (req.query.riskLevels as string).split(',')
            : undefined,
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
          sortBy: req.query.sortBy as string,
          sortOrder: req.query.sortOrder as 'asc' | 'desc',
        });

        const result = await sourceService.searchSources(criteria, req.tenantId!);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get source statistics
   * GET /api/v1/sources/stats
   */
  router.get(
    '/stats/summary',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const stats = await sourceService.getStatistics(req.tenantId!);
        res.json(stats);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Record contact with source
   * POST /api/v1/sources/:id/contact
   */
  router.post(
    '/:id/contact',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await sourceService.recordContact(
          req.params.id,
          req.user!.id,
          req.tenantId!,
        );
        res.json({ success: true, message: 'Contact recorded' });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Terminate source
   * POST /api/v1/sources/:id/terminate
   */
  router.post(
    '/:id/terminate',
    requireRoles('admin'),
    requireClearance('TOP_SECRET'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { reason } = req.body;
        if (!reason) {
          res.status(400).json({ error: 'Termination reason required' });
          return;
        }

        const source = await sourceService.terminateSource(
          req.params.id,
          reason,
          req.user!.id,
          req.tenantId!,
        );
        res.json(source);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
