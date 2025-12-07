import { Request, Response, NextFunction } from 'express';
import { PolicyEngine, PolicyContext, PolicyEffect } from '../services/PolicyEngine.js';
import logger from '../utils/logger.js';

/**
 * Middleware to enforce governance policy on a route.
 * Requires that `req.user` is populated (auth middleware run before).
 *
 * @param action The action being performed (e.g., 'read', 'write', 'delete')
 * @param resourceType The type of resource (e.g., 'investigation', 'node')
 * @param resourceIdExtractor Optional function to extract resource ID from request
 */
export const enforcePolicy = (
  action: string,
  resourceType: string,
  resourceIdExtractor?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const engine = PolicyEngine.getInstance();
      const resourceId = resourceIdExtractor ? resourceIdExtractor(req) : req.params.id;

      // Extract Warrant/Authority from headers
      const warrantHeader = req.headers['x-warrant-token'];
      let warrant;
      if (warrantHeader) {
          try {
             // In a real system, verify and decode the token.
             // Here we assume it's a JSON string or simplified ID for prototype.
             warrant = JSON.parse(warrantHeader as string);
          } catch (e) {
             logger.warn('Invalid warrant header format');
          }
      }

      const context: PolicyContext = {
        subject: {
            id: (req.user as any).id,
            role: (req.user as any).role,
            tenantId: (req.user as any).tenant_id || (req.user as any).tenantId,
            ...(req.user as any)
        },
        resource: {
            type: resourceType,
            id: resourceId,
            tenantId: (req as any).tenantId || (req.user as any).tenant_id // Assuming resource implies current tenant context
        },
        action,
        environment: {
            time: new Date(),
            ip: req.ip
        },
        warrant
      };

      const decision = engine.evaluate(context);

      if (decision.effect === PolicyEffect.DENY) {
        logger.warn(`Access Denied: ${decision.reason}`, {
            userId: (req.user as any).id,
            resourceType,
            action,
            policyId: decision.policyId
        });
        return res.status(403).json({
            error: 'Access Denied',
            reason: decision.reason,
            policyId: decision.policyId
        });
      }

      next();
    } catch (error) {
      logger.error('Policy Enforcement Error:', error);
      res.status(500).json({ error: 'Internal Server Error during policy check' });
    }
  };
};
