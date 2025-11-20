import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { EREngine } from '../core/er-engine.js';
import {
  CandidateRequestSchema,
  MergeRequestSchema,
  SplitRequestSchema,
} from '../types.js';
import pino from 'pino';

const logger = pino({ name: 'er-api' });

/**
 * Validation middleware
 */
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create API routes
 */
export function createRoutes(engine: EREngine): Router {
  const router = Router();

  /**
   * POST /candidates - Find candidate matches
   */
  router.post(
    '/candidates',
    validate(CandidateRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = engine.candidates(req.body);
        logger.info(
          { requestId: result.requestId, candidateCount: result.candidates.length },
          'Candidates found',
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /merge - Merge entities
   */
  router.post(
    '/merge',
    validate(MergeRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = engine.merge(req.body);
        logger.info(
          { mergeId: result.mergeId, entityCount: result.mergedIds.length + 1 },
          'Entities merged',
        );
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /merge/:mergeId/revert - Revert a merge
   */
  router.post(
    '/merge/:mergeId/revert',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { mergeId } = req.params;
        const { actor, reason } = req.body;

        if (!actor || !reason) {
          res.status(400).json({
            error: 'Missing required fields: actor, reason',
          });
          return;
        }

        engine.revertMerge(mergeId, actor, reason);
        logger.info({ mergeId, actor }, 'Merge reverted');
        res.json({ success: true, mergeId });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /split - Split an entity
   */
  router.post(
    '/split',
    validate(SplitRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = engine.split(req.body);
        logger.info(
          { splitId: result.splitId, newEntityCount: result.newEntityIds.length },
          'Entity split',
        );
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /explain/:mergeId - Explain a merge decision
   */
  router.get(
    '/explain/:mergeId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { mergeId } = req.params;
        const explanation = engine.explain(mergeId);
        res.json(explanation);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /merge/:mergeId - Get merge record
   */
  router.get(
    '/merge/:mergeId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { mergeId } = req.params;
        const merge = engine.getMerge(mergeId);
        if (!merge) {
          res.status(404).json({ error: 'Merge not found' });
          return;
        }
        res.json(merge);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /split/:splitId - Get split record
   */
  router.get(
    '/split/:splitId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { splitId } = req.params;
        const split = engine.getSplit(splitId);
        if (!split) {
          res.status(404).json({ error: 'Split not found' });
          return;
        }
        res.json(split);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /audit - Get audit log
   */
  router.get(
    '/audit',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId, actor, event, limit } = req.query;

        const log = engine.getAuditLog({
          tenantId: tenantId as string,
          actor: actor as string,
          event: event as 'merge' | 'revert' | 'split',
          limit: limit ? parseInt(limit as string) : undefined,
        });

        res.json({ entries: log, count: log.length });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /stats - Get statistics
   */
  router.get('/stats', async (_req: Request, res: Response) => {
    const stats = engine.getStats();
    res.json(stats);
  });

  /**
   * GET /health - Health check
   */
  router.get('/health', async (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return router;
}
