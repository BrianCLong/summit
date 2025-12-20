import { Router } from 'express';
import {
  authenticateUser,
  requireAnyPermission,
} from '../auth/rbac-middleware.js';
import {
  flagsSnapshot,
  getFeatureFlags,
  recordPricingRefreshBlocked,
} from '../config/feature-flags.js';
import logger from '../../config/logger.js';

const router = Router();

const requireOpsPermission = requireAnyPermission(
  'admin:*',
  'ops:*',
  'operations:*',
);

router.use(authenticateUser);

router.get('/flags', requireOpsPermission, (_req, res) => {
  res.json({ flags: flagsSnapshot() });
});

router.post('/pricing/refresh', requireOpsPermission, (req, res) => {
  const flags = getFeatureFlags();
  if (!flags.PRICING_REFRESH_ENABLED) {
    recordPricingRefreshBlocked();
    logger.warn('Pricing refresh blocked by feature flag', {
      path: req.path,
      tenantId: (req as any).user?.tenantId,
    });
    return res
      .status(409)
      .json({ error: 'pricing refresh disabled by feature flag' });
  }

  logger.info('Pricing refresh accepted', {
    tenantId: (req as any).user?.tenantId,
    hasBody: Boolean(req.body),
  });
  res.status(202).json({ ok: true, message: 'pricing refresh accepted' });
});

export { router as operationsRouter };
