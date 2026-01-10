import { Request } from 'express';
import { TenantContext, TenantEnvironment, TenantPrivilegeTier } from './types.js';

export const TENANT_CONTEXT_ERROR_CODE = 'TENANT_CONTEXT_REQUIRED';
export const TENANT_CONTEXT_MISMATCH_CODE = 'TENANT_CONTEXT_MISMATCH';

export class TenantContextHttpError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = TENANT_CONTEXT_ERROR_CODE) {
    super(message);
    this.name = 'TenantContextHttpError';
    this.status = status;
    this.code = code;
  }
}

const TENANT_HEADER = 'x-tenant-id';
const FALLBACK_TENANT_HEADER = 'x-tenant';
const ENV_HEADER = 'x-tenant-environment';
const PRIVILEGE_HEADER = 'x-tenant-privilege-tier';

type AuthLike = Record<string, unknown> | undefined;

const coerceRoles = (roles: unknown): string[] | undefined => {
  if (!roles) return undefined;
  if (Array.isArray(roles)) return roles.map(String);
  return [String(roles)];
};

const resolveEnvironment = (
  candidate: unknown,
  fallback: TenantEnvironment = 'dev',
): TenantEnvironment => {
  const value = (candidate || '').toString().toLowerCase();
  if (value.startsWith('prod')) return 'prod';
  if (value.startsWith('stag')) return 'staging';
  if (value.startsWith('dev')) return 'dev';
  return fallback;
};

const resolvePrivilege = (
  candidate: unknown,
  fallback: TenantPrivilegeTier = 'standard',
): TenantPrivilegeTier => {
  const normalized = (candidate || '').toString().toLowerCase();
  if (['break-glass', 'breakglass'].includes(normalized)) return 'break-glass';
  if (['elevated', 'admin'].includes(normalized)) return 'elevated';
  if (normalized) return 'standard';
  return fallback;
};

const pickAuthContext = (req: Request): AuthLike =>
  (req as any).auth || (req as any).user;

export const getTenantContext = (req: Request): TenantContext | null => {
  const authContext = pickAuthContext(req) || {};
  const tenantFromHeader =
    (req.headers[TENANT_HEADER] as string) ||
    (req.headers[FALLBACK_TENANT_HEADER] as string);
  const tenantFromAuth =
    (authContext.tenantId as string) || (authContext.tenant_id as string);

  if (tenantFromHeader && tenantFromAuth && tenantFromHeader !== tenantFromAuth) {
    throw new TenantContextHttpError(
      'Tenant header does not match authenticated tenant claim',
      409,
      TENANT_CONTEXT_MISMATCH_CODE,
    );
  }

  const tenantId = tenantFromHeader || tenantFromAuth;
  if (!tenantId) return null;

  const environment = resolveEnvironment(
    req.headers[ENV_HEADER] || (authContext as any)?.environment || process.env.NODE_ENV,
  );
  const privilegeTier = resolvePrivilege(
    req.headers[PRIVILEGE_HEADER] || (authContext as any)?.privilegeTier,
  );
  const subject =
    (authContext?.sub as string) ||
    (authContext?.userId as string) ||
    (authContext?.id as string);

  return {
    tenantId: String(tenantId),
    environment,
    privilegeTier,
    subject: subject ? String(subject) : undefined,
    roles: coerceRoles((authContext as any)?.roles),
    inferredEnvironment: !req.headers[ENV_HEADER],
    inferredPrivilege: !req.headers[PRIVILEGE_HEADER],
  };
};

export const requireTenantContext = (req: Request): TenantContext => {
  const context = getTenantContext(req);

  if (!context) {
    throw new TenantContextHttpError('Tenant context is required for this operation');
  }

  return context;
};
