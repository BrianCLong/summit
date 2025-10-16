import { Request, Response, NextFunction } from 'express';
import { opaPolicyEngine } from '../conductor/governance/opa-integration.js';
import { RequestContext } from './context-binding.js';
import logger from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      policyDecision?: any; // Define a more specific type if available
    }
  }
}

export function maestroAuthzMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestContext = req.context as RequestContext; // Assert req.context is present

  if (!requestContext) {
    logger.error('Maestro authorization middleware: Request context not found');
    return res
      .status(500)
      .json({ error: 'Internal server error: Missing request context' });
  }

  // Map HTTP method to action for OPA policy
  const action = req.method.toLowerCase();
  // Extract resource from path (e.g., /api/maestro/v1/pipelines -> pipelines)
  const pathParts = req.path.split('/').filter(Boolean);
  const resource = pathParts.length > 3 ? pathParts[3] : 'unknown'; // /api/maestro/v1/resource

  const policyContext = {
    tenantId: requestContext.tenantId,
    userId: (req as any).user?.id, // Assuming user ID is available on req.user
    role: (req as any).user?.role || 'user', // Assuming user role is available on req.user
    action: action,
    resource: resource,
    resourceAttributes: {
      // Add any relevant attributes from the request body or params
      ...req.body,
      ...req.params,
      ...req.query,
    },
    sessionContext: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: Date.now(),
      sessionId: (req as any).sessionID, // Assuming sessionID is available on req
    },
    businessContext: {
      // Add any relevant business context
    },
  };

  opaPolicyEngine
    .evaluatePolicy('maestro/authz', policyContext)
    .then((decision) => {
      if (!decision.allow) {
        logger.warn('Maestro authorization denied by OPA', {
          tenantId: requestContext.tenantId,
          userId: (req as any).user?.id,
          action,
          resource,
          reason: decision.reason,
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: decision.reason || 'Access denied by policy',
          auditContext: decision.auditLog,
        });
      }
      // Attach policy decision to request for downstream use
      (req as any).policyDecision = decision;
      next();
    })
    .catch((error) => {
      logger.error('Error evaluating Maestro authorization policy', {
        error: error.message,
        policyContext,
      });
      res
        .status(500)
        .json({ error: 'Internal server error: Policy evaluation failed' });
    });
}
