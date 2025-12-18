/**
 * OPA Authorization Middleware
 * Pre-wired OPA integration for the paved road template
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export interface AuthContext {
  userId: string;
  roles: string[];
  tenantId?: string;
  mfaVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

/**
 * Authentication middleware - extracts auth context from headers/token
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract auth token (simplified - replace with real JWT validation)
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // In production, validate JWT and extract claims
    // For template, we'll use header-based auth for simplicity
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const roles = (req.headers['x-user-roles'] as string || '').split(',').filter(Boolean);
    const tenantId = req.headers['x-tenant-id'] as string;
    const mfaVerified = req.headers['x-mfa-verified'] === 'true';

    req.authContext = {
      userId,
      roles,
      tenantId,
      mfaVerified,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({ error: 'Authentication service error' });
  }
}

/**
 * Permission check middleware - calls OPA for authorization
 */
export function requirePermission(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authContext = req.authContext;

    if (!authContext) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const decision = await checkOPAPermission(authContext, action, req);

      if (!decision.allow) {
        logger.warn('Permission denied', {
          userId: authContext.userId,
          action,
          reason: decision.reason,
        });

        res.status(403).json({
          error: 'Permission denied',
          reason: decision.reason,
        });
        return;
      }

      // Check if MFA is required
      if (decision.requires_mfa && !authContext.mfaVerified) {
        res.status(403).json({
          error: 'MFA required',
          code: 'MFA_REQUIRED',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('OPA check failed', { error, action });

      // Fail open in dev, closed in prod
      if (config.nodeEnv === 'development') {
        logger.warn('OPA unavailable, failing open in development');
        next();
      } else {
        res.status(503).json({ error: 'Authorization service unavailable' });
      }
    }
  };
}

/**
 * Call OPA for policy decision
 */
async function checkOPAPermission(
  authContext: AuthContext,
  action: string,
  req: Request
): Promise<{ allow: boolean; reason?: string; requires_mfa?: boolean }> {
  const input = {
    subject: {
      id: authContext.userId,
      tenant_id: authContext.tenantId,
      roles: authContext.roles,
      mfa_verified: authContext.mfaVerified,
    },
    resource: {
      type: getResourceType(req.path),
      tenant_id: authContext.tenantId,
    },
    action,
    environment: {
      timestamp: new Date().toISOString(),
    },
  };

  const response = await fetch(`${config.opaUrl}/v1/data/companyos/authz/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`OPA returned ${response.status}`);
  }

  const result = await response.json();
  return result.result || { allow: false, reason: 'No policy result' };
}

function getResourceType(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[1] || 'unknown';
}
