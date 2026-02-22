// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import { trace } from '@opentelemetry/api';
import { correlationStorage } from '../config/logger.js';
import {
  TenantContext,
  TenantContextOptions,
  extractTenantContext,
} from '../security/tenantContext.js';
import { tenantIsolationGuard } from '../tenancy/TenantIsolationGuard.js';

declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: TenantContext;
  }
}

type TenantResolutionOptions = TenantContextOptions & {
  /**
   * Route param names that may contain a tenant identifier.
   */
  routeParamKeys?: string[];
};

const ROUTE_TENANT_KEYS = ['tenantId', 'tenant_id', 'tenant'];

const coerceStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

const pickRouteTenant = (req: Request, keys: string[]): string | undefined => {
  const params = (req.params || {}) as Record<string, unknown>;
  for (const key of keys) {
    const candidate = params[key];
    if (candidate) return String(candidate);
  }
  return undefined;
};

const ensureTenantConsistency = (
  resolvedTenantId: string,
  candidates: Array<string | undefined>,
): void => {
  const uniqueValues = new Set(
    candidates.filter((value): value is string => Boolean(value)),
  );

  if (uniqueValues.size <= 1) {
    return;
  }

  throw Object.assign(new Error('Tenant identifier mismatch'), {
    status: 409,
  });
};

export const tenantContextMiddleware =
  (options: TenantResolutionOptions = {}) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const baseContext = extractTenantContext(req, options);
      const routeTenant = pickRouteTenant(
        req,
        options.routeParamKeys || ROUTE_TENANT_KEYS,
      );
      const claimTenant =
        (req as any).user?.tenant_id || (req as any).user?.tenantId;
      const resolvedTenantId =
        routeTenant || claimTenant || baseContext?.tenantId;

      if (!resolvedTenantId) {
        return res.status(400).json({
          error: 'tenant_required',
          message:
            'Tenant ID must be provided via JWT claim, route parameter, or header',
        });
      }

      ensureTenantConsistency(resolvedTenantId, [
        routeTenant,
        claimTenant,
        baseContext?.tenantId,
      ]);

      const tenantContext: TenantContext = {
        tenantId: resolvedTenantId,
        environment: baseContext?.environment || 'dev',
        privilegeTier: baseContext?.privilegeTier || 'standard',
        subject:
          baseContext?.subject ||
          (req as any).user?.sub ||
          (req as any).user?.id ||
          '',
        roles: baseContext?.roles || coerceStringArray((req as any).user?.roles),
        inferredEnvironment: baseContext?.inferredEnvironment,
        inferredPrivilege: baseContext?.inferredPrivilege,
      };

      tenantIsolationGuard.assertTenantContext(tenantContext);

      const policyDecision = tenantIsolationGuard.evaluatePolicy(
        tenantContext,
        {
          action: `${req.method}:${req.originalUrl || req.url}`,
          resourceTenantId: routeTenant,
          environment: tenantContext.environment,
        },
      );

      if (!policyDecision.allowed) {
        return res.status(policyDecision.status || 403).json({
          error: 'tenant_denied',
          message:
            policyDecision.reason ||
            'Tenant policy evaluation failed for this request',
        });
      }

      (req as any).tenantContext = tenantContext;
      (req as any).tenant_id = tenantContext.tenantId;
      res.locals.tenantContext = tenantContext;
      res.setHeader('x-tenant-id', tenantContext.tenantId);
      res.setHeader('x-tenant-environment', tenantContext.environment);
      res.setHeader('x-tenant-privilege-tier', tenantContext.privilegeTier);

      // Propagate tenant context to OpenTelemetry and Logging
      const store = correlationStorage.getStore();
      if (store) {
        store.set('tenantId', tenantContext.tenantId);
      }

      const span = trace.getActiveSpan();
      if (span) {
        span.setAttribute('tenant.id', tenantContext.tenantId);
        span.setAttribute('tenant.env', tenantContext.environment);
      }

      return next();
    } catch (error: any) {
      const status = (error as any).status || 400;
      return res.status(status).json({
        error: 'tenant_context_error',
        message:
          (error as Error).message ||
          'Unable to resolve tenant context for this request',
      });
    }
  };

export default tenantContextMiddleware;
