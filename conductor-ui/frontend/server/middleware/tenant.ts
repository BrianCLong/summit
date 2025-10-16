import { Request, Response, NextFunction } from 'express';

interface TenantRequest extends Request {
  db: any;
}

export function setTenant(
  req: TenantRequest,
  _res: Response,
  next: NextFunction,
): void {
  const tenant = req.headers['x-tenant-id'] as string;

  if (!tenant) {
    throw new Error('Missing tenant ID header');
  }

  // Validate tenant ID format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenant)) {
    throw new Error('Invalid tenant ID format');
  }

  // Set the tenant context in the database session
  req.db
    .query("SELECT set_config('app.tenant_id', $1, false)", [tenant])
    .catch((error: Error) => {
      console.error('Failed to set tenant context:', error);
      throw new Error('Failed to set tenant context');
    });

  next();
}
