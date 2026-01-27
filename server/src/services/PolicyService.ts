import { opaClient } from './opa-client.js';
import { writeAudit } from '../utils/audit.js';
import logger from '../utils/logger.js';

// Define PolicyContext and PolicyDecision as requested
export interface Principal {
  id: string;
  role: string;
  tenantId?: string;
  email?: string;
  missionTags?: string[];
  compartment?: {
    orgId?: string;
    teamId?: string;
  };
  [key: string]: unknown;
}

export interface ResourceRef {
  id?: string;
  type?: string;
  tenantId?: string;
  sensitivity?: string;
  missionTags?: string[];
  compartment?: {
    orgId?: string;
    teamId?: string;
  };
  validFrom?: string;
  validUntil?: string;
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
  violations?: any[];
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
      // 1. Construct OPA Input
      const opaInput = {
        action: ctx.action,
        user: ctx.principal,
        resource: ctx.resource,
        context: {
          time: ctx.environment.time || new Date().toISOString(),
          ip: ctx.environment.ip,
        }
      };

      // 2. Call OPA (intelgraph package defined in abac.rego)
      const opaResult = await opaClient.evaluateQuery('intelgraph/allow', opaInput);

      if (opaResult === true) {
        return { allow: true, reason: 'OPA policy allowed access' };
      }

      // If OPA explicitly returns false or null, we still fallback to local RBAC
      // unless we want OPA to be the definitive source. For now, let's keep fallback 
      // but log the OPA denial.
      if (opaResult === false) {
        logger.debug('OPA denied access, checking local fallback', { ctx });
      }

      // 3. Fallback: Basic RBAC/ABAC logic
      return this.evaluateLocal(ctx);
    } catch (error: any) {
      logger.error('Error evaluating policy with OPA, failing back to local', { error, ctx });
      return this.evaluateLocal(ctx);
    }
  }

  private evaluateLocal(ctx: PolicyContext): PolicyDecision {
    const { principal, action } = ctx;

    // 1. Authentication Check
    if (!principal || !principal.id || principal.id === 'anonymous') {
      return { allow: false, reason: 'Unauthenticated' };
    }

    // 2. Admin Override
    if (principal.role === 'ADMIN') {
      return { allow: true, reason: 'Admin superuser access' };
    }

    // 3. Tenant Isolation
    // If the resource has a tenantId, it MUST match the principal's tenantId.
    if (ctx.resource.tenantId && principal.tenantId) {
      if (ctx.resource.tenantId !== principal.tenantId) {
        return { allow: false, reason: 'Cross-tenant access forbidden' };
      }
    }

    // 4. RBAC Matrix
    // Roles: USER, ANALYST, SENIOR_ANALYST, ADMIN (handled above)
    const permissions: Record<string, string[]> = {
      'USER': ['read', 'graphql.query'],
      'ANALYST': ['read', 'graphql.query', 'execute', 'ml.predict', 'narrative.analyze'],
      'SENIOR_ANALYST': ['read', 'graphql.query', 'execute', 'ml.predict', 'narrative.analyze', 'ml.train', 'policy.view']
    };

    const userPerms = permissions[principal.role] || [];

    // Check if the specific action or any of its segments are allowed
    const isAllowed = userPerms.some(perm =>
      action === perm || action.startsWith(`${perm}.`) || perm === '*'
    );

    if (isAllowed) {
      return { allow: true, reason: `Action allowed for role: ${principal.role}` };
    }

    return { allow: false, reason: `Action '${action}' not permitted for role: ${principal.role}` };
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
      principal: {
        ...user,
        missionTags: (user.missionTags as string[] | undefined),
        compartment: (user.compartment as { orgId?: string; teamId?: string } | undefined),
      } as Principal,
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
        action: spec.action,
        resourceType: infoObj?.fieldName as string | undefined,
        resourceId: resource?.id as string | undefined,
        details: {
          userEmail: user.email as string | undefined,
          decision: decision.allow ? 'allow' : 'deny',
          reason: decision.reason,
          requestId: requestId as string | undefined,
          traceId: traceId as string | undefined,
          success: decision.allow,
          errorMessage: decision.reason
        }
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
