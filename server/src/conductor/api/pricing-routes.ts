import express from 'express';
import {
  AuthenticatedRequest,
  requirePermission,
} from '../auth/rbac-middleware.js';
import { refreshPricing } from '../scheduling/pricing-refresh.js';
import logger from '../../config/logger.js';

const router = express.Router();

router.post(
  '/refresh',
  requirePermission('pricing:update'),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await refreshPricing({
        actor: authReq.user?.userId || authReq.user?.email,
        tenantId: authReq.user?.tenantId,
      });

      res.json({
        updatedPools: result.updatedPools,
        skippedPools: result.skippedPools,
        effectiveAt: result.effectiveAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Pricing refresh API failed', {
        error: error.message,
      });
      res.status(500).json({ error: 'Failed to refresh pricing' });
    }
  },
);

export { router as pricingRoutes };
