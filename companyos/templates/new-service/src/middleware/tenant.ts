/**
 * Tenant Context Middleware
 * Extracts and validates tenant context for all requests
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface TenantContext {
  tenantId: string;
  tier: string;
  region: string;
  features: Record<string, boolean>;
  quotas: {
    apiCallsPerHour: number;
    storageGb: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Tenant context middleware
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.authContext?.tenantId || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    // In production, fetch tenant details from database/cache
    // For template, use simplified context
    const tenantContext: TenantContext = {
      tenantId,
      tier: req.headers['x-tenant-tier'] as string || 'STARTER',
      region: req.headers['x-tenant-region'] as string || 'us-east-1',
      features: {},
      quotas: {
        apiCallsPerHour: 1000,
        storageGb: 10,
      },
    };

    req.tenantContext = tenantContext;

    // Add tenant ID to all log entries
    logger.setContext({ tenantId });

    next();
  } catch (error) {
    logger.error('Tenant middleware error', { error });
    res.status(500).json({ error: 'Tenant context error' });
  }
}

/**
 * Require tenant context middleware
 */
export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    next();
  };
}
