import { Router } from 'express';
import { boundedPredictiveService } from '../services/BoundedPredictiveService.js';
import { logger } from '../config/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { PredictiveAnalyticsNotEnabledError } from '../lib/errors.js';

const router = Router();

// Helper to handle async route errors
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @route GET /ledger-activity/:entityId
 * @desc Get bounded predictive forecast for ledger activity
 * @access Protected, Opt-in
 */
router.get(
  '/ledger-activity/:entityId',
  authenticateToken,
  asyncHandler(async (req: any, res: any) => {
    const { entityId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant context required' });
    }

    try {
      const result = await boundedPredictiveService.forecastLedgerActivity(tenantId, entityId);
      res.json(result);
    } catch (error: any) {
      if (error instanceof PredictiveAnalyticsNotEnabledError) {
        return res.status(403).json({
          error: 'Feature Disabled',
          message: 'Predictive analytics capability is not enabled for this tenant.'
        });
      }
      logger.error({ err: error, entityId }, 'Predictive API Error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  })
);

export default router;
