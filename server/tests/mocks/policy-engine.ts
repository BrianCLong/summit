
type PolicyRule = {
  field: string;
  operator: string;
  value: unknown;
};

type Policy = {
  id: string;
  description?: string;
  scope: {
    stages: string[];
    tenants: string[];
  };
  rules: PolicyRule[];
  action: 'ALLOW' | 'DENY' | 'ESCALATE' | 'WARN';
};

type PolicyContext = {
  stage: string;
  tenantId: string;
  payload: Record<string, unknown>;
  simulation?: boolean;
};

export class PolicyEngine {
  private static instance: PolicyEngine;
  private policies: Policy[] = [];
  private evaluatorId = 'native-policy-engine-v1';

  constructor(policies?: Policy[]) {
    if (policies) {
      this.policies = policies;
    }
  }

  static getInstance() {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  async initialize() {
    return Promise.resolve();
  }

  async evaluate(context?: any) {
    if (context?.user?.role === 'admin') {
      return { allow: true, reason: 'Admin bypass' };
    }
    if (
      context?.resource?.sensitivity === 'TOP_SECRET' &&
      (context?.user?.clearance_level ?? 0) < 3
    ) {
      return { allow: false, reason: 'Insufficient clearance' };
    }
    if (
      context?.action === 'copilot_query' &&
      typeof context?.resource?.query === 'string' &&
      /ssn|social security/i.test(context.resource.query)
    ) {
      return { allow: false, reason: 'PII detected' };
    }
    return { allow: true, reason: 'Allowed' };
  }

  loadPolicies(newPolicies: Policy[]) {
    this.policies = newPolicies;
  }

  check(context: PolicyContext) {
    const start = process.hrtime();
    const violations: string[] = [];
    const violatedPolicyIds: string[] = [];
    let decision: 'ALLOW' | 'DENY' | 'ESCALATE' | 'WARN' = 'ALLOW';

    for (const policy of this.policies) {
      if (!this.isScopeMatch(policy, context)) {
        continue;
      }
      if (this.evaluateRules(policy.rules, context.payload)) {
        if (policy.action === 'DENY') {
          decision = 'DENY';
        } else if (policy.action === 'ESCALATE' && decision !== 'DENY') {
          decision = 'ESCALATE';
        } else if (policy.action === 'WARN' && decision === 'ALLOW') {
          decision = 'WARN';
        }
        violations.push(
          `Policy ${policy.id} ${policy.action.toLowerCase()}: ${policy.description || 'Rules matched'}`,
        );
        violatedPolicyIds.push(policy.id);
      }
    }

    const end = process.hrtime(start);
    const latencyMs = end[0] * 1000 + end[1] / 1e6;

    return {
      action: decision,
      reasons: violations,
      policyIds: violatedPolicyIds,
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: this.evaluatorId,
        latencyMs,
        simulation: context.simulation || false,
      },
      provenance: {
        origin: 'system-policy-check',
        confidence: 1.0,
      },
    };
  }

  middleware() {
    return (req: any, res: any, next: any) => next();
  }

  private isScopeMatch(policy: Policy, context: PolicyContext) {
    const stageMatch = policy.scope.stages.includes(context.stage);
    const tenantMatch =
      policy.scope.tenants.includes('*') ||
      policy.scope.tenants.includes(context.tenantId);
    return stageMatch && tenantMatch;
  }

  private evaluateRules(rules: PolicyRule[], payload: Record<string, unknown>) {
    return rules.every((rule) => {
      const value = this.getNestedValue(payload, rule.field);
      return this.compare(value, rule.operator, rule.value);
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string) {
    let current: unknown = obj;
    for (const key of path.split('.')) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private compare(actual: unknown, operator: string, expected: unknown) {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'neq':
        return actual !== expected;
      case 'lt':
        return typeof actual === 'number' &&
          typeof expected === 'number'
          ? actual < expected
          : false;
      case 'gt':
        return typeof actual === 'number' &&
          typeof expected === 'number'
          ? actual > expected
          : false;
      case 'in':
        return Array.isArray(expected)
          ? expected.includes(actual)
          : false;
      case 'not_in':
        return Array.isArray(expected)
          ? !expected.includes(actual)
          : false;
      case 'contains':
        return Array.isArray(actual)
          ? actual.includes(expected)
          : false;
      default:
        return false;
    }
  }
}
