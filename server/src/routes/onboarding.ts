/**
 * Onboarding API Routes
 *
 * REST API for the enhanced onboarding system.
 *
 * @module routes/onboarding
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { enhancedOnboardingService } from '../onboarding/index.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { isEnabled } from '../lib/featureFlags.js';
import logger from '../utils/logger.js';

const router = Router();

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
const StartOnboardingSchema = z.object({
  persona: z.enum(['admin', 'analyst', 'developer', 'compliance_officer', 'viewer']).optional(),
  locale: z.string().optional(),
});

const CompleteStepSchema = z.object({
  quizScore: z.number().min(0).max(100).optional(),
  feedbackRating: z.number().min(1).max(5).optional(),
  feedbackComment: z.string().max(1000).optional(),
  actionsCompleted: z.array(z.string()).optional(),
});

const SkipStepSchema = z.object({
  reason: z.string().max(500).optional(),
});

const InstallSampleSchema = z.object({
  sampleId: z.string(),
});

const HelpRequestSchema = z.object({
  stepId: z.string().optional(),
  topic: z.string().optional(),
});

/**
 * Start or resume onboarding
 * POST /api/v1/onboarding/start
 */
router.post(
  '/start',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.enhancedFlow'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { persona, locale } = StartOnboardingSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      const result = await enhancedOnboardingService.startOnboarding(
        tenantId,
        userId,
        persona,
        locale
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get current onboarding step
 * GET /api/v1/onboarding/current-step
 */
router.get(
  '/current-step',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.enhancedFlow'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, id: userId } = req.user!;

      const result = await enhancedOnboardingService.getCurrentStep(tenantId, userId);

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Complete current step
 * POST /api/v1/onboarding/steps/:stepId/complete
 */
router.post(
  '/steps/:stepId/complete',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.enhancedFlow'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stepId } = req.params;
      const data = CompleteStepSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      const result = await enhancedOnboardingService.completeStep(
        tenantId,
        userId,
        stepId,
        data
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Skip current step
 * POST /api/v1/onboarding/steps/:stepId/skip
 */
router.post(
  '/steps/:stepId/skip',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.enhancedFlow'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stepId } = req.params;
      const { reason } = SkipStepSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      const result = await enhancedOnboardingService.skipStep(
        tenantId,
        userId,
        stepId,
        reason
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get sample content for persona
 * GET /api/v1/onboarding/samples
 */
router.get(
  '/samples',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.sampleContent'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const persona = (req.query.persona as string) || 'analyst';
      const type = req.query.type as string | undefined;

      const result = await enhancedOnboardingService.getSampleContent(
        persona as any,
        type
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Install sample content
 * POST /api/v1/onboarding/samples/install
 */
router.post(
  '/samples/install',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.sampleContent'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sampleId } = InstallSampleSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      const result = await enhancedOnboardingService.installSampleContent(
        tenantId,
        userId,
        sampleId
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get contextual help
 * GET /api/v1/onboarding/help
 */
router.get(
  '/help',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.contextualHelp'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = (req.query.route as string) || '/';
      const { id: userId } = req.user!;

      const result = await enhancedOnboardingService.getContextualHelp(route, userId);

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Record help request
 * POST /api/v1/onboarding/help/request
 */
router.post(
  '/help/request',
  ensureAuthenticated,
  requireFeatureFlag('onboarding.contextualHelp'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stepId, topic } = HelpRequestSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      await enhancedOnboardingService.recordHelpRequest(tenantId, userId, stepId, topic);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get onboarding analytics (admin only)
 * GET /api/v1/onboarding/analytics
 */
router.get(
  '/analytics',
  ensureAuthenticated,
  requireFeatureFlag('analytics.productDashboard'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check admin role
      if ((req.user as any)?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';
      const startDate = (req.query.startDate as any)
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = (req.query.endDate as any)
        ? new Date(req.query.endDate as string)
        : new Date();

      const result = await enhancedOnboardingService.getAnalyticsSummary(
        period,
        startDate,
        endDate
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
