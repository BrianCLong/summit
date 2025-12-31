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
  strict: boolean = false,
): { value: TenantEnvironment; inferred: boolean } => {
  const env = String(environment || '').toLowerCase();

  if (env.startsWith('prod')) {
    return { value: 'prod', inferred: false };
  }
  if (env.startsWith('stag')) {
    return { value: 'staging', inferred: false };
  }
  if (env.startsWith('dev')) {
    return { value: 'dev', inferred: false };
  }

  // If we have a value but it didn't match known prefixes, strictly fail or default?
  // If we have NO value (env is empty string):
  if (!env) {
    if (strict) {
       throw new TenantContextError('Tenant environment header is required in strict mode', 400);
    }
    // In non-strict mode, we fall back
    if (fallback) {
      return { value: fallback, inferred: true };
    }
  }

  // If we have a value that is unknown (e.g. "foo"), map to dev?
  // In strict mode, unknown environments should probably be rejected or mapped carefully.
  // For now, let's keep existing "if (env) return dev" logic for non-strict compat,
  // but in strict mode we might want to be tighter.

  if (env) {
     return { value: 'dev', inferred: true };
  }

  return { value: fallback, inferred: true };
};

const normalizePrivilegeTier = (
  tier: unknown,
  strict: boolean = false,
): { value: TenantPrivilegeTier; inferred: boolean } => {
  const normalized = String(tier || '').toLowerCase();

  if (['break-glass', 'breakglass'].includes(normalized)) {
    return { value: 'break-glass', inferred: false };
  }
  if (['elevated', 'admin'].includes(normalized)) {
    return { value: 'elevated', inferred: false };
  }
  if (['standard', 'default'].includes(normalized)) {
    return { value: 'standard', inferred: false };
  }

  if (!normalized && strict) {
      // In strict mode, we might want to REQUIRE privilege tier,
      // OR we can default to 'standard' as it is the safest least-privilege default.
      // Unlike environment (which can be ambiguous), privilege defaulting to standard is usually safe.
      // However, the prompt says "No implicit or global tenant state".
      // Explicit is better.
      throw new TenantContextError('Tenant privilege header is required in strict mode', 400);
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

  // Determine strictness
  const isStrict = options.strict ?? (process.env.STRICT_TENANCY === 'true' || process.env.NODE_ENV === 'production');

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

  const rawEnv = req.headers[environmentHeader] || (authContext.environment as string);
  // Only use fallback if NOT strict. In strict mode, rawEnv must be present.
  const envInput = rawEnv || (isStrict ? '' : (process.env.NODE_ENV || 'dev'));

  const { value: environment, inferred: inferredEnvironment } =
    normalizeEnvironment(
      envInput,
      'dev', // fallback for non-strict
      isStrict
    );

  const rawPrivilege = req.headers[privilegeHeader] ||
        (authContext.privilegeTier as string) ||
        (authContext.tier as string);

  const { value: privilegeTier, inferred: inferredPrivilege } =
    normalizePrivilegeTier(
      rawPrivilege,
      isStrict
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
