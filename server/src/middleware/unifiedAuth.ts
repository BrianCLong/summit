import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { Principal, RoleKey, TenantId } from '../auth/types.js';
import logger from '../utils/logger.js';
import { getPostgresPool } from '../config/database.js';

const authService = new AuthService();
const pool = getPostgresPool();

// Header keys
const HEADER_TENANT_ID = 'x-tenant-id';
const HEADER_API_KEY = 'x-api-key';

export async function unifiedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    let principal: Principal | null = null;
    const requestedTenantId = req.headers[HEADER_TENANT_ID] as string;

    // 1. Try Bearer Token (Human/User)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length);
      const user = await authService.verifyToken(token);

      if (user) {
        // Fetch user's tenants and roles
        const memberships = await getUserTenants(user.id);

        // Determine effective tenant
        let effectiveTenantId = requestedTenantId || user.defaultTenantId || memberships[0]?.tenantId;

        // Verify access to requested tenant
        if (requestedTenantId) {
          const membership = memberships.find(m => m.tenantId === requestedTenantId);
          if (!membership) {
            return res.status(403).json({ error: 'Access denied to requested tenant' });
          }
          effectiveTenantId = requestedTenantId;
        }

        if (!effectiveTenantId) {
           // Should not happen after migration backfill, but handle edge case
           return res.status(401).json({ error: 'User has no tenant association' });
        }

        // Get roles for this tenant
        const activeMembership = memberships.find(m => m.tenantId === effectiveTenantId);
        // Fallback to user.role if no specific membership role (legacy compat)
        const roles = activeMembership ? (activeMembership.roles as RoleKey[]) : [user.role as RoleKey];

        // Construct Principal
        principal = {
          id: user.id,
          email: user.email,
          tenantId: effectiveTenantId,
          tenantIds: memberships.map(m => m.tenantId),
          roles: roles,
          scopes: [], // Will be expanded by RBAC logic later
          authMethod: 'jwt',
          isSystem: false
        };
      }
    }

    // 2. Try API Key (Machine)
    if (!principal) {
      const apiKey = req.headers[HEADER_API_KEY] as string;
      if (apiKey) {
        // TODO: Implement API Key verification against DB
        // For MVP/Transition, we might check env vars or a simple table
        // This is a placeholder for the "External API" prompt integration
        // For now, if valid system key:
        if (process.env.SYSTEM_API_KEY && apiKey === process.env.SYSTEM_API_KEY) {
             principal = {
               id: 'system',
               tenantId: requestedTenantId || 'global',
               roles: ['system.internal', 'tenant.admin'],
               scopes: ['*'],
               authMethod: 'apiKey',
               isSystem: true
             };
        }
      }
    }

    // 3. Attach to Request
    if (principal) {
      req.principal = principal;
      // Legacy compatibility
      (req as any).user = {
        id: principal.id,
        role: principal.roles[0], // primary role
        tenantId: principal.tenantId
      };
      (req as any).tenantId = principal.tenantId;
    }

    next();
  } catch (error) {
    logger.error('Auth Middleware Error:', error);
    return res.status(500).json({ error: 'Internal Authentication Error' });
  }
}

// Helper to fetch memberships
async function getUserTenants(userId: string) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT tenant_id, roles FROM user_tenants WHERE user_id = $1`,
      [userId]
    );
    // Normalize keys
    return res.rows.map(r => ({
      tenantId: r.tenant_id,
      roles: r.roles
    }));
  } finally {
    client.release();
  }
}

/**
 * Require valid authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.principal) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
