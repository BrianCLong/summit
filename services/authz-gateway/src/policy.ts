import { createHash } from 'crypto';
import policyBundle from './policies/default-bundle.json';
import { features } from './config';

export interface PolicyUser {
  sub?: string;
  tenantId?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface PolicyResource {
  path: string;
  tenantId?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PolicyInput {
  user: PolicyUser;
  resource: PolicyResource;
  action: string;
  purpose: string;
  authority: string;
}

export interface PolicyObligations {
  redact: string[];
  mask: Record<string, string>;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  policyId: string;
  policyVersion: string;
  appealLink: string;
  appealToken: string;
  obligations: PolicyObligations;
}

export interface DryRunResult {
  decision: PolicyDecision;
  fields: Record<string, FieldEffect>;
}

export interface FieldEffect {
  before: unknown;
  after: unknown;
  effect: 'allow' | 'redact' | 'mask';
}

type CompiledRule = ReturnType<typeof compileRule>;

type ClaimCondition = {
  equals?: string | number | boolean;
  oneOf?: Array<string | number | boolean>;
  notOneOf?: Array<string | number | boolean>;
  equalsResource?: string;
  notEqualsResource?: string;
  exists?: boolean;
  missing?: boolean;
};

type PurposeCondition = {
  oneOf?: string[];
  missing?: boolean;
};

type AuthorityCondition = PurposeCondition;

type ResourceCondition = {
  equals?: string | number | boolean;
  exists?: boolean;
};

interface PolicyRule {
  id: string;
  effect: 'allow' | 'deny';
  reason: string;
  appealLink: string;
  match?: {
    actions?: string[];
    path?: string;
    rolesAnyOf?: string[];
    claims?: Record<string, ClaimCondition>;
    purpose?: PurposeCondition;
    authority?: AuthorityCondition;
    needToKnow?: 'missing';
    resource?: Record<string, ResourceCondition>;
  };
  obligations?: PolicyObligations;
}

interface PolicyBundle {
  metadata: {
    name: string;
    version: string;
  };
  defaults: {
    policyId: string;
    reason: string;
    appealLink: string;
    obligations: PolicyObligations;
  };
  rules: PolicyRule[];
}

interface CompiledBundle {
  metadata: PolicyBundle['metadata'];
  defaults: PolicyBundle['defaults'];
  rules: CompiledRule[];
}

function compileRule(rule: PolicyRule) {
  const pathRegex = rule.match?.path ? new RegExp(rule.match.path) : undefined;
  return {
    ...rule,
    pathRegex,
  };
}

function compileBundle(bundle: PolicyBundle): CompiledBundle {
  return {
    metadata: bundle.metadata,
    defaults: bundle.defaults,
    rules: bundle.rules.map(compileRule),
  };
}

const compiled = compileBundle(policyBundle as PolicyBundle);

function maskValue(value: unknown, maskType: string): unknown {
  if (value == null) return value;
  const stringValue = String(value);
  switch (maskType) {
    case 'INITIALS': {
      return stringValue
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment[0]?.toUpperCase() ?? '')
        .join('');
    }
    case 'YEAR': {
      return stringValue.substring(0, 4);
    }
    case 'LAST4': {
      const last = stringValue.slice(-4);
      return last.padStart(stringValue.length, '*');
    }
    default:
      return maskType;
  }
}

function getNestedValue(record: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

function setNestedValue(
  record: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const segments = path.split('.');
  let cursor: Record<string, unknown> = record;
  for (let i = 0; i < segments.length; i += 1) {
    const key = segments[i];
    if (i === segments.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
}

function flatten(record: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(record).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

function applyObligations(
  record: Record<string, unknown> | undefined,
  obligations: PolicyObligations,
): Record<string, FieldEffect> {
  if (!record) return {};
  const cloned = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  const effects: Record<string, FieldEffect> = {};
  for (const path of obligations.redact) {
    const before = getNestedValue(cloned, path);
    if (before !== undefined) {
      setNestedValue(cloned, path, '[REDACTED]');
      effects[path] = { before, after: '[REDACTED]', effect: 'redact' };
    }
  }
  for (const [path, mask] of Object.entries(obligations.mask)) {
    const before = getNestedValue(cloned, path);
    if (before !== undefined) {
      const masked = maskValue(before, mask);
      setNestedValue(cloned, path, masked);
      effects[path] = { before, after: masked, effect: 'mask' };
    }
  }
  const allowedPaths = flatten(record);
  for (const path of allowedPaths) {
    if (!effects[path]) {
      const value = getNestedValue(record, path);
      effects[path] = { before: value, after: value, effect: 'allow' };
    }
  }
  return effects;
}

function claimSatisfied(
  key: string,
  condition: ClaimCondition,
  input: PolicyInput,
): boolean {
  const claimValue = input.user[key as keyof PolicyUser];
  const hasValue = claimValue !== undefined && claimValue !== null;
  if (condition.exists && !hasValue) {
    return false;
  }
  if (condition.missing && hasValue) {
    return false;
  }
  if (!hasValue) {
    if (
      condition.equals !== undefined ||
      condition.oneOf ||
      condition.notOneOf ||
      condition.equalsResource ||
      condition.notEqualsResource
    ) {
      return false;
    }
    return true;
  }
  if (condition.equals !== undefined && claimValue !== condition.equals) {
    return false;
  }
  if (condition.oneOf && !condition.oneOf.includes(claimValue as never)) {
    return false;
  }
  if (condition.notOneOf && condition.notOneOf.includes(claimValue as never)) {
    return false;
  }
  if (condition.equalsResource) {
    return (
      claimValue ===
      (input.resource[
        condition.equalsResource as keyof PolicyResource
      ] as unknown)
    );
  }
  if (condition.notEqualsResource) {
    return (
      claimValue !==
      (input.resource[
        condition.notEqualsResource as keyof PolicyResource
      ] as unknown)
    );
  }
  return true;
}

function resourceSatisfied(
  key: string,
  condition: ResourceCondition,
  input: PolicyInput,
): boolean {
  const resourceValue = input.resource[key];
  const hasValue = resourceValue !== undefined && resourceValue !== null;
  if (condition.exists && !hasValue) {
    return false;
  }
  if (!hasValue) {
    if (condition.equals !== undefined) {
      return false;
    }
    return true;
  }
  if (condition.equals !== undefined && resourceValue !== condition.equals) {
    return false;
  }
  return true;
}

function ruleMatches(rule: CompiledRule, input: PolicyInput): boolean {
  const match = rule.match;
  if (!match) return true;
  if (match.actions && !match.actions.includes(input.action)) {
    return false;
  }
  if (rule.pathRegex && !rule.pathRegex.test(input.resource.path)) {
    return false;
  }
  if (match.rolesAnyOf && match.rolesAnyOf.length > 0) {
    const roles = input.user.roles || [];
    if (!match.rolesAnyOf.some((role) => roles.includes(role))) {
      return false;
    }
  }
  if (match.purpose) {
    if (match.purpose.missing) {
      if (input.purpose) {
        return false;
      }
    } else if (
      match.purpose.oneOf &&
      !match.purpose.oneOf.includes(input.purpose)
    ) {
      return false;
    }
  }
  if (match.authority) {
    if (match.authority.missing) {
      if (input.authority) {
        return false;
      }
    } else if (
      match.authority.oneOf &&
      !match.authority.oneOf.includes(input.authority)
    ) {
      return false;
    }
  }
  if (match.needToKnow === 'missing') {
    const tag =
      (input.resource.attributes?.needToKnow as string | undefined) ||
      (input.resource.needToKnow as string | undefined);
    if (!tag) {
      return false;
    }
    const roles = input.user.roles || [];
    if (roles.includes(tag)) {
      return false;
    }
  }
  if (match.claims) {
    for (const [key, condition] of Object.entries(match.claims)) {
      if (!claimSatisfied(key, condition, input)) {
        return false;
      }
    }
  }
  if (match.resource) {
    for (const [key, condition] of Object.entries(match.resource)) {
      if (!resourceSatisfied(key, condition, input)) {
        return false;
      }
    }
  }
  return true;
}

function computeAppealToken(ruleId: string, input: PolicyInput) {
  const hash = createHash('sha256');
  hash.update(ruleId);
  hash.update(input.action);
  hash.update(input.resource.path);
  hash.update(String(input.user.sub ?? 'anonymous'));
  return hash.digest('hex').slice(0, 24);
}

function evaluatePolicy(input: PolicyInput): PolicyDecision {
  for (const rule of compiled.rules) {
    if (ruleMatches(rule, input)) {
      const obligations = rule.obligations || compiled.defaults.obligations;
      return {
        allowed: rule.effect === 'allow',
        reason: rule.reason,
        policyId: rule.id,
        policyVersion: compiled.metadata.version,
        appealLink: rule.appealLink,
        appealToken: computeAppealToken(rule.id, input),
        obligations,
      };
    }
  }
  return {
    allowed: false,
    reason: compiled.defaults.reason,
    policyId: compiled.defaults.policyId,
    policyVersion: compiled.metadata.version,
    appealLink: compiled.defaults.appealLink,
    appealToken: computeAppealToken(compiled.defaults.policyId, input),
    obligations: compiled.defaults.obligations,
  };
}

export async function authorize(input: PolicyInput): Promise<PolicyDecision> {
  if (!features.policyReasoner) {
    return {
      allowed: true,
      reason: 'policy_reasoner_disabled',
      policyId: 'policy.disabled',
      policyVersion: compiled.metadata.version,
      appealLink: compiled.defaults.appealLink,
      appealToken: computeAppealToken('policy.disabled', input),
      obligations: compiled.defaults.obligations,
    };
  }
  return evaluatePolicy(input);
}

export async function dryRun(
  input: PolicyInput,
  record?: Record<string, unknown>,
): Promise<DryRunResult> {
  const decision = await authorize(input);
  return {
    decision,
    fields: applyObligations(record, decision.obligations),
  };
}

export function getPolicyBundle() {
  return compiled;
}

export function bundleChecksum(): string {
  const hash = createHash('sha256');
  const payload = JSON.stringify(
    policyBundle,
    Object.keys(policyBundle).sort(),
  );
  hash.update(payload);
  return hash.digest('hex');
}

export const __testInternals = {
  applyObligations,
  maskValue,
  setNestedValue: (
    record: Record<string, unknown>,
    path: string,
    value: unknown,
  ) => setNestedValue(record, path, value),
  claimSatisfied: (
    key: string,
    condition: ClaimCondition,
    input: PolicyInput,
  ) => claimSatisfied(key, condition, input),
  resourceSatisfied: (
    key: string,
    condition: ResourceCondition,
    input: PolicyInput,
  ) => resourceSatisfied(key, condition, input),
};
