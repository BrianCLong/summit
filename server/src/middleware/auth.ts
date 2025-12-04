import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';
import { getAuditSystem } from '../audit/advanced-audit-system.js';
import logger from '../utils/logger.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const authService = new AuthService();

export async function ensureAuthenticated(
  req: AuthenticatedRequest,
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
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (authService.hasPermission(user, permission)) {
      return next();
    } else {
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
      } catch (error) {
         if (process.env.NODE_ENV !== 'test') {
             logger.error('Failed to log audit event', error);
         }
      }
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

// Export aliases for compatibility
export const authMiddleware = ensureAuthenticated;
export const auth = ensureAuthenticated;
