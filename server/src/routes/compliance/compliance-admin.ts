// @ts-nocheck
/**
 * Compliance Admin Routes
 *
 * REST API endpoints for compliance management.
 *
 * SOC 2 Controls: CC4.1, CC4.2, PI1.1
 *
 * @module routes/compliance/compliance-admin
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { evidenceCollector } from '../../compliance/EvidenceCollector.js';
import { controlMappingService } from '../../compliance/ControlMappingService.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();

// ============================================================================
// Middleware
// ============================================================================

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

const requireComplianceRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

const requireComplianceAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'admin', { type: 'compliance', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'compliance:admin',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

// ============================================================================
// Framework Routes
// ============================================================================

/**
 * GET /compliance/frameworks
 * List available compliance frameworks
 */
router.get(
  '/frameworks',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const envelope = controlMappingService.getFrameworks();
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing frameworks:', error);
      res.status(500).json({ error: 'Failed to list frameworks', message: error.message });
    }
  }
);

/**
 * GET /compliance/frameworks/:framework/controls
 * List controls for a framework
 */
router.get(
  '/frameworks/:framework/controls',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { framework } = req.params;
      const { category } = req.query as any;

      const envelope = controlMappingService.getControls(
        framework as any,
        category as string
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing controls:', error);
      res.status(500).json({ error: 'Failed to list controls', message: error.message });
    }
  }
);

// ============================================================================
// Assessment Routes
// ============================================================================

/**
 * POST /compliance/frameworks/:framework/assess/:controlId
 * Assess a specific control
 */
router.post(
  '/frameworks/:framework/assess/:controlId',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { framework, controlId } = req.params;

      const envelope = await controlMappingService.assessControl(
        controlId,
        framework as any,
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error assessing control:', error);
      res.status(500).json({ error: 'Failed to assess control', message: error.message });
    }
  }
);

/**
 * GET /compliance/frameworks/:framework/assessments
 * Get assessments for a framework
 */
router.get(
  '/frameworks/:framework/assessments',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { framework } = req.params;

      const envelope = controlMappingService.getAssessments(
        principal.tenantId,
        framework as any
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting assessments:', error);
      res.status(500).json({ error: 'Failed to get assessments', message: error.message });
    }
  }
);

// ============================================================================
// Summary Routes
// ============================================================================

/**
 * GET /compliance/frameworks/:framework/summary
 * Get compliance summary for a framework
 */
router.get(
  '/frameworks/:framework/summary',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { framework } = req.params;

      const envelope = controlMappingService.getComplianceSummary(
        principal.tenantId,
        framework as any
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting summary:', error);
      res.status(500).json({ error: 'Failed to get summary', message: error.message });
    }
  }
);

/**
 * GET /compliance/frameworks/:framework/readiness
 * Get audit readiness for a framework
 */
router.get(
  '/frameworks/:framework/readiness',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { framework } = req.params;

      const envelope = controlMappingService.getAuditReadiness(
        principal.tenantId,
        framework as any
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting readiness:', error);
      res.status(500).json({ error: 'Failed to get readiness', message: error.message });
    }
  }
);

// ============================================================================
// Evidence Routes
// ============================================================================

/**
 * GET /compliance/evidence
 * List evidence
 */
router.get(
  '/evidence',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { controlId, framework, type, status } = req.query as any;

      const envelope = evidenceCollector.getEvidence(principal.tenantId, {
        controlId: controlId as string,
        framework: framework as any,
        type: type as any,
        status: status as any,
      });

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing evidence:', error);
      res.status(500).json({ error: 'Failed to list evidence', message: error.message });
    }
  }
);

/**
 * POST /compliance/evidence
 * Collect new evidence
 */
router.post(
  '/evidence',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { controlId, framework, type, source, content, metadata } = req.body;

      if (!controlId || !framework || !type || !source || !content) {
        res.status(400).json({
          error: 'controlId, framework, type, source, and content are required',
        });
        return;
      }

      const envelope = await evidenceCollector.collectEvidence(
        controlId,
        framework,
        type,
        principal.tenantId,
        source,
        content,
        principal.id,
        metadata
      );

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error collecting evidence:', error);
      res.status(500).json({ error: 'Failed to collect evidence', message: error.message });
    }
  }
);

/**
 * GET /compliance/evidence/:id
 * Get specific evidence
 */
router.get(
  '/evidence/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const envelope = evidenceCollector.getEvidenceById(id);

      if (!envelope.data) {
        res.status(404).json({ error: 'Evidence not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting evidence:', error);
      res.status(500).json({ error: 'Failed to get evidence', message: error.message });
    }
  }
);

/**
 * POST /compliance/evidence/:id/verify
 * Verify evidence integrity
 */
router.post(
  '/evidence/:id/verify',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const envelope = evidenceCollector.verifyEvidence(id);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error verifying evidence:', error);
      res.status(500).json({ error: 'Failed to verify evidence', message: error.message });
    }
  }
);

/**
 * GET /compliance/evidence/status
 * Get evidence collection status
 */
router.get(
  '/evidence/status',
  ensureAuthenticated,
  buildPrincipal,
  requireComplianceRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { framework } = req.query as any;

      const envelope = evidenceCollector.getEvidenceStatus(
        principal.tenantId,
        framework as any
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting evidence status:', error);
      res.status(500).json({ error: 'Failed to get status', message: error.message });
    }
  }
);

export default router;
