/**
 * Policy Enforcement Engine
 *
 * OPA/ABAC-style policy evaluation for all mesh operations.
 * Wraps agent task assignment, tool invocation, model calls, and data export.
 */

import type {
  PolicyContext,
  PolicyDecision,
  PolicyAction,
  PolicyActionType,
  DataClassification,
  RedactionSpec,
  UUID,
} from '@intelgraph/mesh-sdk';

// ============================================================================
// POLICY DEFINITIONS
// ============================================================================

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  effect: PolicyEffect;
  audit: AuditRequirement;
}

export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'matches'
  | 'greater_than'
  | 'less_than';

export interface PolicyEffect {
  action: PolicyAction;
  reason: string;
  redactions?: RedactionConfig[];
  escalationTarget?: string;
}

export interface RedactionConfig {
  path: string;
  strategy: 'mask' | 'remove' | 'hash' | 'encrypt';
  pattern?: string;
}

export interface AuditRequirement {
  level: 'none' | 'basic' | 'detailed' | 'full';
  retentionDays: number;
}

// ============================================================================
// POLICY ENGINE
// ============================================================================

export class PolicyEngine {
  private policies: Policy[] = [];
  private decisionCache: Map<string, CachedDecision> = new Map();
  private readonly cacheTtlMs = 60000; // 1 minute

  constructor(policies?: Policy[]) {
    if (policies) {
      this.loadPolicies(policies);
    }
  }

  /**
   * Load policies into the engine.
   */
  loadPolicies(policies: Policy[]): void {
    this.policies = policies
      .filter((p) => p.enabled)
      .sort((a, b) => b.priority - a.priority); // Higher priority first
    this.decisionCache.clear();
  }

  /**
   * Evaluate a policy context and return a decision.
   */
  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    const cached = this.decisionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.decision;
    }

    // Find applicable policies
    const applicablePolicies = this.findApplicablePolicies(context);

    // If no policies apply, default to allow
    if (applicablePolicies.length === 0) {
      return this.createDecision('allow', 'No applicable policies', [], false);
    }

    // Evaluate policies in priority order
    let finalAction: PolicyAction = 'allow';
    let finalReason = '';
    const allRedactions: RedactionSpec[] = [];
    let escalationTarget: string | undefined;
    let auditRequired = false;
    const violatedPolicies: string[] = [];

    for (const policy of applicablePolicies) {
      const matches = this.evaluateConditions(policy.conditions, context);

      if (matches) {
        violatedPolicies.push(policy.id);

        // Deny takes precedence
        if (policy.effect.action === 'deny') {
          finalAction = 'deny';
          finalReason = policy.effect.reason;
          break;
        }

        // Escalation takes precedence over allow
        if (policy.effect.action === 'escalate_to_human') {
          finalAction = 'escalate_to_human';
          finalReason = policy.effect.reason;
          escalationTarget = policy.effect.escalationTarget;
        }

        // Collect redactions
        if (policy.effect.action === 'allow_with_redactions' && policy.effect.redactions) {
          if (finalAction === 'allow') {
            finalAction = 'allow_with_redactions';
          }
          for (const redaction of policy.effect.redactions) {
            allRedactions.push({
              path: redaction.path,
              strategy: redaction.strategy,
            });
          }
          finalReason = policy.effect.reason;
        }

        // Check audit requirements
        if (policy.audit.level !== 'none') {
          auditRequired = true;
        }
      }
    }

    const decision = this.createDecision(
      finalAction,
      finalReason || 'Policy evaluation complete',
      allRedactions,
      auditRequired,
      escalationTarget
    );

    // Cache the decision
    this.decisionCache.set(cacheKey, {
      decision,
      timestamp: Date.now(),
    });

    return decision;
  }

  /**
   * Batch evaluate multiple contexts.
   */
  async evaluateBatch(contexts: PolicyContext[]): Promise<PolicyDecision[]> {
    return Promise.all(contexts.map((c) => this.evaluate(c)));
  }

  /**
   * Check if an action is allowed without full evaluation.
   */
  async isAllowed(context: PolicyContext): Promise<boolean> {
    const decision = await this.evaluate(context);
    return decision.action === 'allow' || decision.action === 'allow_with_redactions';
  }

  /**
   * Get all policies.
   */
  getPolicies(): Policy[] {
    return [...this.policies];
  }

  /**
   * Add a single policy.
   */
  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    this.policies.sort((a, b) => b.priority - a.priority);
    this.decisionCache.clear();
  }

  /**
   * Remove a policy by ID.
   */
  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex((p) => p.id === policyId);
    if (index >= 0) {
      this.policies.splice(index, 1);
      this.decisionCache.clear();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private findApplicablePolicies(context: PolicyContext): Policy[] {
    return this.policies.filter((policy) => {
      // Check if policy applies to this action type
      const actionTypeCondition = policy.conditions.find((c) => c.field === 'action');
      if (actionTypeCondition) {
        return this.evaluateCondition(actionTypeCondition, context.action);
      }
      return true; // Policy applies to all actions if no action condition
    });
  }

  private evaluateConditions(conditions: PolicyCondition[], context: PolicyContext): boolean {
    return conditions.every((condition) => {
      const value = this.getFieldValue(condition.field, context);
      return this.evaluateCondition(condition, value);
    });
  }

  private evaluateCondition(condition: PolicyCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        if (typeof value === 'string') {
          return value.includes(condition.value as string);
        }
        if (Array.isArray(value)) {
          return value.includes(condition.value);
        }
        return false;
      case 'not_contains':
        if (typeof value === 'string') {
          return !value.includes(condition.value as string);
        }
        if (Array.isArray(value)) {
          return !value.includes(condition.value);
        }
        return true;
      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(value);
        }
        return false;
      case 'not_in':
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(value);
        }
        return true;
      case 'matches':
        if (typeof value === 'string' && typeof condition.value === 'string') {
          return new RegExp(condition.value).test(value);
        }
        return false;
      case 'greater_than':
        return (value as number) > (condition.value as number);
      case 'less_than':
        return (value as number) < (condition.value as number);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: PolicyContext): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private createDecision(
    action: PolicyAction,
    reason: string,
    redactions: RedactionSpec[],
    auditRequired: boolean,
    escalationTarget?: string
  ): PolicyDecision {
    return {
      action,
      reason,
      redactions: redactions.length > 0 ? redactions : undefined,
      escalationTarget,
      auditRequired,
      decisionId: crypto.randomUUID(),
      evaluatedAt: new Date().toISOString(),
    };
  }

  private generateCacheKey(context: PolicyContext): string {
    return JSON.stringify({
      action: context.action,
      subject: context.subject,
      resource: { type: context.resource.type, classification: context.resource.classification },
    });
  }
}

interface CachedDecision {
  decision: PolicyDecision;
  timestamp: number;
}

// ============================================================================
// BUILT-IN POLICIES
// ============================================================================

export const builtInPolicies: Policy[] = [
  {
    id: 'SEC-001',
    name: 'Deny Restricted Data Export',
    description: 'Prevents export of restricted data to external systems',
    version: '1.0.0',
    enabled: true,
    priority: 100,
    conditions: [
      { field: 'action', operator: 'equals', value: 'data_export' },
      { field: 'resource.classification', operator: 'equals', value: 'restricted' },
    ],
    effect: {
      action: 'deny',
      reason: 'Restricted data cannot be exported',
    },
    audit: { level: 'full', retentionDays: 365 },
  },
  {
    id: 'SEC-002',
    name: 'Redact Confidential in External Calls',
    description: 'Redacts confidential data in external API calls',
    version: '1.0.0',
    enabled: true,
    priority: 90,
    conditions: [
      { field: 'action', operator: 'equals', value: 'external_api_call' },
      { field: 'resource.classification', operator: 'in', value: ['confidential', 'restricted'] },
    ],
    effect: {
      action: 'allow_with_redactions',
      reason: 'Confidential data must be redacted for external calls',
      redactions: [
        { path: '$.pii', strategy: 'mask' },
        { path: '$.secrets', strategy: 'remove' },
      ],
    },
    audit: { level: 'detailed', retentionDays: 180 },
  },
  {
    id: 'SEC-003',
    name: 'Human Review for High-Risk Tasks',
    description: 'Requires human review for high-risk task assignments',
    version: '1.0.0',
    enabled: true,
    priority: 80,
    conditions: [
      { field: 'action', operator: 'equals', value: 'task_assign' },
      { field: 'environment.riskScore', operator: 'greater_than', value: 0.8 },
    ],
    effect: {
      action: 'escalate_to_human',
      reason: 'High-risk tasks require human approval',
      escalationTarget: 'security-team',
    },
    audit: { level: 'full', retentionDays: 365 },
  },
  {
    id: 'SAFE-001',
    name: 'Block Dangerous Tool Invocations',
    description: 'Prevents invocation of dangerous tools without proper authorization',
    version: '1.0.0',
    enabled: true,
    priority: 100,
    conditions: [
      { field: 'action', operator: 'equals', value: 'tool_invoke' },
      { field: 'resource.attributes.dangerous', operator: 'equals', value: true },
      { field: 'subject.roles', operator: 'not_contains', value: 'admin' },
    ],
    effect: {
      action: 'deny',
      reason: 'Dangerous tool invocation requires admin role',
    },
    audit: { level: 'full', retentionDays: 365 },
  },
];
