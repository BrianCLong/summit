// @ts-nocheck
/**
 * Plugin Admin Routes
 *
 * REST API endpoints for plugin management and administration.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/plugins/plugin-admin
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { PluginManager } from '../../plugins/PluginManager.js';
import { PluginRegistry } from '../../plugins/PluginRegistry.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';
import { requireTenantContextMiddleware } from '../../middleware/require-tenant-context.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const pluginManager = new PluginManager();
const pluginRegistry = new PluginRegistry();

router.use(ensureAuthenticated, requireTenantContextMiddleware());

// ============================================================================
// Middleware
// ============================================================================

/**
 * Build Principal from request user
 */
const buildPrincipal = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  const tenantContext = (req as any).tenantContext;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  if (!tenantContext?.tenantId) {
    res.status(400).json({
      error: 'TENANT_CONTEXT_REQUIRED',
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'Tenant context is required for plugin administration',
    });
    return;
  }

  const principal: Principal = {
    kind: 'user',
    id: user.id,
    tenantId: tenantContext.tenantId,
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
 * Require plugin admin permission
 */
const requirePluginAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'admin', { type: 'plugin', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'plugin:admin',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

/**
 * Require plugin read permission
 */
const requirePluginRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'read', { type: 'plugin', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'plugin:read',
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
 * GET /plugins
 * List all plugins
 */
router.get(
  '/',
  buildPrincipal,
  requirePluginRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { category, status, search, page, pageSize } = req.query as any;

      const envelope = await pluginRegistry.listPlugins(
        {
          category: category as any,
          status: status as any,
          search: search as string,
          page: page ? parseInt(page as string, 10) : undefined,
          pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        },
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing plugins:', error);
      res.status(500).json({ error: 'Failed to list plugins', message: error.message });
    }
  }
);

/**
 * GET /plugins/:id
 * Get a specific plugin
 */
router.get(
  '/:id',
  buildPrincipal,
  requirePluginRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await pluginRegistry.getPlugin(id, principal.id);

      if (!envelope.data) {
        res.status(404).json({ error: 'Plugin not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting plugin:', error);
      res.status(500).json({ error: 'Failed to get plugin', message: error.message });
    }
  }
);

/**
 * POST /plugins/:id/enable
 * Enable a plugin for the tenant
 */
router.post(
  '/:id/enable',
  buildPrincipal,
  requirePluginAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { config } = req.body;

      const envelope = await pluginManager.enablePlugin(
        id,
        principal.tenantId,
        config || {},
        principal
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error enabling plugin:', error);
      res.status(500).json({ error: 'Failed to enable plugin', message: error.message });
    }
  }
);

/**
 * POST /plugins/:id/disable
 * Disable a plugin for the tenant
 */
router.post(
  '/:id/disable',
  buildPrincipal,
  requirePluginAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await pluginManager.disablePlugin(id, principal.tenantId, principal);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error disabling plugin:', error);
      res.status(500).json({ error: 'Failed to disable plugin', message: error.message });
    }
  }
);

/**
 * POST /plugins/:id/execute
 * Execute a plugin action
 */
router.post(
  '/:id/execute',
  buildPrincipal,
  requirePluginRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { action, params, simulation } = req.body;

      if (!action) {
        res.status(400).json({ error: 'Action is required' });
        return;
      }

      const envelope = await pluginManager.executeAction(
        id,
        action,
        params || {},
        principal,
        { simulation }
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error executing plugin:', error);
      res.status(500).json({ error: 'Failed to execute plugin', message: error.message });
    }
  }
);

/**
 * GET /plugins/:id/config
 * Get tenant-specific plugin configuration
 */
router.get(
  '/:id/config',
  buildPrincipal,
  requirePluginRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await pluginRegistry.getTenantConfig(id, principal.tenantId, principal.id);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting plugin config:', error);
      res.status(500).json({ error: 'Failed to get plugin config', message: error.message });
    }
  }
);

/**
 * PUT /plugins/:id/config
 * Update tenant-specific plugin configuration
 */
router.put(
  '/:id/config',
  buildPrincipal,
  requirePluginAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { config, enabled } = req.body;

      const envelope = await pluginRegistry.saveTenantConfig(
        id,
        principal.tenantId,
        config || {},
        enabled !== false,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error updating plugin config:', error);
      res.status(500).json({ error: 'Failed to update plugin config', message: error.message });
    }
  }
);

/**
 * GET /plugins/:id/health
 * Get plugin health status
 */
router.get(
  '/:id/health',
  buildPrincipal,
  requirePluginRead,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await pluginManager.getHealthStatus(id, principal);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting plugin health:', error);
      res.status(500).json({ error: 'Failed to get plugin health', message: error.message });
    }
  }
);

/**
 * DELETE /plugins/:id
 * Uninstall a plugin (admin only)
 */
router.delete(
  '/:id',
  buildPrincipal,
  requirePluginAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await pluginManager.uninstallPlugin(id, principal);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error uninstalling plugin:', error);
      res.status(500).json({ error: 'Failed to uninstall plugin', message: error.message });
    }
  }
);

export default router;
