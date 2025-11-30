import { Policy, PolicyContext, GovernanceDecision, PolicyRule } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class PolicyEngine {
  private policies: Policy[] = [];

  constructor(policies?: Policy[]) {
    if (policies) {
      this.policies = policies;
    }
  }

  // Load policies from a directory of JSON/YAML files
  // For v0.1 we will just load from a provided array or mock
  public loadPolicies(newPolicies: Policy[]) {
    this.policies = newPolicies;
  }

  public check(context: PolicyContext): GovernanceDecision {
    const violations: string[] = [];
    const violatedPolicyIds: string[] = [];
    let decision: GovernanceDecision['action'] = 'ALLOW';

    for (const policy of this.policies) {
      if (!this.isScopeMatch(policy, context)) {
        continue;
      }

      const matches = this.evaluateRules(policy.rules, context.payload);

      // If rules match, we trigger the policy action
      // E.g. Rule: toxicity > 0.8 -> Action: DENY
      if (matches) {
        if (policy.action === 'DENY') {
          decision = 'DENY';
          violations.push(`Policy ${policy.id} violation: ${policy.description || 'Rules matched'}`);
          violatedPolicyIds.push(policy.id);
        } else if (policy.action === 'ESCALATE' && decision !== 'DENY') {
          decision = 'ESCALATE';
          violations.push(`Policy ${policy.id} escalation: ${policy.description || 'Rules matched'}`);
          violatedPolicyIds.push(policy.id);
        }
        // If ALLOW, we do nothing unless it's an allow-list logic, but assuming block-list for now.
      }
    }

    return {
      action: decision,
      reasons: violations,
      policyIds: violatedPolicyIds
    };
  }

  private isScopeMatch(policy: Policy, context: PolicyContext): boolean {
    const stageMatch = policy.scope.stages.includes(context.stage);
    const tenantMatch = policy.scope.tenants.includes('*') || policy.scope.tenants.includes(context.tenantId);
    return stageMatch && tenantMatch;
  }

  private evaluateRules(rules: PolicyRule[], payload: Record<string, any>): boolean {
    // Return true if ALL rules match (AND logic)
    // Could support OR logic later
    return rules.every(rule => {
      const value = this.getNestedValue(payload, rule.field);
      return this.compare(value, rule.operator, rule.value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
  }

  private compare(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'lt': return actual < expected;
      case 'gt': return actual > expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'not_in': return Array.isArray(expected) && !expected.includes(actual);
      case 'contains': return Array.isArray(actual) && actual.includes(expected);
      default: return false;
    }
  }
}
