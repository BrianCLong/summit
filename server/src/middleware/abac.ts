import { Request, Response, NextFunction } from 'express';

// Minimal ABAC Middleware for prototype
// In production, this would query OPA
export const ensurePolicy = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Simulate OPA Policy Check
      // Policy: 'admin' can do anything. 'user' can read/write own tenant.
      const normalizedRole = (user.role || '').toString().toLowerCase();
      const allowed =
        normalizedRole === 'admin' ||
        (user.tenant_id && req.body.tenantId === user.tenant_id) ||
        (user.tenantId && req.body.tenantId === user.tenantId);

      if (!allowed) {
        return res.status(403).json({ error: 'Access Denied by Policy' });
      }

      next();
    } catch (error: any) {
      console.error('ABAC Check Failed', error);
      res.status(500).json({ error: 'Internal Policy Error' });
    }
  };
};
