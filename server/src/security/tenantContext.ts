import { Request } from 'express';

export interface TenantContext {
  tenantId: string;
  roles: string[];
  subject: string;
}

export interface TenantContextOptions {
  headerName?: string;
  strict?: boolean;
}

const DEFAULT_TENANT_HEADER = 'x-tenant-id';

const normalizeRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles.map(String);
  return [String(roles)];
};

const extractAuthContext = (req: Request): Record<string, unknown> => {
  const authContext = (req as any).auth || (req as any).user || {};
  return authContext;
};

export const extractTenantContext = (
  req: Request,
  options: TenantContextOptions = {},
): TenantContext | null => {
  const headerName = options.headerName || DEFAULT_TENANT_HEADER;
  const tenantFromHeader =
    (req.headers[headerName] as string) || (req.headers['x-tenant'] as string);
  const authContext = extractAuthContext(req);
  const tenantFromAuth =
    (authContext.tenantId as string) || (authContext.tenant_id as string);

  const tenantId = tenantFromHeader || tenantFromAuth;

  if (!tenantId) {
    return null;
  }

  const subject =
    (authContext.sub as string) ||
    (authContext.id as string) ||
    (authContext.userId as string) ||
    '';
  const roles = normalizeRoles(authContext.roles);

  return {
    tenantId: String(tenantId),
    roles,
    subject: subject ? String(subject) : '',
  };
};

export class TenantContextError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'TenantContextError';
    this.status = status;
  }
}

export const requireTenantContext = (
  req: Request,
  options: TenantContextOptions = {},
): TenantContext => {
  const context = extractTenantContext(req, options);

  if (!context) {
    throw new TenantContextError('Tenant context is required', 400);
  }

  if (!context.subject) {
    throw new TenantContextError('Subject is required for tenant context', 401);
  }

  return context;
};
