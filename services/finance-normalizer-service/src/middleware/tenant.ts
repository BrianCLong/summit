import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errorHandler.js';

export interface TenantRequest extends Request {
  tenantId: string;
  userId?: string;
}

export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!tenantId) {
    // Allow in development mode without tenant
    if (process.env.NODE_ENV === 'development') {
      (req as TenantRequest).tenantId = 'dev-tenant';
      (req as TenantRequest).userId = userId || 'dev-user';
      next();
      return;
    }
    throw new UnauthorizedError('Missing X-Tenant-ID header');
  }

  (req as TenantRequest).tenantId = tenantId;
  (req as TenantRequest).userId = userId;

  next();
}
