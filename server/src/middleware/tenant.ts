// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import {
  TenantContext,
  TenantContextError,
  TenantContextOptions,
  extractTenantContext,
  requireTenantContext,
} from '../security/tenantContext.js';
import { tenantIsolationGuard } from '../tenancy/TenantIsolationGuard.js';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantContext;
  }
}

export interface TenantMiddlewareOptions extends TenantContextOptions {}

export const tenant = (options: TenantMiddlewareOptions = {}) => {
  const { strict = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = strict
        ? requireTenantContext(req, options)
        : extractTenantContext(req, options);

      if (!context) {
        return res.status(400).json({
          error: 'tenant_required',
          message: 'Tenant context is required to process this request',
        });
      }

      tenantIsolationGuard.assertTenantContext(context);

      const policyDecision = tenantIsolationGuard.evaluatePolicy(context, {
        action: `${req.method}:${req.baseUrl || ''}${req.path}`,
        resourceTenantId:
          (req.params && (req.params as any).tenantId) ||
          (req.body as any)?.tenantId ||
          (req.query as any)?.tenantId,
        environment: context.environment,
      });

      if (!policyDecision.allowed) {
        return res.status(policyDecision.status || 403).json({
          error: 'tenant_denied',
          message:
            policyDecision.reason ||
            'Tenant policy evaluation failed for this request',
        });
      }

      req.tenant = context;
      res.setHeader('X-Tenant-Id', context.tenantId);
      res.setHeader('X-Tenant-Environment', context.environment);
      res.setHeader('X-Tenant-Privilege-Tier', context.privilegeTier);
      return next();
    } catch (error: any) {
      const err = error as TenantContextError;
      const status = err.status || 401;

      return res.status(status).json({
        error: 'tenant_required',
        message: err.message,
      });
    }
  };
};

export default tenant;
