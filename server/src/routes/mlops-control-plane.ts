import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { opaClient } from '../services/opa-client.js';
import { MLOpsControlPlaneService } from '../services/mlops-control-plane/controlPlaneService.js';
import type { InferRequest } from '../services/mlops-control-plane/types.js';

const TrainBaseSchema = z.object({
  entityId: z.string().min(1),
  baseModelVersion: z.string().min(1),
  features: z.record(z.unknown()).optional(),
});

const TrainDerivedSchema = z.object({
  entityId: z.string().min(1),
  baseModelVersion: z.string().min(1),
  derivedModelVersion: z.string().min(1),
  features: z.record(z.unknown()).optional(),
});

const InferSchema = z.object({
  entityId: z.string().min(1),
  modelVersion: z.string().min(1),
  features: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
});

const MLOPS_TRAIN_WINDOW_MS = Number(
  process.env.MLOPS_TRAIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const MLOPS_TRAIN_MAX = Number(process.env.MLOPS_TRAIN_RATE_LIMIT_MAX || 20);
const MLOPS_INFER_WINDOW_MS = Number(
  process.env.MLOPS_INFER_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const MLOPS_INFER_MAX = Number(process.env.MLOPS_INFER_RATE_LIMIT_MAX || 120);

export type MLOpsRouterDeps = {
  service?: MLOpsControlPlaneService;
  authMiddleware?: express.RequestHandler;
  authorizeFlush?: (req: Request) => Promise<boolean>;
  trainLimiter?: express.RequestHandler;
  inferLimiter?: express.RequestHandler;
};

const defaultAuthorizeFlush = async (req: Request): Promise<boolean> => {
  const user = (req as any).user;

  if (!user) {
    return false;
  }

  const opaInput = {
    user: {
      id: user.id,
      roles: user.roles || [],
    },
    action: 'flush_cache',
    resource: { type: 'mlops_control_plane' },
  };

  const allowed = await opaClient.evaluateQuery('mlops/allow', opaInput);
  return allowed === true;
};

export const createMLOpsControlPlaneRouter = (
  deps: MLOpsRouterDeps = {},
): express.Router => {
  const router = express.Router();
  const service = deps.service ?? MLOpsControlPlaneService.createDefault();
  const authMiddleware = deps.authMiddleware ?? ensureAuthenticated;
  const authorizeFlush = deps.authorizeFlush ?? defaultAuthorizeFlush;
  const trainLimiter =
    deps.trainLimiter ??
    rateLimit({
      windowMs: MLOPS_TRAIN_WINDOW_MS,
      max: MLOPS_TRAIN_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => (req.user as any)?.id || req.ip,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'Training rate limit exceeded',
        });
      },
    });
  const inferLimiter =
    deps.inferLimiter ??
    rateLimit({
      windowMs: MLOPS_INFER_WINDOW_MS,
      max: MLOPS_INFER_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => (req.user as any)?.id || req.ip,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'Inference rate limit exceeded',
        });
      },
    });

  router.post(
    '/train/base',
    authMiddleware,
    trainLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = TrainBaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      const response = await service.trainBase(parsed.data);
      return res.status(202).json(response);
    }),
  );

  router.post(
    '/train/derived',
    authMiddleware,
    trainLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = TrainDerivedSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      const response = await service.trainDerived(parsed.data);
      return res.status(202).json(response);
    }),
  );

  router.post(
    '/infer',
    authMiddleware,
    inferLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = InferSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      const result = await service.infer(parsed.data as InferRequest);
      if ('error' in result) {
        return res.status(422).json({ error: result.error });
      }
      return res.json(result.report);
    }),
  );

  router.get(
    '/report/:entityId',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const entityId = req.params.entityId;
      if (!entityId) {
        return res.status(400).json({ error: 'entityId is required' });
      }
      const report = await service.getReport(entityId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      return res.json(report);
    }),
  );

  router.delete(
    '/admin/flush',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const allowed = await authorizeFlush(req);
      if (!allowed) {
        return res.status(403).json({ error: 'Policy denied cache flush' });
      }
      const result = await service.flushCaches();
      return res.json({ flushed: result });
    }),
  );

  return router;
};

const router = createMLOpsControlPlaneRouter();

export default router;
