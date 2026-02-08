import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { opaPolicyEngine } from '../conductor/governance/opa-integration.js';
import logger from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      policyDecision?: any; // Define a more specific type if available
    }
  }
}

type MaestroAuthzOptions = {
  resource?: string;
};

export function maestroAuthzMiddleware(
  options: MaestroAuthzOptions = {},
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const requestContext =
      (req as any).context ||
      buildRequestContext(req);

    (req as any).context = requestContext;
    (req as any).correlationId = requestContext.correlationId;
    (req as any).traceId = requestContext.traceId;

    const action = (req.method || 'unknown').toLowerCase();
    const resource = options.resource || inferResource(req);

    const policyContext = {
      tenantId: requestContext.tenantId,
      userId: (req as any).user?.id || requestContext?.principal?.id,
      role: (req as any).user?.role || requestContext?.principal?.role || 'user',
      action,
      resource,
      resourceAttributes: {
        ...req.body,
        ...req.params,
        ...req.query,
      },
      subjectAttributes: (req as any).user?.attributes || {},
      sessionContext: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: Date.now(),
        sessionId: (req as any).sessionID,
        traceId: requestContext.traceId,
      },
    };

    const decisionLog = {
      traceId: requestContext.traceId,
      correlationId: requestContext.correlationId,
      tenantId: requestContext.tenantId,
      principalId:
        (req as any).user?.id ||
        (req as any).user?.sub ||
        requestContext?.principal?.id,
      principalRole:
        (req as any).user?.role || requestContext?.principal?.role,
      resource,
      action,
      resourceAttributes: policyContext.resourceAttributes,
    };

    try {
      const decision = await opaPolicyEngine.evaluatePolicy(
        'maestro/authz',
        policyContext,
      );

      if (!decision.allow) {
        logger.warn('Maestro authorization denied by OPA', {
          ...decisionLog,
          decision: 'deny',
          reason: decision.reason,
          policyBundleVersion: decision.policyBundleVersion,
          attrsUsed: decision.attrsUsed,
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: decision.reason || 'Access denied by policy',
          auditContext: decision.auditLog,
        });
      }

      (req as any).policyDecision = decision;

      logger.info('Maestro authorization allowed by OPA', {
        ...decisionLog,
        decision: 'allow',
        reason: decision.reason,
        policyBundleVersion: decision.policyBundleVersion,
        attrsUsed: decision.attrsUsed,
      });

      return next();
    } catch (error: any) {
      // FAIL-CLOSED: On any policy evaluation error, deny the request
      // This prevents authorization bypass if OPA is unreachable
      const isProduction = process.env.NODE_ENV === 'production';

      logger.error('Error evaluating Maestro authorization policy - FAIL-CLOSED', {
        ...decisionLog,
        error: error?.message || 'Unknown error',
        failClosed: true,
        environment: process.env.NODE_ENV,
      });

      if (isProduction) {
        // Production: Always deny on policy evaluation failure
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Authorization service unavailable - access denied',
          failClosed: true,
        });
      } else {
        // Non-production: Allow with warning for development convenience
        logger.warn('Non-production: allowing request despite policy error (WOULD BE DENIED IN PRODUCTION)', {
          ...decisionLog,
        });
        return next();
      }
    }
  };
}

function inferResource(req: Request): string {
  const path = `${req.baseUrl || ''}${req.path || ''}`;
  const segments = path.split('/').filter(Boolean);
  const maestroIndex = segments.findIndex((segment) => segment === 'maestro');

  if (maestroIndex >= 0 && segments[maestroIndex + 1]) {
    return segments[maestroIndex + 1];
  }

  return segments[segments.length - 1] || 'unknown';
}

function buildRequestContext(req: Request) {
  const correlationId = (req as any).correlationId || randomUUID();
  const principalId = (req as any).user?.id || (req as any).user?.sub;

  return {
    correlationId,
    tenantId:
      (req as any).tenantId ||
      (req as any).tenant_id ||
      (req as any).user?.tenant_id ||
      (req as any).user?.tenantId ||
      req.headers['x-tenant-id'],
    principal: {
      id: principalId,
      role: (req as any).user?.role,
      orgId: (req as any).user?.orgId,
    },
    traceId:
      (req as any).traceId ||
      correlationId ||
      (req.headers['x-trace-id'] as string),
    requestId: (req as any).requestId || (req as any).correlationId,
  };
}
