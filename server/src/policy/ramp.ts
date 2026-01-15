import { createHash } from 'crypto';
import { policyBundleStore } from './bundleStore.js';
import type { TenantPolicyBundle } from './tenantBundle.js';

export interface RampRule {
  id?: string;
  description?: string;
  action: string;
  workflow?: string;
  allowPercentage: number;
}

export interface RampConfig {
  enabled: boolean;
  defaultAllowPercentage: number;
  rules: RampRule[];
  salt?: string;
}

export interface RampInput {
  tenantId: string;
  action: string;
  workflow?: string;
  key: string;
  policyVersionId?: string;
}

export interface RampDecision {
  allow: boolean;
  percentage: number;
  bucket: number;
  reason: string;
  rule?: RampRule;
}

const DEFAULT_RAMP_CONFIG: RampConfig = {
  enabled: false,
  defaultAllowPercentage: 100,
  rules: [],
};

function normalizeAction(action: string): string {
  return action.trim().toUpperCase();
}

function normalizeWorkflow(workflow?: string): string | undefined {
  return workflow ? workflow.trim().toLowerCase() : undefined;
}

function normalizeRules(rules: RampRule[]): RampRule[] {
  return [...rules].map((rule) => ({
    ...rule,
    action: normalizeAction(rule.action),
    workflow: normalizeWorkflow(rule.workflow),
  }));
}

export function normalizeRampConfig(
  config?: Partial<RampConfig> | null,
): RampConfig {
  const merged: RampConfig = {
    ...DEFAULT_RAMP_CONFIG,
    ...(config || {}),
    rules: normalizeRules(config?.rules || DEFAULT_RAMP_CONFIG.rules),
  };

  merged.rules.sort((a, b) => {
    const actionCompare = a.action.localeCompare(b.action);
    if (actionCompare !== 0) return actionCompare;
    const workflowCompare = (a.workflow || '').localeCompare(b.workflow || '');
    if (workflowCompare !== 0) return workflowCompare;
    return (a.id || '').localeCompare(b.id || '');
  });

  return merged;
}

export function areRampConfigsEqual(
  a?: Partial<RampConfig> | null,
  b?: Partial<RampConfig> | null,
): boolean {
  return (
    JSON.stringify(normalizeRampConfig(a)) ===
    JSON.stringify(normalizeRampConfig(b))
  );
}

export function selectRampRule(
  config: RampConfig,
  input: RampInput,
): RampRule | undefined {
  const action = normalizeAction(input.action);
  const workflow = normalizeWorkflow(input.workflow);
  const candidates = config.rules.filter((rule) => {
    if (normalizeAction(rule.action) !== action) return false;
    if (rule.workflow && workflow) {
      return normalizeWorkflow(rule.workflow) === workflow;
    }
    if (rule.workflow && !workflow) return false;
    return true;
  });

  if (!candidates.length) return undefined;

  return candidates.sort((a, b) => {
    const aSpecific = a.workflow ? 1 : 0;
    const bSpecific = b.workflow ? 1 : 0;
    return bSpecific - aSpecific;
  })[0];
}

export function computeRampBucket(params: {
  tenantId: string;
  action: string;
  workflow?: string;
  key: string;
  salt?: string;
}): number {
  const action = normalizeAction(params.action);
  const workflow = normalizeWorkflow(params.workflow) || '';
  const salt = params.salt || '';
  const payload = `${params.tenantId}|${action}|${workflow}|${params.key}|${salt}`;
  const digest = createHash('sha256').update(payload).digest('hex');
  const slice = parseInt(digest.slice(0, 8), 16);
  return slice % 100;
}

export function evaluateRampDecision(
  bundle: TenantPolicyBundle,
  input: RampInput,
): RampDecision {
  const config = normalizeRampConfig(bundle.baseProfile?.ramp);
  if (!config.enabled) {
    return {
      allow: true,
      percentage: 100,
      bucket: 0,
      reason: 'ramp_disabled',
    };
  }

  const rule = selectRampRule(config, input);
  const percentage = rule?.allowPercentage ?? config.defaultAllowPercentage;
  const bucket = computeRampBucket({
    tenantId: input.tenantId,
    action: input.action,
    workflow: input.workflow,
    key: input.key,
    salt: config.salt,
  });
  const allow = bucket < percentage;

  return {
    allow,
    percentage,
    bucket,
    rule,
    reason: allow ? 'ramp_allow' : 'ramp_deny',
  };
}

export function evaluateRampDecisionForTenant(
  input: RampInput,
): RampDecision {
  const version = policyBundleStore.resolveForTenant(
    input.tenantId,
    input.policyVersionId,
  );
  if (!version) {
    return {
      allow: true,
      percentage: 100,
      bucket: 0,
      reason: 'ramp_bundle_missing',
    };
  }

  return evaluateRampDecision(version.bundle, input);
}

export class RampDecisionError extends Error {
  public readonly decision: RampDecision;
  public readonly code = 'ramp_denied';
  public readonly status = 403;

  constructor(decision: RampDecision) {
    super(`Ramp denied (${decision.reason})`);
    this.name = 'RampDecisionError';
    this.decision = decision;
  }
}

export function enforceRampDecisionForTenant(input: RampInput): RampDecision {
  const decision = evaluateRampDecisionForTenant(input);
  if (!decision.allow) {
    throw new RampDecisionError(decision);
  }
  return decision;
}
