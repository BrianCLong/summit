import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  opaPolicyEngine,
  type PolicyContext,
  type PolicyDecision,
} from '../conductor/governance/opa-integration.js';

export interface PolicyActionInput {
  action: string;
  resource: string;
  tenantId: string;
  userId?: string;
  role?: string;
  resourceAttributes?: Record<string, unknown>;
  subjectAttributes?: Record<string, unknown>;
  sessionContext?: PolicyContext['sessionContext'];
  policyVersion?: string;
}

export interface PolicyActionGateOptions {
  action: string;
  resource: string;
  policyName?: string;
  resolveResourceId?: (req: Request) => string | undefined;
  buildResourceAttributes?: (req: Request) => Record<string, unknown>;
}

export function buildPolicyContextFromRequest(
  req: Request,
  action: string,
  resource: string,
  options: {
    resourceAttributes?: Record<string, unknown>;
    policyVersion?: string;
  } = {},
): PolicyContext {
  const user = (req as any).user || {};
  const tenantId =
    user.tenantId ||
    user.tenant_id ||
    (req.headers['x-tenant-id'] as string) ||
    'unknown';

  return {
    tenantId,
    userId: user.id || user.sub || user.email,
    role: user.role || 'user',
    action,
    resource,
    resourceAttributes: options.resourceAttributes,
    subjectAttributes: user.attributes || {},
    sessionContext: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: Date.now(),
      sessionId: (req as any).sessionID,
      traceId: (req as any).traceId || randomUUID(),
    },
    policyVersion: options.policyVersion,
  };
}

export async function evaluatePolicyAction(
  input: PolicyActionInput,
  policyName = 'maestro/authz',
): Promise<PolicyDecision> {
  const context: PolicyContext = {
    tenantId: input.tenantId,
    userId: input.userId,
    role: input.role || 'user',
    action: input.action,
    resource: input.resource,
    resourceAttributes: input.resourceAttributes,
    subjectAttributes: input.subjectAttributes || {},
    sessionContext: input.sessionContext || {
      timestamp: Date.now(),
    },
    policyVersion: input.policyVersion,
  };

  return opaPolicyEngine.evaluatePolicy(policyName, context);
}

export function policyActionGate(options: PolicyActionGateOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resourceAttributes = {
      ...(options.buildResourceAttributes ? options.buildResourceAttributes(req) : {}),
      resourceId: options.resolveResourceId?.(req),
    };

    const context = buildPolicyContextFromRequest(
      req,
      options.action,
      options.resource,
      { resourceAttributes },
    );

    try {
      const decision = await opaPolicyEngine.evaluatePolicy(
        options.policyName || 'maestro/authz',
        context,
      );

      if (!decision.allow) {
        return res.status(403).json({
          error: 'Forbidden',
          reason: decision.reason,
          decision,
        });
      }

      (req as any).policyDecision = decision;
      return next();
    } catch (error: any) {
      return res.status(500).json({
        error: 'Policy evaluation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
