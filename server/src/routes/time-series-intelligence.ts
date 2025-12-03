
import { Router } from 'express';
import { timeSeriesIntelligence } from '../services/TimeSeriesIntelligenceService.js';
import { AppError } from '../lib/errors.js';

const router = Router();

/**
 * @route GET /api/intelligence/forecast/:entityId/activity
 * @desc Forecast activity volume for an entity
 * @access Private
 */
router.get('/forecast/:entityId/activity', async (req, res, next) => {
  try {
    const { entityId } = req.params;
    const { horizon = '7', lookback = '90' } = req.query;

    // Ensure tenant context (assuming middleware populates req.user.tenant_id)
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.tenantId;
    if (!tenantId) {
       throw new AppError('Tenant ID required', 401);
    }

    const result = await timeSeriesIntelligence.forecastActivity(
      entityId,
      tenantId,
      parseInt(horizon as string),
      parseInt(lookback as string)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/intelligence/forecast/:entityId/metric
 * @desc Forecast a specific metric for an entity
 * @access Private
 */
router.get('/forecast/:entityId/metric', async (req, res, next) => {
  try {
    const { entityId } = req.params;
    const { path, horizon = '7', lookback = '90' } = req.query;

    if (!path || typeof path !== 'string') {
      throw new AppError('Metric path is required', 400);
    }

    const tenantId = (req as any).user?.tenant_id || (req as any).user?.tenantId;
    if (!tenantId) {
       throw new AppError('Tenant ID required', 401);
    }

    const result = await timeSeriesIntelligence.forecastMetric(
      entityId,
      tenantId,
      path,
      parseInt(horizon as string),
      parseInt(lookback as string)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
