// @ts-nocheck
/**
 * Feature Flag Middleware Setup
 *
 * Express middleware for feature flags
 */

import { createFeatureFlagMiddleware } from '@intelgraph/feature-flags/middleware';
import { getFeatureFlagService } from './setup.js';
import type { Request, Response } from 'express';
import type { FlagContext } from '@intelgraph/feature-flags';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    role?: string;
    roles?: string;
    tenantId?: string;
    attributes?: Record<string, unknown>;
  };
  tenant?: {
    id?: string;
  };
  sessionId?: string;
}

/**
 * Build feature flag context from request
 */
function buildFlagContext(req: Request): Partial<FlagContext> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  return {
    userId: user?.id || user?.userId,
    userEmail: user?.email,
    userRole: user?.role || user?.roles,
    tenantId: user?.tenantId || authReq.tenant?.id,
    environment: process.env.NODE_ENV || 'development',
    sessionId: authReq.sessionId || req.sessionID,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    attributes: {
      path: req.path,
      method: req.method,
      // Add custom attributes as needed
      ...(user?.attributes || {}),
    },
  };
}

/**
 * Feature flag middleware
 */
export const featureFlagMiddleware = createFeatureFlagMiddleware({
  service: getFeatureFlagService(),
  contextBuilder: buildFlagContext,
  skipRoutes: [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/_next',
    '/static',
  ],
  skipMethods: ['OPTIONS', 'HEAD'],
});

/**
 * Expose feature flags endpoint
 */
export async function exposeFeatureFlags(req: Request, res: Response): Promise<void> {
  try {
    const service = getFeatureFlagService();
    const context = buildFlagContext(req);
    const flags = await service.getAllFlags(context);

    // Filter out internal flags
    const publicFlags = Object.fromEntries(
      Object.entries(flags)
        .filter(([key]) => !key.startsWith('internal-'))
        .filter(([key]) => !key.startsWith('admin-'))
    );

    res.json({
      flags: publicFlags,
      context: {
        userId: context.userId,
        tenantId: context.tenantId,
        environment: context.environment,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch feature flags',
    });
  }
}
