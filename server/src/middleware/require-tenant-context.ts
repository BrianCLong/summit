import { NextFunction, Request, Response } from 'express';
import {
  TENANT_CONTEXT_ERROR_CODE,
  TENANT_CONTEXT_MISMATCH_CODE,
  TenantContextHttpError,
  requireTenantContext,
} from '../tenancy/getTenantContext.js';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: ReturnType<typeof requireTenantContext>;
    }
  }
}

export const requireTenantContextMiddleware = () =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantContext = requireTenantContext(req);
      (req as any).tenantContext = tenantContext;
      res.locals.tenantContext = tenantContext;
      return next();
    } catch (error: any) {
      const httpError = error as TenantContextHttpError;
      const status = httpError.status || 400;
      const code =
        httpError.code ||
        (status === 409
          ? TENANT_CONTEXT_MISMATCH_CODE
          : TENANT_CONTEXT_ERROR_CODE);

      return res.status(status).json({
        error: code,
        message: httpError.message,
      });
    }
  };

export default requireTenantContextMiddleware;
