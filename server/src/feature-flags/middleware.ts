/**
 * Feature Flag Middleware Setup
 *
 * Express middleware for feature flags
 */

import { createFeatureFlagMiddleware } from '@intelgraph/feature-flags/middleware';
import { getFeatureFlagService } from './setup.js';
import type { Request } from 'express';
import type { FlagContext } from '@intelgraph/feature-flags';

/**
 * Build feature flag context from request
 */
function buildFlagContext(req: Request): Partial<FlagContext> {
  const user = (req as any).user;

  return {
    userId: user?.id || user?.userId,
    userEmail: user?.email,
    userRole: user?.role || user?.roles,
    tenantId: user?.tenantId || (req as any).tenant?.id,
    environment: process.env.NODE_ENV || 'development',
    sessionId: (req as any).sessionId || req.sessionID,
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
export async function exposeFeatureFlags(req: Request, res: any): Promise<void> {
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
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch feature flags',
    });
  }
}
