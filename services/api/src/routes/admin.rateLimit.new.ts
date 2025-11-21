/**
 * Admin Rate Limit Management Routes
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Router } from 'express';
import { createAdminRateLimitRouter } from '@intelgraph/rate-limiter/dist/admin/routes.js';
import { rateLimiter, metricsCollector } from '../middleware/rateLimit.new.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Require authentication for all admin routes
router.use(authMiddleware);

// Require internal tier for admin access
router.use((req, res, next) => {
  const tier = (req as any).user?.tier || (req as any).tenant?.plan;

  if (tier !== 'internal') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Internal tier required',
    });
  }

  next();
});

// Mount rate limit admin router
router.use('/', createAdminRateLimitRouter(rateLimiter, metricsCollector));

export { router as adminRateLimitRouter };
