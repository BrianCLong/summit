/**
 * Debrief Routes
 *
 * REST API endpoints for debrief workflow management.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ServiceContext } from '../context.js';
import { DebriefService } from '../services/DebriefService.js';
import { requireRoles, requireClearance } from '../middleware/auth.js';
import { DebriefSearchCriteriaSchema } from '@intelgraph/humint-types';

export function createDebriefRoutes(ctx: ServiceContext): Router {
  const router = Router();
  const debriefService = new DebriefService(ctx);

  /**
   * Schedule a new debrief
   * POST /api/v1/debriefs
   */
  router.post(
    '/',
    requireRoles('handler', 'admin'),
    requireClearance('SECRET'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.scheduleDebrief(
          req.body,
          req.user!.id,
          req.tenantId!,
        );
        res.status(201).json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get debrief by ID
   * GET /api/v1/debriefs/:id
   */
  router.get(
    '/:id',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.getDebrief(
          req.params.id,
          req.tenantId!,
        );
        res.json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Search debriefs
   * GET /api/v1/debriefs
   */
  router.get(
    '/',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const criteria = DebriefSearchCriteriaSchema.parse({
          sourceId: req.query.sourceId,
          handlerId: req.query.handlerId,
          debriefTypes: req.query.debriefTypes
            ? (req.query.debriefTypes as string).split(',')
            : undefined,
          statuses: req.query.statuses
            ? (req.query.statuses as string).split(',')
            : undefined,
          scheduledAfter: req.query.scheduledAfter
            ? new Date(req.query.scheduledAfter as string)
            : undefined,
          scheduledBefore: req.query.scheduledBefore
            ? new Date(req.query.scheduledBefore as string)
            : undefined,
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        });

        const result = await debriefService.searchDebriefs(criteria, req.tenantId!);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Start debrief session
   * POST /api/v1/debriefs/:id/start
   */
  router.post(
    '/:id/start',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.startDebrief(
          { id: req.params.id, startedAt: new Date() },
          req.user!.id,
          req.tenantId!,
        );
        res.json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Update debrief in progress
   * PATCH /api/v1/debriefs/:id
   */
  router.patch(
    '/:id',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.updateDebrief(
          { id: req.params.id, ...req.body },
          req.user!.id,
          req.tenantId!,
        );
        res.json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Complete debrief session
   * POST /api/v1/debriefs/:id/complete
   */
  router.post(
    '/:id/complete',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.completeDebrief(
          { id: req.params.id, ...req.body, endedAt: new Date() },
          req.user!.id,
          req.tenantId!,
        );
        res.json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Review/approve debrief
   * POST /api/v1/debriefs/:id/review
   */
  router.post(
    '/:id/review',
    requireRoles('supervisor', 'admin'),
    requireClearance('TOP_SECRET'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const debrief = await debriefService.reviewDebrief(
          { id: req.params.id, ...req.body },
          req.user!.id,
          req.tenantId!,
        );
        res.json(debrief);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Generate debrief report
   * GET /api/v1/debriefs/:id/report
   */
  router.get(
    '/:id/report',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const report = await debriefService.generateReport(
          req.params.id,
          req.tenantId!,
        );
        res.json(report);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
