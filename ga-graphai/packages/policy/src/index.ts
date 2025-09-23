<<<<<<< HEAD
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

// ============================================================================
// CURSOR POLICY EVALUATION - Added from PR 1299
// ============================================================================

import {
  type CursorDataClass,
  type CursorEvent,
  type CursorPurpose,
  type PolicyDecision,
  type PolicyEvaluationContext,
  mergeDataClasses,
  MODEL_ALLOWLIST,
  PURPOSE_ALLOWLIST,
} from "common-types";

export interface PolicyConfig {
  allowedLicenses: string[];
  allowedPurposes: CursorPurpose[];
  modelAllowList: string[];
  deniedDataClasses?: CursorDataClass[];
  redactableDataClasses?: CursorDataClass[];
  requireRedactionForDeniedDataClasses?: boolean;
  purposeOverrides?: Record<string, { allow: boolean; explanation: string }>;
  licenseOverrides?: Record<string, { allow: boolean; explanation: string }>;
  blockedModels?: Record<string, string>;
}

export interface PolicyEvaluatorOptions {
  config: PolicyConfig;
  now?: () => Date;
}

const DEFAULT_CONFIG: PolicyConfig = {
  allowedLicenses: ["MIT", "Apache-2.0"],
  allowedPurposes: [...PURPOSE_ALLOWLIST],
  modelAllowList: Array.from(MODEL_ALLOWLIST),
  deniedDataClasses: ["production-PII", "secrets", "proprietary-client"],
  redactableDataClasses: ["production-PII"],
  requireRedactionForDeniedDataClasses: true,
};

export class PolicyEvaluator {
  private readonly config: PolicyConfig;
  private readonly now: () => Date;

  constructor(options?: PolicyEvaluatorOptions) {
    this.config = options?.config ?? DEFAULT_CONFIG;
    this.now = options?.now ?? (() => new Date());
  }

  evaluate(
    event: CursorEvent,
    context: PolicyEvaluationContext = {}
  ): PolicyDecision {
    const explanations: string[] = [];
    const ruleIds: string[] = [];
    const denies: string[] = [];

    const model = context.model ?? event.model;
    if (!model) {
      denies.push("model-missing");
    } else {
      const allowReason = this.checkModel(model.name);
      explanations.push(allowReason);
      if (allowReason.startsWith("deny:")) {
        denies.push(allowReason);
      } else {
        ruleIds.push("model-allowlist");
      }
    }

    const purpose = context.purpose ?? event.purpose;
    const purposeDecision = this.checkPurpose(purpose);
    explanations.push(purposeDecision);
    if (purposeDecision.startsWith("deny:")) {
      denies.push(purposeDecision);
    } else {
      ruleIds.push("purpose-allowlist");
    }

    const license = context.repoMeta?.license;
    if (license) {
      const licenseDecision = this.checkLicense(license);
      explanations.push(licenseDecision);
      if (licenseDecision.startsWith("deny:")) {
        denies.push(licenseDecision);
      } else {
        ruleIds.push("license-allowlist");
      }
    } else {
      explanations.push("warn:license-unknown");
    }

    const scan = context.scan;
    if (scan?.piiFound) {
      denies.push("deny:pii-detected");
      explanations.push("deny:pii-detected");
    } else {
      explanations.push("allow:no-pii");
    }

    if (scan?.secretsFound) {
      denies.push("deny:secret-detected");
      explanations.push("deny:secret-detected");
    }

    const classes = mergeDataClasses(event, context);
    const dataClassDecision = this.checkDataClasses(classes, scan);
    explanations.push(...dataClassDecision.explanations);
    denies.push(...dataClassDecision.denies);
    if (dataClassDecision.ruleId) {
      ruleIds.push(dataClassDecision.ruleId);
    }

    const decision: PolicyDecision = {
      decision: denies.length > 0 ? "deny" : "allow",
      explanations,
      ruleIds,
      timestamp: this.now().toISOString(),
      metadata: {
        model: model?.name,
        purpose,
        license,
        dataClasses: classes,
        scan,
      },
    };

    if (denies.length > 0) {
      decision.metadata = {
        ...decision.metadata,
        denyReasons: denies,
      };
    }

    return decision;
  }

  private checkModel(modelName: string): string {
    if (this.config.blockedModels?.[modelName]) {
      return `deny:model-blocked:${this.config.blockedModels[modelName]}`;
    }

    if (this.config.modelAllowList.includes(modelName)) {
      return `allow:model:${modelName}`;
    }

    return "deny:model-not-allowed";
  }

  private checkPurpose(purpose: CursorPurpose): string {
    const override = this.config.purposeOverrides?.[purpose];
    if (override) {
      return `${override.allow ? "allow" : "deny"}:purpose:${override.explanation}`;
    }

    if (this.config.allowedPurposes.includes(purpose)) {
      return `allow:purpose:${purpose}`;
    }

    return "deny:purpose-not-allowed";
  }

  private checkLicense(license: string): string {
    const override = this.config.licenseOverrides?.[license];
    if (override) {
      return `${override.allow ? "allow" : "deny"}:license:${override.explanation}`;
    }

    if (this.config.allowedLicenses.includes(license)) {
      return `allow:license:${license}`;
    }

    return "deny:license-not-allowed";
  }

  private checkDataClasses(
    classes: CursorDataClass[],
    scan?: PolicyEvaluationContext["scan"]
  ): { explanations: string[]; denies: string[]; ruleId?: string } {
    const explanations: string[] = [];
    const denies: string[] = [];

    if (classes.length === 0) {
      explanations.push("allow:no-sensitive-classes");
      return { explanations, denies, ruleId: "data-class-baseline" };
    }

    const denied = new Set(this.config.deniedDataClasses ?? []);
    const redactable = new Set(this.config.redactableDataClasses ?? []);
    const flagged: CursorDataClass[] = [];
    const redactionRequired: CursorDataClass[] = [];

    for (const dataClass of classes) {
      if (denied.has(dataClass)) {
        flagged.push(dataClass);
        if (redactable.has(dataClass)) {
          redactionRequired.push(dataClass);
        }
      }
    }

    if (flagged.length === 0) {
      explanations.push("allow:data-classes-ok");
      return { explanations, denies, ruleId: "data-class-baseline" };
    }

    if (
      redactionRequired.length > 0 &&
      this.config.requireRedactionForDeniedDataClasses &&
      !scan?.redactionsApplied
    ) {
      denies.push(
        `deny:redaction-required:${redactionRequired.join(",")}`
      );
      explanations.push(
        `deny:redaction-required:${redactionRequired.join(",")}`
      );
      return { explanations, denies, ruleId: "data-class-redaction" };
    }

    if (flagged.length > 0 && redactionRequired.length === 0) {
      denies.push(`deny:data-class:${flagged.join(",")}`);
      explanations.push(`deny:data-class:${flagged.join(",")}`);
      return { explanations, denies, ruleId: "data-class-deny" };
    }

    explanations.push("allow:data-classes-redacted");
    return { explanations, denies, ruleId: "data-class-redaction" };
  }
}
