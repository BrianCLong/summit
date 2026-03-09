// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';
import { getAuditSystem } from '../audit/advanced-audit-system.js';
import logger from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';

const authService = new AuthService();

export async function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.headers['x-access-token'] as string) || null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await authService.verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requirePermission(permission: string) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (authService.hasPermission(user, permission)) {
      (metrics as any).pbacDecisionsTotal?.inc({ decision: 'allow' });
      return next();
    } else {
      (metrics as any).pbacDecisionsTotal?.inc({ decision: 'deny' });
      try {
        getAuditSystem().recordEvent({
          eventType: 'policy_violation',
          action: 'check_permission',
          outcome: 'failure',
          userId: user.id,
          tenantId: user.tenantId || 'system',
          serviceId: 'api-gateway',
          resourceType: 'endpoint',
          resourceId: req.originalUrl,
          message: `Permission denied: ${permission}`,
          level: 'warn',
          details: { permission, role: user.role }
        });
      } catch (error: any) {
         if (process.env.NODE_ENV !== 'test') {
             logger.error('Failed to log audit event', error);
         }
      }
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

export function ensureRole(requiredRole: string | string[]) {
  const roles = (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map(r =>
    r.toUpperCase(),
  );
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user || !user.role) return res.status(401).json({ error: 'Unauthorized' });

    const userRole = user.role.toUpperCase();
    if (roles.includes(userRole)) {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
  };
}

// Export aliases for compatibility
export const authMiddleware = ensureAuthenticated;
export const auth = ensureAuthenticated;
