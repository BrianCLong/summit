/**
 * Governance Metrics Routes
 *
 * REST API endpoints for governance analytics and metrics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module routes/analytics/governance-metrics
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import {
  GovernanceMetricsService,
  TimeRange,
} from '../../services/analytics/GovernanceMetricsService.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const metricsService = new GovernanceMetricsService();

// ============================================================================
// Middleware
// ============================================================================

/**
 * Build Principal from request user
 */
const buildPrincipal = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const principal: Principal = {
    kind: 'user',
    id: user.id,
    tenantId: req.headers['x-tenant-id'] as string || user.tenantId || 'default-tenant',
    roles: [user.role],
    scopes: [],
    user: {
      email: user.email,
      username: user.username,
    },
  };

  (req as any).principal = principal;
  next();
};

/**
 * Require analytics read permission
 */
const requireAnalyticsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'read', { type: 'analytics', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'analytics:read',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

/**
 * Parse time range from query parameters
 */
const parseTimeRange = (req: Request): TimeRange => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const start = (req.query.start as any) ? new Date(req.query.start as string) : defaultStart;
  const end = (req.query.end as any) ? new Date(req.query.end as string) : now;
  const granularity = (req.query.granularity as TimeRange['granularity']) || 'day';

  return { start, end, granularity };
};

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /analytics/governance/summary
 * Get governance metrics summary
 */
router.get(
  '/summary',
  ensureAuthenticated,
  buildPrincipal,
  requireAnalyticsRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const timeRange = parseTimeRange(req);

      const envelope = await metricsService.getMetricsSummary(
        principal.tenantId,
        timeRange,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting governance summary:', error);
      res.status(500).json({ error: 'Failed to get governance summary', message: error.message });
    }
  }
);

/**
 * GET /analytics/governance/verdicts
 * Get verdict distribution
 */
router.get(
  '/verdicts',
  ensureAuthenticated,
  buildPrincipal,
  requireAnalyticsRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const timeRange = parseTimeRange(req);

      const envelope = await metricsService.getVerdictDistribution(
        principal.tenantId,
        timeRange,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting verdict distribution:', error);
      res.status(500).json({ error: 'Failed to get verdict distribution', message: error.message });
    }
  }
);

/**
 * GET /analytics/governance/trends
 * Get verdict trends over time
 */
router.get(
  '/trends',
  ensureAuthenticated,
  buildPrincipal,
  requireAnalyticsRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const timeRange = parseTimeRange(req);

      const envelope = await metricsService.getVerdictTrends(
        principal.tenantId,
        timeRange,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting verdict trends:', error);
      res.status(500).json({ error: 'Failed to get verdict trends', message: error.message });
    }
  }
);

/**
 * GET /analytics/governance/policies
 * Get policy effectiveness metrics
 */
router.get(
  '/policies',
  ensureAuthenticated,
  buildPrincipal,
  requireAnalyticsRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const timeRange = parseTimeRange(req);
      const limit = (req.query.limit as any) ? parseInt(req.query.limit as string, 10) : 10;

      const envelope = await metricsService.getPolicyEffectiveness(
        principal.tenantId,
        timeRange,
        limit,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting policy effectiveness:', error);
      res.status(500).json({ error: 'Failed to get policy effectiveness', message: error.message });
    }
  }
);

/**
 * GET /analytics/governance/anomalies
 * Get detected anomalies
 */
router.get(
  '/anomalies',
  ensureAuthenticated,
  buildPrincipal,
  requireAnalyticsRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const timeRange = parseTimeRange(req);

      const envelope = await metricsService.detectAnomalies(
        principal.tenantId,
        timeRange,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error detecting anomalies:', error);
      res.status(500).json({ error: 'Failed to detect anomalies', message: error.message });
    }
  }
);

export default router;
