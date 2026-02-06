/**
 * Experimentation API Routes
 *
 * REST API for A/B testing and feature experiments.
 *
 * @module routes/experimentation
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { experimentationService } from '../experimentation/index.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { isEnabled } from '../lib/featureFlags.js';
import logger from '../utils/logger.js';

const router = Router();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

// Feature flag check middleware
const requireFeatureFlag = (flagName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = { userId: req.user?.id, tenantId: req.user?.tenantId };
    if (!isEnabled(flagName, context)) {
      res.status(403).json({ error: `Feature '${flagName}' is not enabled` });
      return;
    }
    next();
  };
};

// Validation schemas
const TargetingRuleSchema = z.object({
  id: z.string(),
  attribute: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'not_in', 'gt', 'lt']),
  value: z.unknown(),
});

const VariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(100),
  config: z.record(z.unknown()),
  isControl: z.boolean(),
});

const CreateExperimentSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000),
  type: z.enum(['a_b', 'multivariate', 'feature_rollout']),
  hypothesis: z.string().min(10).max(1000),
  primaryMetric: z.string(),
  secondaryMetrics: z.array(z.string()).optional().default([]),
  variants: z.array(VariantSchema).min(2),
  targetingRules: z.array(TargetingRuleSchema).optional().default([]),
  trafficAllocation: z.number().min(0).max(100),
  minSampleSize: z.number().min(100),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  owner: z.string(),
});

const GetAssignmentSchema = z.object({
  userId: z.string().optional(),
  attributes: z.record(z.unknown()).optional().default({}),
  consent: z.boolean().default(true),
});

const TrackMetricSchema = z.object({
  metricName: z.string(),
  metricValue: z.number(),
});

const ApproveExperimentSchema = z.object({
  role: z.string(),
  approved: z.boolean(),
  comment: z.string().optional(),
});

const CompleteExperimentSchema = z.object({
  rolloutWinner: z.boolean().optional().default(false),
});

/**
 * Create a new experiment
 * POST /api/v1/experiments
 */
router.post(
  '/',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check admin role
      if ((req.user as any)?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required to create experiments' });
        return;
      }

      const data = CreateExperimentSchema.parse(req.body);

      const result = await experimentationService.createExperiment({
        name: data.name,
        description: data.description,
        type: data.type,
        hypothesis: data.hypothesis,
        primaryMetric: data.primaryMetric,
        secondaryMetrics: data.secondaryMetrics,
        variants: data.variants,
        targetingRules: data.targetingRules,
        trafficAllocation: data.trafficAllocation,
        minSampleSize: data.minSampleSize,
        confidenceLevel: data.confidenceLevel,
        owner: data.owner,
      });

      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Start an experiment
 * POST /api/v1/experiments/:experimentId/start
 */
router.post(
  '/:experimentId/start',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check admin role
      if ((req.user as any)?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required to start experiments' });
        return;
      }

      const experimentId = singleParam(req.params.experimentId);

      const result = await experimentationService.startExperiment(experimentId);

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get variant assignment for current user
 * GET /api/v1/experiments/:experimentId/assignment
 */
router.get(
  '/:experimentId/assignment',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const experimentId = singleParam(req.params.experimentId);
      const { tenantId, id: userId } = req.user!;

      // Parse query parameters for additional attributes
      const attributes: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (key.startsWith('attr_')) {
          attributes[key.slice(5)] = value;
        }
      }

      const result = await experimentationService.getAssignment(experimentId, {
        userId,
        tenantId,
        attributes,
        consent: true, // Assume consent if authenticated
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get assignment with explicit context
 * POST /api/v1/experiments/:experimentId/assignment
 */
router.post(
  '/:experimentId/assignment',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const experimentId = singleParam(req.params.experimentId);
      const { tenantId, id: userId } = req.user!;
      const data = GetAssignmentSchema.parse(req.body);

      const result = await experimentationService.getAssignment(experimentId, {
        userId: data.userId || userId,
        tenantId,
        attributes: data.attributes,
        consent: data.consent,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Track metric event
 * POST /api/v1/experiments/:experimentId/metrics
 */
router.post(
  '/:experimentId/metrics',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const experimentId = singleParam(req.params.experimentId);
      const { id: userId } = req.user!;
      const { metricName, metricValue } = TrackMetricSchema.parse(req.body);

      await experimentationService.trackMetric(
        experimentId,
        userId,
        metricName,
        metricValue
      );

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get experiment results
 * GET /api/v1/experiments/:experimentId/results
 */
router.get(
  '/:experimentId/results',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check admin or analyst role
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'analyst') {
        res.status(403).json({ error: 'Admin or analyst access required to view results' });
        return;
      }

      const experimentId = singleParam(req.params.experimentId);

      const result = await experimentationService.getResults(experimentId);

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Approve or reject experiment
 * POST /api/v1/experiments/:experimentId/approve
 */
router.post(
  '/:experimentId/approve',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const experimentId = singleParam(req.params.experimentId);
      const { id: userId } = req.user!;
      const { role, approved, comment } = ApproveExperimentSchema.parse(req.body);

      // Verify user has the required role
      const userRole = (req.user as any)?.role;
      if (userRole !== role && userRole !== 'admin') {
        res.status(403).json({ error: `Role '${role}' required for this approval` });
        return;
      }

      const result = await experimentationService.approveExperiment(
        experimentId,
        userId,
        role,
        approved,
        comment
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Complete experiment
 * POST /api/v1/experiments/:experimentId/complete
 */
router.post(
  '/:experimentId/complete',
  ensureAuthenticated,
  requireFeatureFlag('experimentation.abTesting'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check admin role
      if ((req.user as any)?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required to complete experiments' });
        return;
      }

      const experimentId = singleParam(req.params.experimentId);
      const { rolloutWinner } = CompleteExperimentSchema.parse(req.body);

      const result = await experimentationService.completeExperiment(
        experimentId,
        rolloutWinner
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
