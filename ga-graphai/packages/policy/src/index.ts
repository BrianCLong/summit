import type {
  PolicyCondition,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyEvaluationTrace,
  PolicyEffect,
  PolicyRule
} from 'common-types';

function valueMatches(
  left: string | number | boolean | undefined,
  operator: PolicyCondition['operator'],
  right: PolicyCondition['value']
): boolean {
  if (left === undefined) {
    return false;
  }

  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'lt':
      return typeof left === 'number' && typeof right === 'number' && left < right;
    case 'lte':
      return typeof left === 'number' && typeof right === 'number' && left <= right;
    case 'gt':
      return typeof left === 'number' && typeof right === 'number' && left > right;
    case 'gte':
      return typeof left === 'number' && typeof right === 'number' && left >= right;
    case 'includes':
      if (Array.isArray(right)) {
        if (Array.isArray(left)) {
          return left.some(item => right.includes(item));
        }
        return right.includes(left);
      }
      if (Array.isArray(left)) {
        return left.includes(right as never);
      }
      return false;
    default:
      return false;
  }
}

function ruleTargetsRequest(rule: PolicyRule, request: PolicyEvaluationRequest): boolean {
  const actionMatch =
    rule.actions.length === 0 || rule.actions.some(action => action === request.action);
  const resourceMatch =
    rule.resources.length === 0 || rule.resources.some(resource => resource === request.resource);
  return actionMatch && resourceMatch;
}

function evaluateConditions(
  rule: PolicyRule,
  request: PolicyEvaluationRequest,
  trace: string[]
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }

  const attributes = {
    roles: request.context.roles,
    region: request.context.region,
    ...request.context.attributes
  } as Record<string, string | number | boolean | Array<string | number | boolean>>;

  return rule.conditions.every(condition => {
    const candidate = attributes[condition.attribute];
    const matched = valueMatches(candidate as never, condition.operator, condition.value);
    if (!matched) {
      trace.push(
        `condition ${condition.attribute} ${condition.operator} ${JSON.stringify(condition.value)} failed`
      );
    }
    return matched;
  });
}

export class PolicyEngine {
  private readonly rules: PolicyRule[];

  constructor(rules: PolicyRule[] = []) {
    this.rules = [...rules];
  }

  registerRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const matchedRules: string[] = [];
    const reasons: string[] = [];
    const obligations = [] as NonNullable<PolicyRule['obligations']>;
    const trace: PolicyEvaluationTrace[] = [];

    let finalEffect: PolicyEffect = 'deny';

    for (const rule of this.rules) {
      const ruleReasons: string[] = [];
      let matched = false;

      if (ruleTargetsRequest(rule, request)) {
        matched = evaluateConditions(rule, request, ruleReasons);
      }

      if (matched) {
        matchedRules.push(rule.id);
        if (rule.effect === 'deny') {
          finalEffect = 'deny';
          reasons.push(`Denied by ${rule.id}`);
          trace.push({ ruleId: rule.id, matched: true, reasons: ruleReasons });
          return {
            allowed: false,
            effect: 'deny',
            matchedRules,
            reasons,
            obligations: [],
            trace
          };
        }

        finalEffect = 'allow';
        reasons.push(`Allowed by ${rule.id}`);
        if (rule.obligations) {
          obligations.push(...rule.obligations);
        }
      } else {
        if (ruleReasons.length > 0) {
          reasons.push(...ruleReasons.map(reason => `${rule.id}: ${reason}`));
        }
      }

      trace.push({ ruleId: rule.id, matched, reasons: ruleReasons });
    }

    return {
      allowed: finalEffect === 'allow',
      effect: finalEffect,
      matchedRules,
      reasons,
      obligations,
      trace
    };
  }
}

export function buildDefaultPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine([
    {
      id: 'default-allow-intent-read',
      description: 'Allow read access to intents within the tenant',
      effect: 'allow',
      actions: ['intent:read'],
      resources: ['intent'],
      conditions: [
        { attribute: 'roles', operator: 'includes', value: ['product-manager', 'architect'] }
      ],
      obligations: [{ type: 'emit-audit' }]
    },
    {
      id: 'allow-workcell-execution',
      description: 'Permit authorised roles to execute workcell tasks in approved regions',
      effect: 'allow',
      actions: ['workcell:execute'],
      resources: ['analysis', 'codegen', 'evaluation'],
      conditions: [
        { attribute: 'roles', operator: 'includes', value: ['developer', 'architect'] },
        { attribute: 'region', operator: 'eq', value: 'allowed-region' }
      ],
      obligations: [{ type: 'record-provenance' }]
    },
    {
      id: 'deny-out-of-region-models',
      description: 'Block model usage when region requirements do not match',
      effect: 'deny',
      actions: ['model:invoke'],
      resources: ['llm'],
      conditions: [{ attribute: 'region', operator: 'neq', value: 'allowed-region' }]
    }
  ]);

  return engine;
}
