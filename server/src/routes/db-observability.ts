import express from 'express';
import { z } from 'zod';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import { rateLimiter } from '../services/RateLimiter.js';
import { DbObservabilityService } from '../observability/db-observability.js';

const limiterWindowMs = 60_000;
const limiterMaxRequests = 5;

const SnapshotRequestSchema = z.object({
  explain: z
    .object({
      queryId: z.string(),
      parameters: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })
    .optional(),
});

export function buildDbObservabilityRouter(service = new DbObservabilityService()) {
  const router = express.Router();
  router.use(express.json());
  router.use(ensureAuthenticated);
  router.use(ensureRole('admin'));

  router.post('/snapshot', async (req, res, next) => {
    try {
      const limiterKey = `dbobs:${(req as any).user?.id || req.ip}`;
      const limitResult = await rateLimiter.consume(
        limiterKey,
        1,
        limiterMaxRequests,
        limiterWindowMs,
      );

      res.set('X-DbObservability-Limit', String(limitResult.total));
      res.set('X-DbObservability-Remaining', String(limitResult.remaining));
      res.set('X-DbObservability-Reset', String(Math.ceil(limitResult.reset / 1000)));

      if (!limitResult.allowed) {
        res.status(429).json({
          error: 'Too many DB observability requests, please pause before retrying',
          retryAfterSeconds: Math.ceil((limitResult.reset - Date.now()) / 1000),
        });
        return;
      }

      const parsed = SnapshotRequestSchema.parse(req.body ?? {});
      const snapshot = await service.snapshot(
        parsed.explain ? { explain: parsed.explain } : {},
        {
          userId: (req as any).user?.id || (req as any).user?.sub,
          tenantId: (req as any).user?.tenantId,
          correlationId: (req as any).correlationId || req.headers['x-correlation-id'],
          requestId: (req as any).id,
        },
      );

      res.json({
        feature: 'DB_OBSERVABILITY_V2',
        data: snapshot,
      });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}

export default buildDbObservabilityRouter();
