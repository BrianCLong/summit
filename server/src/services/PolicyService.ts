import { writeAudit } from '../utils/audit.js';
import logger from '../utils/logger.js';

// Define PolicyContext and PolicyDecision as requested
export interface Principal {
  id: string;
  role: string;
  [key: string]: any;
}

export interface ResourceRef {
  id?: string;
  type?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface PolicyContext {
  principal: Principal;
  resource: ResourceRef;
  action: string;
  environment: {
    ip?: string;
    userAgent?: string;
    authMethod?: string;
    time?: string;
    locationHint?: string;
  };
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  obligations?: Record<string, unknown>;
}

export class PolicyService {
  private static instance: PolicyService;

  private constructor() {}

  public static getInstance(): PolicyService {
    if (!PolicyService.instance) {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  /**
   * Evaluates a policy request against OPA and/or internal rules.
   */
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    try {
      // TODO: Call OPA here
      // const opaDecision = await this.callOpa(ctx);
      // if (opaDecision) return opaDecision;

      // Fallback: Basic RBAC/ABAC logic
      return this.evaluateLocal(ctx);
    } catch (error) {
      logger.error('Error evaluating policy', { error, ctx });
      return { allow: false, reason: 'Policy evaluation error' };
    }
  }

  private evaluateLocal(ctx: PolicyContext): PolicyDecision {
    const { principal, action } = ctx;

    // Default: Deny if no principal
    if (!principal || !principal.id) {
      return { allow: false, reason: 'Unauthenticated' };
    }

    // Admin override
    if (principal.role === 'ADMIN') {
      return { allow: true, reason: 'Admin override' };
    }

    // Basic role checks (simplified for now, ideally strictly defined)
    // In a real implementation, we would load the policy matrix
    // For now, allow known roles for basic actions, deny otherwise
    // This is a placeholder for the "As-is" behavior which was permissive or relied on AccessControl.js

    // We strictly enforce tenant isolation here if resource has tenantId
    if (ctx.resource.tenantId && principal.tenantId) {
        if (ctx.resource.tenantId !== principal.tenantId) {
             return { allow: false, reason: 'Tenant mismatch' };
        }
    }

    return { allow: true, reason: 'Default allow (placeholder)' };
  }
}

export const policyService = PolicyService.getInstance();

// Legacy compatibility for GraphQL resolvers
interface PolicySpec {
  action: string;
  getResource?: (
    parent: any,
    args: any,
    context: any,
    info: any,
  ) => Promise<any> | any;
}

export class PolicyError extends Error {
  code: string;
  reason: string;
  requiredClearances: string[];
  appealPath?: string;
  constructor(opts: {
    code: string;
    reason: string;
    requiredClearances?: string[];
    appealPath?: string;
  }) {
    super(opts.reason);
    this.code = opts.code;
    this.reason = opts.reason;
    this.requiredClearances = opts.requiredClearances || [];
    this.appealPath = opts.appealPath;
  }
}

export function withPolicy<T extends (...args: any[]) => any>(
  resolver: T,
  spec: PolicySpec,
): T {
  return (async (parent: any, args: any, context: any, info: any) => {
    const user = context.user || {};
    const resource = spec.getResource
      ? await spec.getResource(parent, args, context, info)
      : {};

    const ctx: PolicyContext = {
        principal: user,
        resource,
        action: spec.action,
        environment: {
            ip: context.req?.ip,
            userAgent: context.req?.headers?.['user-agent'],
            time: new Date().toISOString()
        }
    };

    const decision = await policyService.evaluate(ctx);

    const requestId = context?.req?.id || context.requestId;
    const traceId = context?.traceId;

    // Use the existing writeAudit utility if available, or update it later
    try {
        await writeAudit({
        userId: user.id,
        userEmail: user.email,
        tenantId: user.tenantId || resource?.tenantId,
        action: spec.action,
        resourceType: info?.fieldName,
        resourceId: resource?.id,
        details: {
            decision: decision.allow ? 'allow' : 'deny',
            reason: decision.reason,
            requestId,
            traceId,
        },
        success: decision.allow,
        errorMessage: decision.reason
        });
    } catch (e) {
        // ignore audit errors for now or log them
        logger.error('Audit write failed', e);
    }

    context.reasonForAccess = spec.action;
    if (!decision.allow) {
      throw new PolicyError({
        code: 'POLICY_DENIED',
        reason: `Blocked: ${decision.reason || 'unauthorized'}`,
        requiredClearances: [],
        appealPath: '/appeal',
      });
    }
    return resolver(parent, args, context, info);
  }) as T;
}
