import { Request } from 'express';
import {
  TenantContext,
  TenantEnvironment,
  TenantPrivilegeTier,
} from '../tenancy/types.js';

export interface TenantContextOptions {
  headerName?: string;
  strict?: boolean;
  environmentHeader?: string;
  privilegeHeader?: string;
}

const DEFAULT_TENANT_HEADER = 'x-tenant-id';
const DEFAULT_ENV_HEADER = 'x-tenant-environment';
const DEFAULT_PRIVILEGE_HEADER = 'x-tenant-privilege-tier';

const normalizeRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles.map(String);
  return [String(roles)];
};

const normalizeEnvironment = (
  environment: unknown,
  fallback: TenantEnvironment,
): { value: TenantEnvironment; inferred: boolean } => {
  const env = String(environment || '').toLowerCase();
  if (env.startsWith('prod')) {
    return { value: 'prod', inferred: false };
  }
  if (env.startsWith('stag')) {
    return { value: 'staging', inferred: false };
  }
  if (env) {
    return { value: 'dev', inferred: true };
  }
  return { value: fallback, inferred: true };
};

const normalizePrivilegeTier = (
  tier: unknown,
): { value: TenantPrivilegeTier; inferred: boolean } => {
  const normalized = String(tier || '').toLowerCase();
  if (['break-glass', 'breakglass'].includes(normalized)) {
    return { value: 'break-glass', inferred: false };
  }
  if (['elevated', 'admin'].includes(normalized)) {
    return { value: 'elevated', inferred: false };
  }
  if (normalized) {
    return { value: 'standard', inferred: true };
  }
  return { value: 'standard', inferred: true };
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
  const environmentHeader = options.environmentHeader || DEFAULT_ENV_HEADER;
  const privilegeHeader = options.privilegeHeader || DEFAULT_PRIVILEGE_HEADER;
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
  const { value: environment, inferred: inferredEnvironment } =
    normalizeEnvironment(
      req.headers[environmentHeader] ||
        (authContext.environment as string) ||
        process.env.NODE_ENV ||
        'dev',
      'dev',
    );
  const { value: privilegeTier, inferred: inferredPrivilege } =
    normalizePrivilegeTier(
      req.headers[privilegeHeader] ||
        (authContext.privilegeTier as string) ||
        (authContext.tier as string),
    );

  return {
    tenantId: String(tenantId),
    roles,
    subject: subject ? String(subject) : '',
    environment,
    privilegeTier,
    inferredEnvironment,
    inferredPrivilege,
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
