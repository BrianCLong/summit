import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { isEnabled } from '../lib/featureFlags.js';
import { supportBundleService } from '../services/support/index.js';

const router = Router();

const SupportBundleSchema = z.object({
  tenantId: z.string().min(1),
  reason: z.string().min(5).max(2000),
  receiptsLimit: z.number().min(1).max(200).optional(),
  sloRunbook: z.string().min(1).max(100).optional(),
  sloWindow: z.string().min(2).max(20).optional(),
});

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

/**
 * Generate support diagnostics bundle
 * POST /api/support-bundles:generate
 */
router.post(
  '/support-bundles:generate',
  ensureAuthenticated,
  requireFeatureFlag('support.bundle'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = SupportBundleSchema.parse(req.body);
      const user = req.user as any;
      const userTenantId = (user?.tenantId || user?.defaultTenantId) as string;
      const userRole = user?.role as string;
      const actor = {
        id: user?.id as string,
        role: userRole,
        tenantId: userTenantId,
        email: user?.email as string | undefined,
      };

      // SECURITY: Validate cross-tenant access authorization
      // Non-admin users can only generate bundles for their own tenant
      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(userRole);
      if (!isAdmin && payload.tenantId !== userTenantId) {
        res.status(403).json({
          error: 'Forbidden: Cannot generate support bundle for another tenant'
        });
        return;
      }

      const result = await supportBundleService.generateBundle({
        actor,
        tenantId: payload.tenantId,
        reason: payload.reason,
        receiptsLimit: payload.receiptsLimit,
        sloRunbook: payload.sloRunbook,
        sloWindow: payload.sloWindow,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;
