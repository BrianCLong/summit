import { RequestHandler } from 'express';

const TENANT_HEADER = (process.env.TENANT_HEADER || 'x-tenant-id').toLowerCase();

const sanitizeTenant = (raw?: string): string => {
  if (!raw) return 'public';
  const trimmed = raw.trim();
  if (!trimmed) return 'public';
  return trimmed.slice(0, 64);
};

export const resolveTenantId = (req: { headers: Record<string, unknown> }): string => {
  const headerValue = req.headers[TENANT_HEADER];
  if (Array.isArray(headerValue)) {
    return sanitizeTenant(headerValue[0]);
  }
  if (typeof headerValue === 'string') {
    return sanitizeTenant(headerValue);
  }
  return 'public';
};

export const tenantResolver: RequestHandler = (req, _res, next) => {
  const tenantId = resolveTenantId(req as any);
  (req as any).tenantId = tenantId;
  next();
};

