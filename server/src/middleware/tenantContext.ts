import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import {
  extractTenantContext,
  TenantContext,
  TenantContextError,
} from '../security/tenantContext.js';
import { JWT_SECRET } from '../lib/auth.js';

const HEADER_TENANT_KEYS = ['x-tenant-id', 'x-tenant'];
const ROUTE_TENANT_KEYS = ['tenantId', 'tenant_id', 'tenant'];
const SKIP_PATH_PREFIXES = ['/health', '/metrics', '/status'];

const resolveTenantFromToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.toString().startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;

  if (!bearerToken) return undefined;

  try {
    const decoded = jwt.verify(bearerToken, JWT_SECRET) as any;
    return (
      decoded?.tenantId ||
      decoded?.tenant_id ||
      decoded?.tid ||
      decoded?.['https://summit.intelgraph/tenant']
    );
  } catch (error) {
    logger.warn({ err: error }, 'Failed to decode tenant from JWT');
    return undefined;
  }
};

const pickTenantFromParams = (req: Request): string | undefined => {
  const fromParams = ROUTE_TENANT_KEYS.map((key) => (req.params as any)?.[key])
    .filter(Boolean)
    .shift();

  if (fromParams) return String(fromParams);

  if (req.query?.tenantId) return String(req.query.tenantId);

  return undefined;
};

const pickTenantFromHeaders = (req: Request): string | undefined => {
  for (const key of HEADER_TENANT_KEYS) {
    const value = req.headers[key];
    if (value) return Array.isArray(value) ? value[0] : String(value);
  }
  return undefined;
};

const isTenantRequired = (path: string): boolean => {
  if (SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  return path.startsWith('/api') || path.startsWith('/graphql');
};

const buildTenantContext = (
  req: Request,
  tenantId: string,
  baseContext: TenantContext | null,
): TenantContext => {
  const existingRoles = baseContext?.roles ?? [];
  const subject = baseContext?.subject ||
    (req as any).user?.sub ||
    (req as any).user?.id ||
    '';

  return {
    tenantId,
    roles: existingRoles,
    subject,
  };
};

export interface TenantScopedRequest extends Request {
  tenantId?: string;
  tenantContext?: TenantContext;
}

export const tenantContextMiddleware = (
  req: TenantScopedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const baseContext = extractTenantContext(req, { headerName: 'x-tenant-id' });
  const headerTenant = pickTenantFromHeaders(req);
  const routeTenant = pickTenantFromParams(req);
  const tokenTenant = resolveTenantFromToken(req);
  const userTenant =
    (req as any).user?.tenantId ||
    (req as any).user?.tenant_id ||
    (req as any).user?.defaultTenantId;

  const candidates = [routeTenant, headerTenant, tokenTenant, baseContext?.tenantId, userTenant]
    .filter(Boolean)
    .map(String);

  const uniqueTenants = Array.from(new Set(candidates));

  if (uniqueTenants.length > 1) {
    return res.status(403).json({
      error: 'Tenant context mismatch',
      hint: 'Ensure route, header, and token tenant identifiers match',
    });
  }

  const resolvedTenantId = uniqueTenants[0] || process.env.DEFAULT_TENANT_ID;

  if (!resolvedTenantId && isTenantRequired(req.path)) {
    return res.status(400).json({ error: 'Tenant context is required' });
  }

  if (!resolvedTenantId) {
    return next();
  }

  const tenantContext = buildTenantContext(req, resolvedTenantId, baseContext);

  req.tenantId = tenantContext.tenantId;
  req.tenantContext = tenantContext;
  if ((req as any).user) {
    (req as any).user.tenantId = tenantContext.tenantId;
    (req as any).user.tenant_id = tenantContext.tenantId;
  }

  return next();
};

export const requireTenantContextMiddleware = (
  req: TenantScopedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  try {
    if (!req.tenantId) {
      throw new TenantContextError('Tenant context is required', 400);
    }
    next();
  } catch (error) {
    const status = (error as TenantContextError).status || 400;
    return res.status(status).json({ error: (error as Error).message });
  }
};
