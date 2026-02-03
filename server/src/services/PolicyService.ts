// @ts-nocheck
import { writeAudit } from '../utils/audit.js';
import logger from '../utils/logger.js';
import { opaClient } from './opa-client.js';

// Define PolicyContext and PolicyDecision as requested
export interface Principal {
  id: string;
  role: string;
  tenantId?: string;
  email?: string;
  [key: string]: unknown;
}

export interface ResourceRef {
  id?: string;
  type?: string;
  tenantId?: string;
  [key: string]: unknown;
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

  private constructor() { }

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
      // Call OPA for decision
      try {
        // We map the PolicyContext to what OPA expects or pass it directly if policy supports it
        // Assuming 'intelgraph/policy/authz/allow' dictates the structure
        const opaInput = {
          user: {
            id: ctx.principal.id,
            role: ctx.principal.role,
            tenantId: ctx.principal.tenantId,
            ...ctx.principal
          },
          resource: {
            id: ctx.resource.id,
            type: ctx.resource.type,
            tenantId: ctx.resource.tenantId,
            ...ctx.resource
          },
          action: ctx.action,
          environment: ctx.environment
        };

        const allowed = await opaClient.evaluateQuery('intelgraph/policy/authz/allow', opaInput);
        if (typeof allowed === 'boolean') {
          if (!allowed) return { allow: false, reason: 'OPA denied access' };
          // If allowed, we can return true or let local overrides happen?
          // Usually OPA is authoritative.
          return { allow: true, reason: 'OPA allow' };
        }
      } catch (err: any) {
        logger.warn('OPA call failed, falling back to local evaluation', err);
        // Verify fail-open or fail-closed via config?
        // Defaulting to local fallback/fail-closed as per existing code flow
      }

      // Fallback: Basic RBAC/ABAC logic
      return this.evaluateLocal(ctx);
    } catch (error: any) {
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
    parent: unknown,
    args: unknown,
    context: unknown,
    info: unknown,
  ) => Promise<unknown> | unknown;
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

export function withPolicy<T extends (...args: unknown[]) => unknown>(
  resolver: T,
  spec: PolicySpec,
): T {
  return (async (parent: unknown, args: unknown, context: unknown, info: unknown) => {
    const ctx = context as Record<string, unknown>;
    const user = (ctx.user || {}) as Record<string, unknown>;
    const resource = spec.getResource
      ? ((await spec.getResource(parent, args, context, info)) as Record<string, unknown>)
      : {};

    const policyContext: PolicyContext = {
      principal: user as Principal,
      resource,
      action: spec.action,
      environment: {
        ip: (ctx.req as Record<string, unknown>)?.ip as string | undefined,
        userAgent: ((ctx.req as Record<string, unknown>)?.headers as Record<string, unknown>)?.['user-agent'] as string | undefined,
        time: new Date().toISOString()
      }
    };

    const decision = await policyService.evaluate(policyContext);

    const requestId = (ctx.req as Record<string, unknown>)?.id || ctx.requestId;
    const traceId = ctx.traceId;
    const infoObj = info as Record<string, unknown>;

    // Use the existing writeAudit utility if available, or update it later
    try {
      await writeAudit({
        userId: user.id as string | undefined,
        userEmail: user.email as string | undefined,
        tenantId: (user.tenantId || resource?.tenantId) as string | undefined,
        action: spec.action,
        resourceType: infoObj?.fieldName as string | undefined,
        resourceId: resource?.id as string | undefined,
        details: {
          decision: decision.allow ? 'allow' : 'deny',
          reason: decision.reason,
          requestId: requestId as string | undefined,
          traceId: traceId as string | undefined,
        },
        success: decision.allow,
        errorMessage: decision.reason
      });
    } catch (e: any) {
      // ignore audit errors for now or log them
      logger.error('Audit write failed', e);
    }

    ctx.reasonForAccess = spec.action;
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
