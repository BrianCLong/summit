/**
 * Validation Routes
 *
 * REST API endpoints for HUMINT validation and compliance checking.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ServiceContext } from '../context.js';
import { ValidationService } from '../services/ValidationService.js';
import { requireRoles } from '../middleware/auth.js';

export function createValidationRoutes(ctx: ServiceContext): Router {
  const router = Router();
  const validationService = new ValidationService(ctx);

  /**
   * Validate source
   * POST /api/v1/validation/source
   */
  router.post(
    '/source',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await validationService.validateSource(req.body);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Validate debrief
   * POST /api/v1/validation/debrief
   */
  router.post(
    '/debrief',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await validationService.validateDebrief(req.body);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Validate intelligence item
   * POST /api/v1/validation/intelligence
   */
  router.post(
    '/intelligence',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = validationService.validateIntelligenceItem(req.body);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Assess source credibility
   * GET /api/v1/validation/credibility/:sourceId
   */
  router.get(
    '/credibility/:sourceId',
    requireRoles('handler', 'analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const assessment = await validationService.assessCredibility(
          req.params.sourceId,
          req.tenantId!,
        );
        res.json(assessment);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Check source compliance
   * GET /api/v1/validation/compliance/:sourceId
   */
  router.get(
    '/compliance/:sourceId',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const check = await validationService.checkCompliance(
          req.params.sourceId,
          req.tenantId!,
        );
        res.json(check);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Validate state transition
   * POST /api/v1/validation/transition
   */
  router.post(
    '/transition',
    requireRoles('handler', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { currentStatus, targetStatus, entityType } = req.body;
        const result = validationService.validateStateTransition(
          currentStatus,
          targetStatus,
          entityType,
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Batch validate sources
   * POST /api/v1/validation/batch/sources
   */
  router.post(
    '/batch/sources',
    requireRoles('analyst', 'admin'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sourceIds } = req.body;
        const results = await validationService.batchValidateSources(
          sourceIds,
          req.tenantId!,
        );
        res.json(Object.fromEntries(results));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
