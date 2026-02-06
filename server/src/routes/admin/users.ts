/**
 * User Management Admin Routes
 *
 * REST API endpoints for user management operations.
 * All responses are wrapped in DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/admin/users
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { UserManagementService, listUsersSchema, createUserSchema, updateUserSchema } from '../../services/UserManagementService.js';
import { Principal, Action } from '../../types/identity.js';
import logger from '../../utils/logger.js';
import { validateRequest } from '../../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const userService = new UserManagementService();

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
 * Require user management permission
 */
const requireUserPermission = (action: Action) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const principal = (req as any).principal;
      await authz.assertCan(principal, action, { type: 'user', tenantId: principal.tenantId });
      next();
    } catch (error: any) {
      if (error.message.includes('Permission denied')) {
        res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          required: `user:${action}`,
        });
        return;
      }
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
};

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /admin/users
 * List users with pagination and filtering
 */
router.get(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      // Parse query params
      const input = {
        page: parseInt(req.query.page as string, 10) || 1,
        pageSize: parseInt(req.query.pageSize as string, 10) || 20,
        search: req.query.search as string,
        role: req.query.role as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        sortBy: (req.query.sortBy as any) || 'createdAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
      };

      const envelope = await userService.listUsers(
        principal.tenantId,
        input,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing users:', error);
      res.status(500).json({ error: 'Failed to list users', message: error.message });
    }
  }
);

/**
 * GET /admin/users/:id
 * Get a specific user
 */
router.get(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = req.params.id as string;

      const envelope = await userService.getUser(
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
      logger.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user', message: error.message });
    }
  }
);

/**
 * POST /admin/users
 * Create a new user
 */
router.post(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      // Validate input
      const parseResult = createUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await userService.createUser(
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
      logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user', message: error.message });
    }
  }
);

/**
 * PATCH /admin/users/:id
 * Update a user
 */
router.patch(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = req.params.id as string;

      // Validate input
      const parseResult = updateUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await userService.updateUser(
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
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user', message: error.message });
    }
  }
);

/**
 * DELETE /admin/users/:id
 * Delete (deactivate) a user
 */
router.delete(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = req.params.id as string;
      const hardDelete = req.query.hard === 'true';

      const envelope = await userService.deleteUser(
        principal.tenantId,
        id,
        principal.id,
        hardDelete
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user', message: error.message });
    }
  }
);

/**
 * POST /admin/users/:id/lock
 * Lock a user account
 */
router.post(
  '/:id/lock',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('lock'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = req.params.id as string;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Reason is required for locking account' });
        return;
      }

      const envelope = await userService.lockUser(
        principal.tenantId,
        id,
        principal.id,
        reason
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error locking user:', error);
      res.status(500).json({ error: 'Failed to lock user', message: error.message });
    }
  }
);

/**
 * POST /admin/users/:id/unlock
 * Unlock a user account
 */
router.post(
  '/:id/unlock',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('unlock'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const id = req.params.id as string;

      const envelope = await userService.unlockUser(
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
      logger.error('Error unlocking user:', error);
      res.status(500).json({ error: 'Failed to unlock user', message: error.message });
    }
  }
);

/**
 * POST /admin/users/:id/tenants
 * Add user to a tenant
 */
router.post(
  '/:id/tenants',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { tenantId, roles } = req.body;

      if (!tenantId || !roles || !Array.isArray(roles)) {
        res.status(400).json({ error: 'tenantId and roles array are required' });
        return;
      }

      const envelope = await userService.addUserToTenant(
        id,
        tenantId,
        roles,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error adding user to tenant:', error);
      res.status(500).json({ error: 'Failed to add user to tenant', message: error.message });
    }
  }
);

/**
 * DELETE /admin/users/:id/tenants/:tenantId
 * Remove user from a tenant
 */
router.delete(
  '/:id/tenants/:tenantId',
  ensureAuthenticated,
  buildPrincipal,
  requireUserPermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id, tenantId } = req.params;

      const envelope = await userService.removeUserFromTenant(
        id,
        tenantId,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error removing user from tenant:', error);
      res.status(500).json({ error: 'Failed to remove user from tenant', message: error.message });
    }
  }
);

export default router;
