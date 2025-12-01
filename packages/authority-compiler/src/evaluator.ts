/**
 * Policy Evaluator
 *
 * Evaluates access requests against compiled policies.
 * Integrates with OPA for complex policy evaluation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PolicyDecision,
  Operation,
  ClassificationLevel,
  Authority,
} from './schema/policy.schema';
import { CompiledPolicy } from './compiler';

export interface EvaluationContext {
  /** User making the request */
  user: {
    id: string;
    roles: string[];
    groups?: string[];
    tenantId?: string;
    clearance?: ClassificationLevel;
    compartments?: string[];
  };

  /** Operation being requested */
  operation: Operation;

  /** Resource being accessed */
  resource: {
    entityType?: string;
    entityId?: string;
    classification?: ClassificationLevel;
    compartments?: string[];
    licenses?: string[];
    investigationId?: string;
  };

  /** Request metadata */
  request: {
    ip?: string;
    userAgent?: string;
    timestamp: Date;
    justification?: string;
    mfaVerified?: boolean;
  };
}

export interface EvaluatorOptions {
  /** Default decision when no matching policy found */
  defaultDeny?: boolean;
  /** Enable detailed audit logging */
  auditEnabled?: boolean;
  /** OPA endpoint for complex evaluations */
  opaEndpoint?: string;
}

/**
 * Evaluates access requests against compiled policies
 */
export class PolicyEvaluator {
  private policy: CompiledPolicy;
  private options: EvaluatorOptions;

  constructor(policy: CompiledPolicy, options: EvaluatorOptions = {}) {
    this.policy = policy;
    this.options = {
      defaultDeny: true,
      auditEnabled: true,
      ...options,
    };
  }

  /**
   * Evaluate an access request
   */
  async evaluate(context: EvaluationContext): Promise<PolicyDecision> {
    const auditId = uuidv4();

    // Get authorities that grant the requested operation
    const candidateAuthorities = this.policy.operationIndex.get(context.operation) || [];

    if (candidateAuthorities.length === 0) {
      return this.deny(auditId, `No authority grants ${context.operation} permission`);
    }

    // Find matching authority
    for (const authority of candidateAuthorities) {
      const match = await this.matchAuthority(authority, context);
      if (match.matches) {
        return this.allow(auditId, authority, match);
      }
    }

    return this.deny(auditId, 'No matching authority found for this request');
  }

  /**
   * Check if an authority matches the evaluation context
   */
  private async matchAuthority(
    authority: Authority,
    context: EvaluationContext
  ): Promise<{
    matches: boolean;
    reason?: string;
    conditions?: string[];
    redactedFields?: string[];
    requiresTwoPersonControl?: boolean;
  }> {
    // Check subject match
    const subjectMatch = this.matchSubjects(authority, context);
    if (!subjectMatch) {
      return { matches: false, reason: 'Subject does not match' };
    }

    // Check resource match
    const resourceMatch = this.matchResources(authority, context);
    if (!resourceMatch.matches) {
      return { matches: false, reason: resourceMatch.reason };
    }

    // Check conditions
    const conditionMatch = await this.checkConditions(authority, context);
    if (!conditionMatch.satisfied) {
      return { matches: false, reason: conditionMatch.reason };
    }

    return {
      matches: true,
      conditions: conditionMatch.pendingConditions,
      redactedFields: resourceMatch.redactedFields,
      requiresTwoPersonControl: conditionMatch.requiresTwoPersonControl,
    };
  }

  /**
   * Check if the user matches the authority's subject constraints
   */
  private matchSubjects(authority: Authority, context: EvaluationContext): boolean {
    const { subjects } = authority;

    // Check role match
    if (subjects.roles && subjects.roles.length > 0) {
      const hasRole = subjects.roles.some((role) => context.user.roles.includes(role));
      if (hasRole) return true;
    }

    // Check user match
    if (subjects.users && subjects.users.includes(context.user.id)) {
      return true;
    }

    // Check group match
    if (subjects.groups && context.user.groups) {
      const hasGroup = subjects.groups.some((group) => context.user.groups?.includes(group));
      if (hasGroup) return true;
    }

    // Check tenant match
    if (subjects.tenants && context.user.tenantId) {
      if (subjects.tenants.includes(context.user.tenantId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the resource matches the authority's resource constraints
   */
  private matchResources(
    authority: Authority,
    context: EvaluationContext
  ): { matches: boolean; reason?: string; redactedFields?: string[] } {
    const { resources } = authority;

    // Check entity type
    if (resources.entityTypes && resources.entityTypes.length > 0) {
      if (context.resource.entityType && !resources.entityTypes.includes(context.resource.entityType)) {
        return { matches: false, reason: `Entity type ${context.resource.entityType} not permitted` };
      }
    }

    // Check classification
    if (resources.classifications && resources.classifications.length > 0) {
      if (context.resource.classification) {
        if (!resources.classifications.includes(context.resource.classification)) {
          return { matches: false, reason: `Classification ${context.resource.classification} not permitted` };
        }
      }
    }

    // Check compartments
    if (resources.compartments && resources.compartments.length > 0) {
      if (context.resource.compartments) {
        const hasCompartment = context.resource.compartments.some((c) =>
          resources.compartments?.includes(c)
        );
        if (!hasCompartment) {
          return { matches: false, reason: 'Required compartment access not granted' };
        }
      }
    }

    // Check investigation
    if (resources.investigations && resources.investigations.length > 0) {
      if (context.resource.investigationId) {
        if (!resources.investigations.includes(context.resource.investigationId)) {
          return { matches: false, reason: 'Not authorized for this investigation' };
        }
      }
    }

    return { matches: true };
  }

  /**
   * Check if the authority's conditions are satisfied
   */
  private async checkConditions(
    authority: Authority,
    context: EvaluationContext
  ): Promise<{
    satisfied: boolean;
    reason?: string;
    pendingConditions?: string[];
    requiresTwoPersonControl?: boolean;
  }> {
    const conditions = authority.conditions;
    if (!conditions) {
      return { satisfied: true };
    }

    const pendingConditions: string[] = [];

    // Check MFA requirement
    if (conditions.requireMFA && !context.request.mfaVerified) {
      return { satisfied: false, reason: 'MFA verification required' };
    }

    // Check justification requirement
    if (conditions.requireJustification && !context.request.justification) {
      pendingConditions.push('Justification required');
    }

    // Check IP allowlist
    if (conditions.ipAllowlist && conditions.ipAllowlist.length > 0) {
      if (context.request.ip && !conditions.ipAllowlist.includes(context.request.ip)) {
        return { satisfied: false, reason: 'IP address not in allowlist' };
      }
    }

    // Check time window
    if (conditions.timeWindow) {
      const now = context.request.timestamp;
      const hour = now.getUTCHours();
      const day = now.getUTCDay();

      if (hour < conditions.timeWindow.startHour || hour >= conditions.timeWindow.endHour) {
        return { satisfied: false, reason: 'Access not permitted at this time' };
      }

      if (conditions.timeWindow.daysOfWeek && !conditions.timeWindow.daysOfWeek.includes(day)) {
        return { satisfied: false, reason: 'Access not permitted on this day' };
      }
    }

    // Check validity period
    if (conditions.validFrom) {
      const validFrom = new Date(conditions.validFrom);
      if (context.request.timestamp < validFrom) {
        return { satisfied: false, reason: 'Authority not yet effective' };
      }
    }

    if (conditions.validTo) {
      const validTo = new Date(conditions.validTo);
      if (context.request.timestamp > validTo) {
        return { satisfied: false, reason: 'Authority has expired' };
      }
    }

    return {
      satisfied: true,
      pendingConditions: pendingConditions.length > 0 ? pendingConditions : undefined,
      requiresTwoPersonControl: conditions.requireTwoPersonControl,
    };
  }

  /**
   * Create an allow decision
   */
  private allow(
    auditId: string,
    authority: Authority,
    match: {
      conditions?: string[];
      redactedFields?: string[];
      requiresTwoPersonControl?: boolean;
    }
  ): PolicyDecision {
    return {
      allowed: true,
      authorityId: authority.id,
      reason: `Access granted by authority: ${authority.name}`,
      conditions: match.conditions,
      requiresTwoPersonControl: match.requiresTwoPersonControl || false,
      redactedFields: match.redactedFields,
      auditId,
    };
  }

  /**
   * Create a deny decision
   */
  private deny(auditId: string, reason: string): PolicyDecision {
    return {
      allowed: false,
      reason,
      requiresTwoPersonControl: false,
      auditId,
    };
  }

  /**
   * Update the compiled policy (for hot-reloading)
   */
  updatePolicy(policy: CompiledPolicy): void {
    this.policy = policy;
  }
}

export default PolicyEvaluator;
