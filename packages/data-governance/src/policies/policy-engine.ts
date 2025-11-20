/**
 * Data governance policy engine with enforcement and monitoring
 */

import { Pool } from 'pg';
import {
  GovernancePolicy,
  PolicyRule,
  PolicyViolation,
  EnforcementConfig,
} from '../types.js';

export class PolicyEngine {
  private policies: Map<string, GovernancePolicy> = new Map();

  constructor(private pool: Pool) {}

  async registerPolicy(policy: GovernancePolicy): Promise<void> {
    this.policies.set(policy.id, policy);
    await this.savePolicyToDatabase(policy);
  }

  async evaluateAccess(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, any> = {}
  ): Promise<{
    allowed: boolean;
    appliedPolicies: string[];
    violations: PolicyViolation[];
  }> {
    const appliedPolicies: string[] = [];
    const violations: PolicyViolation[] = [];
    let allowed = true;

    for (const [policyId, policy] of this.policies) {
      if (policy.status !== 'active') continue;

      if (this.isPolicyApplicable(policy, resource, userId, context)) {
        appliedPolicies.push(policy.name);

        const evaluation = await this.evaluatePolicy(policy, userId, resource, action, context);

        if (!evaluation.allowed) {
          allowed = false;

          if (policy.enforcement.mode === 'enforce') {
            violations.push({
              id: this.generateId(),
              policyId: policy.id,
              policyName: policy.name,
              violationType: 'access-denied',
              severity: (evaluation.severity as 'low' | 'medium' | 'high' | 'critical') || 'high',
              description: evaluation.reason || 'Access denied by policy',
              detectedAt: new Date(),
              userId,
              resource,
              action,
              context,
              status: 'open',
            });
          }
        }
      }
    }

    return { allowed, appliedPolicies, violations };
  }

  private isPolicyApplicable(
    policy: GovernancePolicy,
    resource: string,
    userId: string,
    context: Record<string, any>
  ): boolean {
    const { scope } = policy;

    if (scope.tables && scope.tables.length > 0) {
      const resourceMatch = scope.tables.some(table => resource.includes(table));
      if (!resourceMatch) return false;
    }

    if (scope.users && scope.users.length > 0) {
      if (!scope.users.includes(userId)) return false;
    }

    return true;
  }

  private async evaluatePolicy(
    policy: GovernancePolicy,
    userId: string,
    resource: string,
    action: string,
    context: Record<string, any>
  ): Promise<{ allowed: boolean; reason?: string; severity?: string }> {
    for (const rule of policy.rules.sort((a, b) => b.priority - a.priority)) {
      if (!rule.enabled) continue;

      const conditionMet = this.evaluateCondition(rule.condition, { userId, resource, action, ...context });

      if (conditionMet) {
        if (rule.action.type === 'deny') {
          return { allowed: false, reason: `Denied by rule: ${rule.id}`, severity: 'high' };
        } else if (rule.action.type === 'allow') {
          return { allowed: true };
        }
      }
    }

    return { allowed: true };
  }

  private evaluateCondition(condition: any, context: Record<string, any>): boolean {
    const { operator, attribute, value } = condition;

    const contextValue = context[attribute];

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not-equals':
        return contextValue !== value;
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'not-in':
        return Array.isArray(value) && !value.includes(contextValue);
      case 'matches':
        return new RegExp(value).test(String(contextValue));
      case 'greater-than':
        return contextValue > value;
      case 'less-than':
        return contextValue < value;
      default:
        return false;
    }
  }

  private async savePolicyToDatabase(policy: GovernancePolicy): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS governance_policies (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50),
          scope JSONB,
          rules JSONB,
          enforcement JSONB,
          status VARCHAR(50),
          version INTEGER,
          effective_date TIMESTAMP,
          expiration_date TIMESTAMP,
          owner VARCHAR(255),
          approvers JSONB,
          tags JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(
        `
        INSERT INTO governance_policies (
          id, name, description, type, scope, rules, enforcement, status, version,
          effective_date, expiration_date, owner, approvers, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
      `,
        [
          policy.id,
          policy.name,
          policy.description,
          policy.type,
          JSON.stringify(policy.scope),
          JSON.stringify(policy.rules),
          JSON.stringify(policy.enforcement),
          policy.status,
          policy.version,
          policy.effectiveDate,
          policy.expirationDate,
          policy.owner,
          JSON.stringify(policy.approvers),
          JSON.stringify(policy.tags),
        ]
      );
    } finally {
      client.release();
    }
  }

  private generateId(): string {
    return `viol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
