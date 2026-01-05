// @ts-nocheck
import { readFile } from 'node:fs/promises';
import * as z from 'zod';
import cloneDeep from 'lodash/cloneDeep.js';
import get from 'lodash/get.js';
import mergeWith from 'lodash/mergeWith.js';
import set from 'lodash/set.js';
import unset from 'lodash/unset.js';

const overlayPatchSchema = (z as any).object({
  op: (z as any).enum(['set', 'remove', 'append', 'merge']),
  path: (z as any).string(),
  value: (z as any).any().optional(),
});

const overlaySelectorSchema = (z as any).object({
  environments: (z as any).array((z as any).string()).optional(),
  regions: (z as any).array((z as any).string()).optional(),
  labels: (z as any).array((z as any).string()).optional(),
});

export const overlayContextSchema = overlaySelectorSchema.extend({
  environment: (z as any).string().optional(),
});

const policyRuleSchema = (z as any).object({
  id: (z as any).string(),
  description: (z as any).string().optional(),
  effect: (z as any).enum(['allow', 'deny']),
  priority: (z as any).number().int().default(0),
  conditions: (z as any)
    .object({
      actions: (z as any).array((z as any).string()).optional(),
      resourceTenants: (z as any).array((z as any).string()).optional(),
      subjectTenants: (z as any).array((z as any).string()).optional(),
      purposes: (z as any).array((z as any).string()).optional(),
      environments: (z as any).array((z as any).string()).optional(),
    })
    .default({}),
});

const crossTenantSchema = (z as any).object({
  mode: (z as any).enum(['deny', 'allowlist', 'delegated']).default('deny'),
  allow: (z as any).array((z as any).string()).default([]),
  requireAgreements: (z as any).boolean().default(true),
});

const guardrailSchema = (z as any).object({
  defaultDeny: (z as any).boolean().default(true),
  requirePurpose: (z as any).boolean().default(false),
  requireJustification: (z as any).boolean().default(false),
});

const tenantIsolationSchema = (z as any).object({
  enabled: (z as any).boolean().default(true),
  allowCrossTenant: (z as any).boolean().default(false),
  actions: (z as any).array((z as any).string()).default([]),
});

const quotaLimitSchema = (z as any).object({
  limit: (z as any).number().int().positive(),
  period: (z as any).enum(['hour', 'day', 'week', 'month']).default('day'),
});

const quotasSchema = (z as any).object({
  actions: (z as any).record(quotaLimitSchema).default({}),
});

const rampRuleSchema = (z as any).object({
  maxPercent: (z as any).number().min(0).max(100),
});

const rampsSchema = (z as any).object({
  actions: (z as any).record(rampRuleSchema).default({}),
});

const freezeWindowSchema = (z as any).object({
  id: (z as any).string(),
  start: (z as any).string(),
  end: (z as any).string(),
  actions: (z as any).array((z as any).string()).optional(),
  description: (z as any).string().optional(),
});

const dualControlSchema = (z as any).object({
  actions: (z as any).array((z as any).string()).default(['delete']),
  minApprovals: (z as any).number().int().min(2).default(2),
});

const baseProfileSchema = (z as any).object({
  id: (z as any).string(),
  version: (z as any).string(),
  regoPackage: (z as any).string(),
  entrypoints: (z as any).array((z as any).string()).min(1),
  guardrails: guardrailSchema.default({}),
  tenantIsolation: tenantIsolationSchema.default({}),
  crossTenant: crossTenantSchema.default({
    mode: 'deny',
    allow: [],
    requireAgreements: true,
  }),
  quotas: quotasSchema.default({}),
  ramps: rampsSchema.default({}),
  freezeWindows: (z as any).array(freezeWindowSchema).default([]),
  dualControl: dualControlSchema.default({}),
  rules: (z as any).array(policyRuleSchema).min(1),
});

const overlaySchema = (z as any).object({
  id: (z as any).string(),
  description: (z as any).string().optional(),
  precedence: (z as any).number().int().default(0),
  selectors: overlaySelectorSchema.default({}),
  patches: (z as any).array(overlayPatchSchema).min(1),
});

export const tenantPolicyBundleSchema = (z as any).object({
  tenantId: (z as any).string(),
  bundleId: (z as any).string().optional(),
  metadata: (z as any)
    .object({
      issuedAt: (z as any).string().optional(),
      expiresAt: (z as any).string().optional(),
      source: (z as any).string().optional(),
    })
    .default({}),
  baseProfile: baseProfileSchema,
  overlays: (z as any).array(overlaySchema).default([]),
});

export type TenantPolicyBundle = z.infer<typeof tenantPolicyBundleSchema>;
export type OverlayContext = z.infer<typeof overlayContextSchema>;

export const policySimulationInputSchema = (z as any).object({
  subjectTenantId: (z as any).string(),
  resourceTenantId: (z as any).string(),
  action: (z as any).string(),
  purpose: (z as any).string().optional(),
  justification: (z as any).string().optional(),
  requestTime: (z as any).string().optional(),
  approvals: (z as any).number().int().nonnegative().optional(),
  rampPercent: (z as any).number().min(0).max(100).optional(),
  quotaUsage: (z as any)
    .object({
      actions: (z as any).record((z as any).number().int().nonnegative()).default({}),
    })
    .optional(),
});

export type PolicySimulationInput = z.infer<typeof policySimulationInputSchema>;

export interface PolicySimulationResult {
  allow: boolean;
  reason: string;
  overlaysApplied: string[];
  evaluationPath: string[];
}

function normalizePath(pointer: string): string {
  const trimmed = pointer.startsWith('/') ? pointer.slice(1) : pointer;
  return trimmed.replace(/\//g, '.');
}

function overlayMatches(overlay: TenantPolicyBundle['overlays'][number], ctx?: OverlayContext) {
  if (!ctx) return true;
  const selectors = overlay.selectors || {};
  const envContext = ctx.environment || ctx.environments?.[0];
  if (selectors.environments && selectors.environments.length > 0) {
    if (!envContext || !selectors.environments.includes(envContext)) return false;
  }
  if (selectors.regions && selectors.regions.length > 0) {
    if (!ctx.regions || !ctx.regions.some((region) => selectors.regions!.includes(region))) {
      return false;
    }
  }
  if (selectors.labels && selectors.labels.length > 0) {
    const ctxLabels = ctx.labels || [];
    if (!ctxLabels.some((label) => selectors.labels!.includes(label))) return false;
  }
  return true;
}

function applyPatch(target: any, patch: z.infer<typeof overlayPatchSchema>) {
  const path = normalizePath(patch.path);
  switch (patch.op) {
    case 'set':
      set(target, path, patch.value);
      break;
    case 'remove':
      unset(target, path);
      break;
    case 'append': {
      const current = get(target, path);
      const next = Array.isArray(current)
        ? [...current, ...(Array.isArray(patch.value) ? patch.value : [patch.value])]
        : patch.value;
      set(target, path, next);
      break;
    }
    case 'merge': {
      const existing = get(target, path) || {};
      const merged = mergeWith({}, existing, patch.value);
      set(target, path, merged);
      break;
    }
  }
}

function materializeProfile(
  bundle: TenantPolicyBundle,
  ctx?: OverlayContext,
): { profile: TenantPolicyBundle['baseProfile']; applied: string[] } {
  const profile = cloneDeep(bundle.baseProfile);
  const overlays = [...(bundle.overlays || [])].sort(
    (a, b) => (a.precedence || 0) - (b.precedence || 0),
  );

  const applied: string[] = [];
  for (const overlay of overlays) {
    if (!overlayMatches(overlay, ctx)) continue;
    applied.push(overlay.id);
    for (const patch of overlay.patches) {
      applyPatch(profile, patch);
    }
  }

  return { profile, applied };
}

function ruleMatches(
  rule: z.infer<typeof policyRuleSchema>,
  input: PolicySimulationInput,
  ctx?: OverlayContext,
) {
  if (rule.conditions.actions && !rule.conditions.actions.includes(input.action)) return false;
  if (
    rule.conditions.resourceTenants &&
    !rule.conditions.resourceTenants.includes(input.resourceTenantId)
  )
    return false;
  if (
    rule.conditions.subjectTenants &&
    !rule.conditions.subjectTenants.includes(input.subjectTenantId)
  )
    return false;
  if (rule.conditions.purposes && input.purpose && !rule.conditions.purposes.includes(input.purpose))
    return false;
  if (rule.conditions.environments && ctx?.environment) {
    if (!rule.conditions.environments.includes(ctx.environment)) return false;
  }
  return true;
}

function actionMatches(actions: string[] | undefined, action: string): boolean {
  if (!actions || actions.length === 0) return true;
  return actions.includes(action);
}

function isWithinFreezeWindow(requestTime: string, window: z.infer<typeof freezeWindowSchema>) {
  const start = Date.parse(window.start);
  const end = Date.parse(window.end);
  const target = Date.parse(requestTime);
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(target)) return false;
  return target >= start && target <= end;
}

export function simulatePolicyDecision(
  bundle: TenantPolicyBundle,
  input: PolicySimulationInput,
  ctx?: OverlayContext,
): PolicySimulationResult {
  const { profile, applied } = materializeProfile(bundle, ctx);
  const evaluationPath: string[] = [];

  if (input.subjectTenantId !== input.resourceTenantId) {
    if (
      profile.tenantIsolation.enabled &&
      actionMatches(profile.tenantIsolation.actions, input.action) &&
      !profile.tenantIsolation.allowCrossTenant
    ) {
      return {
        allow: false,
        reason: 'tenant isolation enforced for cross-tenant access',
        overlaysApplied: applied,
        evaluationPath,
      };
    }

    if (profile.crossTenant.mode === 'deny') {
      return {
        allow: false,
        reason: 'cross-tenant access denied by base profile',
        overlaysApplied: applied,
        evaluationPath,
      };
    }
    if (
      profile.crossTenant.mode === 'allowlist' &&
      !profile.crossTenant.allow.includes(input.resourceTenantId)
    ) {
      return {
        allow: false,
        reason: 'cross-tenant access denied: resource tenant not allowlisted',
        overlaysApplied: applied,
        evaluationPath,
      };
    }
    if (profile.crossTenant.mode === 'delegated') {
      return {
        allow: false,
        reason: 'cross-tenant evaluation delegated to external decision point',
        overlaysApplied: applied,
        evaluationPath,
      };
    }
  }

  const sortedRules = [...profile.rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  let allow = profile.guardrails.defaultDeny ? false : true;
  let reason = profile.guardrails.defaultDeny ? 'default deny' : 'default allow';

  for (const rule of sortedRules) {
    if (!ruleMatches(rule, input, ctx)) continue;
    allow = rule.effect === 'allow';
    reason =
      rule.description ||
      `rule:${rule.id} (${rule.effect === 'allow' ? 'allow' : 'deny'} matched conditions)`;
    evaluationPath.push(rule.id);
  }

  if (profile.guardrails.requirePurpose && !input.purpose) {
    allow = false;
    reason = 'purpose is required by guardrails';
  }

  if (profile.guardrails.requireJustification && !input.justification) {
    allow = false;
    reason = 'justification is required by guardrails';
  }

  if (input.requestTime) {
    const activeWindow = profile.freezeWindows.find((window) => {
      if (!actionMatches(window.actions, input.action)) return false;
      return isWithinFreezeWindow(input.requestTime!, window);
    });
    if (activeWindow) {
      allow = false;
      reason = `action frozen by window:${activeWindow.id}`;
      evaluationPath.push(`freeze:${activeWindow.id}`);
    }
  }

  const quotaRule = profile.quotas.actions[input.action];
  if (quotaRule) {
    const used = input.quotaUsage?.actions?.[input.action] ?? 0;
    if (used >= quotaRule.limit) {
      allow = false;
      reason = `quota exceeded for ${input.action} (${used}/${quotaRule.limit} per ${quotaRule.period})`;
      evaluationPath.push(`quota:${input.action}`);
    }
  }

  const rampRule = profile.ramps.actions[input.action];
  if (rampRule) {
    if (input.rampPercent === undefined) {
      allow = false;
      reason = `ramp percent required for ${input.action}`;
      evaluationPath.push(`ramp:${input.action}`);
    } else if (input.rampPercent > rampRule.maxPercent) {
      allow = false;
      reason = `ramp blocked for ${input.action} (${input.rampPercent}% > ${rampRule.maxPercent}%)`;
      evaluationPath.push(`ramp:${input.action}`);
    }
  }

  if (actionMatches(profile.dualControl.actions, input.action)) {
    const approvals = input.approvals ?? 0;
    if (approvals < profile.dualControl.minApprovals) {
      allow = false;
      reason = `dual-control approvals required (${approvals}/${profile.dualControl.minApprovals})`;
      evaluationPath.push(`dual-control:${input.action}`);
    }
  }

  return { allow, reason, overlaysApplied: applied, evaluationPath };
}

export async function runPolicySimulationCli() {
  const [, , bundlePath, inputPath] = process.argv;
  if (!bundlePath || !inputPath) {
    console.error(
      'Usage: node ./dist/policy/simulationCli.js <bundle.json> <input.json> [context.json]',
    );
    process.exit(1);
  }

  const bundle = tenantPolicyBundleSchema.parse(
    JSON.parse(await readFile(bundlePath, { encoding: 'utf-8' })),
  );
  const input = policySimulationInputSchema.parse(
    JSON.parse(await readFile(inputPath, { encoding: 'utf-8' })),
  );
  const ctxPath = process.argv[4];
  const ctx = ctxPath
    ? overlayContextSchema.parse(JSON.parse(await readFile(ctxPath, { encoding: 'utf-8' })))
    : undefined;

  const result = simulatePolicyDecision(bundle, input, ctx);
  console.log(JSON.stringify(result, null, 2));
}
