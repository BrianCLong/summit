// @ts-nocheck
/**
 * Integration Admin Routes
 *
 * REST API endpoints for integration management with governance.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/integrations/integration-admin
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { integrationManager } from '../../integrations/IntegrationManager.js';
import { slackConnector } from '../../integrations/connectors/SlackConnector.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();

// Register built-in connectors
integrationManager.registerConnector(slackConnector);

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
 * Require integration admin permission
 */
const requireIntegrationAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'admin', { type: 'integration', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'integration:admin',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

/**
 * Require integration read permission
 */
const requireIntegrationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'read', { type: 'integration', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'integration:read',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

// ============================================================================
// Catalog Routes
// ============================================================================

/**
 * GET /integrations/catalog
 * List available integration types
 */
router.get(
  '/catalog',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const envelope = integrationManager.getAvailableIntegrations();
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing integration catalog:', error);
      res.status(500).json({ error: 'Failed to list integrations', message: error.message });
    }
  }
);

// ============================================================================
// Integration Instance Routes
// ============================================================================

/**
 * GET /integrations
 * List configured integrations for the tenant
 */
router.get(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { status, category } = req.query as any;

      const envelope = integrationManager.getIntegrations(principal.tenantId, {
        status: status as string,
        category: category as string,
      });

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing integrations:', error);
      res.status(500).json({ error: 'Failed to list integrations', message: error.message });
    }
  }
);

/**
 * GET /integrations/:id
 * Get a specific integration
 */
router.get(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const envelope = integrationManager.getIntegration(id);

      if (!envelope.data) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting integration:', error);
      res.status(500).json({ error: 'Failed to get integration', message: error.message });
    }
  }
);

/**
 * POST /integrations
 * Set up a new integration
 */
router.post(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { manifestId, name, config } = req.body;

      if (!manifestId || !name) {
        res.status(400).json({ error: 'manifestId and name are required' });
        return;
      }

      const envelope = await integrationManager.setupIntegration(
        manifestId,
        name,
        config || {},
        principal.tenantId,
        principal
      );

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error setting up integration:', error);
      res.status(500).json({ error: 'Failed to set up integration', message: error.message });
    }
  }
);

/**
 * POST /integrations/:id/connect
 * Connect an integration
 */
router.post(
  '/:id/connect',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await integrationManager.connect(id, principal);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error connecting integration:', error);
      res.status(500).json({ error: 'Failed to connect integration', message: error.message });
    }
  }
);

/**
 * POST /integrations/:id/disconnect
 * Disconnect an integration
 */
router.post(
  '/:id/disconnect',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await integrationManager.disconnect(id, principal);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error disconnecting integration:', error);
      res.status(500).json({ error: 'Failed to disconnect integration', message: error.message });
    }
  }
);

/**
 * POST /integrations/:id/execute
 * Execute an integration action
 */
router.post(
  '/:id/execute',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { capability, params, simulation } = req.body;

      if (!capability) {
        res.status(400).json({ error: 'capability is required' });
        return;
      }

      const envelope = await integrationManager.executeAction(
        id,
        capability,
        params || {},
        principal,
        { simulation }
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error executing integration action:', error);
      res.status(500).json({ error: 'Failed to execute action', message: error.message });
    }
  }
);

// ============================================================================
// Approval Workflow Routes
// ============================================================================

/**
 * GET /integrations/approvals/pending
 * List pending approval requests
 */
router.get(
  '/approvals/pending',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const envelope = integrationManager.getPendingApprovals(principal.tenantId);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing pending approvals:', error);
      res.status(500).json({ error: 'Failed to list approvals', message: error.message });
    }
  }
);

/**
 * POST /integrations/approvals/:id/approve
 * Approve an integration request
 */
router.post(
  '/approvals/:id/approve',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { comment } = req.body;

      const envelope = await integrationManager.approveRequest(id, principal, comment);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error approving request:', error);
      res.status(500).json({ error: 'Failed to approve request', message: error.message });
    }
  }
);

/**
 * POST /integrations/approvals/:id/reject
 * Reject an integration request
 */
router.post(
  '/approvals/:id/reject',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { comment } = req.body;

      const envelope = await integrationManager.rejectRequest(id, principal, comment);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error rejecting request:', error);
      res.status(500).json({ error: 'Failed to reject request', message: error.message });
    }
  }
);

// ============================================================================
// Audit Routes
// ============================================================================

/**
 * GET /integrations/audit
 * Get integration audit log
 */
router.get(
  '/audit',
  ensureAuthenticated,
  buildPrincipal,
  requireIntegrationAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { integrationId, from, to } = req.query as any;

      const envelope = integrationManager.getAuditLog(principal.tenantId, {
        integrationId: integrationId as string,
        from: from as string,
        to: to as string,
      });

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting audit log:', error);
      res.status(500).json({ error: 'Failed to get audit log', message: error.message });
    }
  }
);

export default router;
