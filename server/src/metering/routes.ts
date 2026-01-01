import express from 'express';
import { z } from 'zod';
import { persistentUsageRepository } from './persistence';
import { quotaManager } from './quotas';
import { planService } from '../usage/plans';
import { ensureAuthenticated } from '../middleware/auth';
import { createValidator } from '../middleware/request-validation.js';

import { User } from '../lib/auth.js';

const tenantIdSchema = z
  .string()
  .trim()
  .min(1, 'tenantId is required')
  .max(64, 'tenantId must be 64 characters or fewer')
  .regex(/^[a-zA-Z0-9_-]+$/, 'tenantId may only contain letters, numbers, underscores, and dashes');

const summaryQuerySchema = z
  .object({
    tenantId: tenantIdSchema.optional(),
    from: z.string().trim().max(50).optional(),
    to: z.string().trim().max(50).optional(),
  })
  .strict();

const quotaOverrideSchema = z
  .object({
    tenantId: tenantIdSchema,
    config: z
      .record(
        z.string().trim().min(1).max(64),
        z.union([
          z.number(),
          z.boolean(),
          z.string().trim().max(128),
          z.array(z.string().trim().max(128)).max(50),
          z
            .object({ limit: z.number().nonnegative(), windowMs: z.number().positive().max(86_400_000) })
            .strict(),
        ]),
      )
      .refine((value) => Object.keys(value).length <= 50, 'config may include at most 50 keys'),
  })
  .strict();

const planAssignmentSchema = z
  .object({
    tenantId: tenantIdSchema,
    planId: z.string().trim().min(1).max(64),
  })
  .strict();

export const meteringRouter = express.Router();

// Middleware to ensure admin access
const ensureAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user as unknown as User;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Check for admin role
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};

// GET /summary?tenantId=&from=&to=
meteringRouter.get(
  '/summary',
  ensureAuthenticated,
  createValidator(summaryQuerySchema, { target: 'query' }),
  async (req, res) => {
    try {
      const { tenantId, from, to } = req.query as z.infer<typeof summaryQuerySchema>;

      const targetTenantId = tenantId || req.user?.tenantId;

      if (!targetTenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      // Tenant Isolation
      const currentUser = req.user as unknown as User;
      if (currentUser?.tenantId && currentUser.tenantId !== targetTenantId) {
        // Unless admin
        if (currentUser.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }

      const usage = await persistentUsageRepository.list(targetTenantId, from, to);

      // Also fetch Plan and Effective Limits
      const plan = await planService.getPlanForTenant(targetTenantId);
      const limits = await quotaManager.getEffectiveQuota(targetTenantId);

      res.json({
        plan: {
          id: plan.id,
          name: plan.name,
          limits: plan.limits,
        },
        effectiveQuotas: limits,
        usage: usage,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// POST /quotas (Admin only) - Sets overrides
meteringRouter.post(
  '/quotas',
  ensureAuthenticated,
  ensureAdmin,
  createValidator(quotaOverrideSchema),
  async (req, res) => {
    try {
      const { tenantId, config } = req.body as z.infer<typeof quotaOverrideSchema>;

      await quotaManager.setQuotaOverride(tenantId, config);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// POST /plans/assign (Admin only)
meteringRouter.post(
  '/plans/assign',
  ensureAuthenticated,
  ensureAdmin,
  createValidator(planAssignmentSchema),
  async (req, res) => {
    try {
      const { tenantId, planId } = req.body as z.infer<typeof planAssignmentSchema>;

      await planService.setPlanForTenant(tenantId, planId);
      res.json({ success: true, message: `Plan ${planId} assigned to ${tenantId}` });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
