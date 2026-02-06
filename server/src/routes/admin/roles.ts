/**
 * Role Management Admin Routes
 *
 * REST API endpoints for role and permission management.
 * All responses are wrapped in DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/admin/roles
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import {
  RoleManagementService,
  createRoleSchema,
  updateRoleSchema,
} from '../../services/RoleManagementService.js';
import { Principal, Action } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const roleService = new RoleManagementService();
const singleParam = (value: unknown): string | undefined =>
  Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;

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
 * Require role management permission
 */
const requireRolePermission = (action: Action) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const principal = (req as any).principal;
      await authz.assertCan(principal, action, { type: 'role', tenantId: principal.tenantId });
      next();
    } catch (error: any) {
      if (error.message.includes('Permission denied')) {
        res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          required: `role:${action}`,
        });
        return;
      }
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
};

// ============================================================================
// Role Routes
// ============================================================================

/**
 * GET /admin/roles
 * List all roles (built-in and custom)
 */
router.get(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await roleService.listRoles(
        principal.tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing roles:', error);
      res.status(500).json({ error: 'Failed to list roles', message: error.message });
    }
  }
);

/**
 * GET /admin/roles/:id
 * Get a specific role
 */
router.get(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = singleParam(req.params.id) ?? '';

      const envelope = await roleService.getRole(
        principal.tenantId,
        id,
        principal.id
      );

      if (!envelope.data) {
        res.status(404).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting role:', error);
      res.status(500).json({ error: 'Failed to get role', message: error.message });
    }
  }
);

/**
 * POST /admin/roles
 * Create a custom role
 */
router.post(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      // Validate input
      const parseResult = createRoleSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await roleService.createRole(
        principal.tenantId,
        parseResult.data,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role', message: error.message });
    }
  }
);

/**
 * PATCH /admin/roles/:id
 * Update a custom role
 */
router.patch(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = singleParam(req.params.id) ?? '';

      // Validate input
      const parseResult = updateRoleSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await roleService.updateRole(
        principal.tenantId,
        id,
        parseResult.data,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role', message: error.message });
    }
  }
);

/**
 * DELETE /admin/roles/:id
 * Delete a custom role
 */
router.delete(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = singleParam(req.params.id) ?? '';

      const envelope = await roleService.deleteRole(
        principal.tenantId,
        id,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error deleting role:', error);
      res.status(500).json({ error: 'Failed to delete role', message: error.message });
    }
  }
);

// ============================================================================
// Permission Routes
// ============================================================================

/**
 * GET /admin/roles/permissions
 * List all available permissions
 */
router.get(
  '/permissions/list',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const envelope = await roleService.listPermissions(principal.id);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing permissions:', error);
      res.status(500).json({ error: 'Failed to list permissions', message: error.message });
    }
  }
);

// ============================================================================
// Role Assignment Routes
// ============================================================================

/**
 * GET /admin/roles/users/:userId
 * Get a user's role assignments
 */
router.get(
  '/users/:userId',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const userId = singleParam(req.params.userId) ?? '';

      const envelope = await roleService.getUserRoles(
        principal.tenantId,
        userId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting user roles:', error);
      res.status(500).json({ error: 'Failed to get user roles', message: error.message });
    }
  }
);

/**
 * POST /admin/roles/assign
 * Assign a role to a user
 */
router.post(
  '/assign',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('assign'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { userId, roleId, expiresAt } = req.body;

      if (!userId || !roleId) {
        res.status(400).json({ error: 'userId and roleId are required' });
        return;
      }

      const envelope = await roleService.assignRoleToUser(
        principal.tenantId,
        userId,
        roleId,
        principal.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error assigning role:', error);
      res.status(500).json({ error: 'Failed to assign role', message: error.message });
    }
  }
);

/**
 * POST /admin/roles/revoke
 * Revoke a role from a user
 */
router.post(
  '/revoke',
  ensureAuthenticated,
  buildPrincipal,
  requireRolePermission('revoke'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        res.status(400).json({ error: 'userId and roleId are required' });
        return;
      }

      const envelope = await roleService.revokeRoleFromUser(
        principal.tenantId,
        userId,
        roleId,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error revoking role:', error);
      res.status(500).json({ error: 'Failed to revoke role', message: error.message });
    }
  }
);

export default router;
