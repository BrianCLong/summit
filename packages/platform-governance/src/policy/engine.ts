/**
 * P46: Policy Engine
 * Rule-based policy evaluation for governance and compliance
 */

import { z } from 'zod';

/**
 * Policy rule types
 */
export type RuleType =
  | 'allow'
  | 'deny'
  | 'require'
  | 'enforce'
  | 'audit'
  | 'notify';

/**
 * Policy effect
 */
export type PolicyEffect = 'allow' | 'deny' | 'warn';

/**
 * Condition operator types
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists';

/**
 * Condition schema
 */
export const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals', 'not_equals', 'contains', 'not_contains',
    'starts_with', 'ends_with', 'matches',
    'greater_than', 'less_than',
    'in', 'not_in', 'exists', 'not_exists'
  ]),
  value: z.unknown().optional(),
});

export type Condition = z.infer<typeof ConditionSchema>;

/**
 * Policy rule schema
 */
export const PolicyRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['allow', 'deny', 'require', 'enforce', 'audit', 'notify']),
  effect: z.enum(['allow', 'deny', 'warn']),
  priority: z.number().default(0),
  enabled: z.boolean().default(true),
  conditions: z.array(ConditionSchema),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  actions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

/**
 * Policy schema
 */
export const PolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  rules: z.array(PolicyRuleSchema),
  defaultEffect: z.enum(['allow', 'deny']).default('deny'),
  metadata: z.record(z.unknown()).optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

/**
 * Evaluation context
 */
export interface EvaluationContext {
  subject: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  resource: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  action: string;
  environment: Record<string, unknown>;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  allowed: boolean;
  effect: PolicyEffect;
  matchedRules: PolicyRule[];
  deniedBy?: PolicyRule;
  warnings: string[];
  auditLog: Array<{
    ruleId: string;
    matched: boolean;
    reason: string;
  }>;
}

/**
 * Evaluate a condition against context
 */
function evaluateCondition(condition: Condition, context: EvaluationContext): boolean {
  const value = getFieldValue(condition.field, context);

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;

    case 'not_equals':
      return value !== condition.value;

    case 'contains':
      if (typeof value === 'string' && typeof condition.value === 'string') {
        return value.includes(condition.value);
      }
      if (Array.isArray(value)) {
        return value.includes(condition.value);
      }
      return false;

    case 'not_contains':
      if (typeof value === 'string' && typeof condition.value === 'string') {
        return !value.includes(condition.value);
      }
      if (Array.isArray(value)) {
        return !value.includes(condition.value);
      }
      return true;

    case 'starts_with':
      return typeof value === 'string' &&
        typeof condition.value === 'string' &&
        value.startsWith(condition.value);

    case 'ends_with':
      return typeof value === 'string' &&
        typeof condition.value === 'string' &&
        value.endsWith(condition.value);

    case 'matches':
      if (typeof value === 'string' && typeof condition.value === 'string') {
        return new RegExp(condition.value).test(value);
      }
      return false;

    case 'greater_than':
      return typeof value === 'number' &&
        typeof condition.value === 'number' &&
        value > condition.value;

    case 'less_than':
      return typeof value === 'number' &&
        typeof condition.value === 'number' &&
        value < condition.value;

    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value);

    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(value);

    case 'exists':
      return value !== undefined && value !== null;

    case 'not_exists':
      return value === undefined || value === null;

    default:
      return false;
  }
}

/**
 * Get field value from context using dot notation
 */
function getFieldValue(field: string, context: EvaluationContext): unknown {
  const parts = field.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/**
 * Policy Engine
 */
export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();

  /**
   * Register a policy
   */
  registerPolicy(policy: Policy): void {
    const validated = PolicySchema.parse(policy);
    this.policies.set(validated.id, validated);
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Get all policies
   */
  getPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Evaluate a context against all policies
   */
  evaluate(context: EvaluationContext): EvaluationResult {
    const result: EvaluationResult = {
      allowed: false,
      effect: 'deny',
      matchedRules: [],
      warnings: [],
      auditLog: [],
    };

    // Collect all rules from all policies, sorted by priority
    const allRules: Array<{ rule: PolicyRule; policy: Policy }> = [];
    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (rule.enabled) {
          allRules.push({ rule, policy });
        }
      }
    }

    allRules.sort((a, b) => b.rule.priority - a.rule.priority);

    // Evaluate rules
    let hasExplicitAllow = false;
    let hasExplicitDeny = false;

    for (const { rule, policy } of allRules) {
      const conditionResults = rule.conditions.map(c => evaluateCondition(c, context));

      const matched = rule.conditionLogic === 'and'
        ? conditionResults.every(r => r)
        : conditionResults.some(r => r);

      result.auditLog.push({
        ruleId: rule.id,
        matched,
        reason: matched
          ? `Rule "${rule.name}" matched`
          : `Rule "${rule.name}" did not match conditions`,
      });

      if (matched) {
        result.matchedRules.push(rule);

        switch (rule.effect) {
          case 'allow':
            hasExplicitAllow = true;
            break;

          case 'deny':
            hasExplicitDeny = true;
            result.deniedBy = rule;
            break;

          case 'warn':
            result.warnings.push(`Warning from rule "${rule.name}": ${rule.description || 'No description'}`);
            break;
        }
      }
    }

    // Determine final effect (deny takes precedence)
    if (hasExplicitDeny) {
      result.allowed = false;
      result.effect = 'deny';
    } else if (hasExplicitAllow) {
      result.allowed = true;
      result.effect = 'allow';
    } else {
      // Use default effect from first policy (or deny)
      const defaultEffect = this.policies.values().next().value?.defaultEffect || 'deny';
      result.allowed = defaultEffect === 'allow';
      result.effect = defaultEffect;
    }

    return result;
  }

  /**
   * Evaluate with detailed explanation
   */
  evaluateWithExplanation(context: EvaluationContext): {
    result: EvaluationResult;
    explanation: string;
  } {
    const result = this.evaluate(context);

    const explanationLines: string[] = [
      `Decision: ${result.allowed ? 'ALLOWED' : 'DENIED'}`,
      `Effect: ${result.effect}`,
      '',
      `Subject: ${context.subject.type}:${context.subject.id}`,
      `Resource: ${context.resource.type}:${context.resource.id}`,
      `Action: ${context.action}`,
      '',
      'Evaluation Log:',
    ];

    for (const log of result.auditLog) {
      explanationLines.push(`  - ${log.reason}`);
    }

    if (result.deniedBy) {
      explanationLines.push('');
      explanationLines.push(`Denied by rule: ${result.deniedBy.name}`);
    }

    if (result.warnings.length > 0) {
      explanationLines.push('');
      explanationLines.push('Warnings:');
      for (const warning of result.warnings) {
        explanationLines.push(`  - ${warning}`);
      }
    }

    return {
      result,
      explanation: explanationLines.join('\n'),
    };
  }
}

/**
 * Create a new policy engine
 */
export function createPolicyEngine(): PolicyEngine {
  return new PolicyEngine();
}

/**
 * Default policy engine instance
 */
export const policyEngine = createPolicyEngine();
