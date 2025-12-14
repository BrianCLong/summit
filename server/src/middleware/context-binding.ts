import { Request, Response, NextFunction } from 'express';
import { context, getContext } from '../observability/context.js';

/**
 * Middleware to update the RequestContext with authenticated user details.
 * Must be placed AFTER authentication middleware (passport, jwt, etc.).
 */
export const contextBindingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const currentCtx = getContext();
  if (!currentCtx) {
    return next();
  }

  const user = (req as any).user;
  if (user) {
    // We can't mutate the context object directly if we want strict immutability,
    // but AsyncLocalStorage store is mutable object.
    // However, best practice with ALS is to run a new context if we want to change it cleanly,
    // but that would require nesting middleware execution which is hard here.
    // Since we passed an object reference to context.run in observabilityMiddleware,
    // mutating that object properties works for the rest of the request lifetime.

    if (user.tenant_id || user.tenantId) {
        currentCtx.tenantId = user.tenant_id || user.tenantId;
    }

    currentCtx.principal = {
        id: user.sub || user.id,
        role: user.role,
        orgId: user.orgId
    };
  }

  next();
};
