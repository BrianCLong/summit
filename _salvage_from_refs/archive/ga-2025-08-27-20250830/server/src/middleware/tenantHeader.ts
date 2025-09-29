import { Request, Response, NextFunction } from 'express';

export function tenantHeader(required = true) {
  return function (req: Request, res: Response, next: NextFunction) {
    const headerTenant = (req.headers['x-tenant-id'] as string) || (req.headers['x-tenant'] as string) || '';
    (req as any).tenantId = headerTenant || null;
    if (required && !headerTenant) {
      return res.status(400).json({ error: 'tenant_required' });
    }
    next();
  };
}
