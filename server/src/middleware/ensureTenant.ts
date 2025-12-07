import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export function ensureTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] || (req as any).user?.tenantId;

  if (!tenantId) {
    logger.warn('Request missing tenant context', {
      path: req.path,
      user: (req as any).user?.id,
    });
    // For MVP, we might allow some requests without tenantId (e.g. public endpoints, or login)
    // But for protected routes, it's mandatory.
    // Assuming ensureAuthenticated runs before this.

    // If it's a public path, skip.
    const publicPaths = ['/metrics', '/health', '/api/auth/login', '/api/auth/register'];
    if (publicPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    return res.status(400).json({ error: 'Missing Tenant ID' });
  }

  // Attach to request context
  (req as any).tenantId = tenantId;
  next();
}
