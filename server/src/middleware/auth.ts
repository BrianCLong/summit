// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';
import { policyService } from '../services/PolicyService.js';
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


/**
 * authorize middleware
 * Provides OPA-backed ABAC for REST routes.
 * @param action The action to verify (e.g., 'run:detection')
 * @param getResource Optional function to extract resource context from the request
 */
export function authorize(
  action: string,
  getResource?: (req: Request) => Promise<Record<string, any>> | Record<string, any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const resource = getResource ? await getResource(req) : {};

      const policyContext = {
        principal: {
          ...user,
          missionTags: user.missionTags,
          compartment: user.compartment,
        },
        resource,
        action,
        environment: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          time: new Date().toISOString()
        }
      };

      const decision = await policyService.evaluate(policyContext);

      if (decision.allow) {
        return next();
      }

      logger.warn('Access denied via ABAC authorize middleware', {
        userId: user.id,
        action,
        resource,
        reason: decision.reason
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: decision.reason || 'Security policy denied access'
      });
    } catch (error: any) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({ error: 'Internal Server Error during authorization' });
    }
  };
}

export function ensureRole(requiredRole: string | string[]) {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user || !user.role) return res.status(401).json({ error: 'Unauthorized' });

    if (roles.includes(user.role)) {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
  };
}

// Export aliases for compatibility
export const authMiddleware = ensureAuthenticated;
export const auth = ensureAuthenticated;
