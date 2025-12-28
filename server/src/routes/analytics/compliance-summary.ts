/**
 * Compliance Summary Routes
 *
 * REST API endpoints for compliance analytics and audit readiness.
 *
 * SOC 2 Controls: CC2.1, CC3.1, CC4.1, PI1.1
 *
 * @module routes/analytics/compliance-summary
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { ComplianceMetricsService } from '../../services/analytics/ComplianceMetricsService.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const complianceService = new ComplianceMetricsService();

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
 * Require compliance read permission
 */
const requireComplianceRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'read', { type: 'compliance', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'compliance:read',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /analytics/compliance/summary
 * Get compliance dashboard summary
 */
router.get(
  '/summary',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await complianceService.getComplianceSummary(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting compliance summary:', error);
      res.status(500).json({ error: 'Failed to get compliance summary', message: error.message });
    }
  }
);

/**
 * GET /analytics/compliance/readiness
 * Get audit readiness score
 */
router.get(
  '/readiness',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await complianceService.getAuditReadiness(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting audit readiness:', error);
      res.status(500).json({ error: 'Failed to get audit readiness', message: error.message });
    }
  }
);

/**
 * GET /analytics/compliance/controls
 * Get control status overview
 */
router.get(
  '/controls',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const framework = req.query.framework as string | undefined;

      const envelope = await complianceService.getControlStatus(
        principal.tenantId,
        framework,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting control status:', error);
      res.status(500).json({ error: 'Failed to get control status', message: error.message });
    }
  }
);

/**
 * GET /analytics/compliance/effectiveness
 * Get control effectiveness metrics
 */
router.get(
  '/effectiveness',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await complianceService.getControlEffectiveness(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting control effectiveness:', error);
      res.status(500).json({ error: 'Failed to get control effectiveness', message: error.message });
    }
  }
);

/**
 * GET /analytics/compliance/evidence
 * Get evidence status overview
 */
router.get(
  '/evidence',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await complianceService.getEvidenceStatus(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting evidence status:', error);
      res.status(500).json({ error: 'Failed to get evidence status', message: error.message });
    }
  }
);

/**
 * GET /analytics/compliance/frameworks
 * Get framework status overview
 */
router.get(
  '/frameworks',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await complianceService.getFrameworkStatus(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting framework status:', error);
      res.status(500).json({ error: 'Failed to get framework status', message: error.message });
    }
  }
);

export default router;
