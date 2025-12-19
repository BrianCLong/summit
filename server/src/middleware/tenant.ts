import { NextFunction, Request, Response } from 'express';
import {
  TenantContext,
  TenantContextError,
  TenantContextOptions,
  extractTenantContext,
  requireTenantContext,
} from '../security/tenantContext.js';

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

      req.tenant = context;
      return next();
    } catch (error) {
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
