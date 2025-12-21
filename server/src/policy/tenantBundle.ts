// @ts-nocheck
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import cloneDeep from 'lodash/cloneDeep.js';
import get from 'lodash/get.js';
import mergeWith from 'lodash/mergeWith.js';
import set from 'lodash/set.js';
import unset from 'lodash/unset.js';
import { appLogger } from '../logging/structuredLogger.js';

const overlayPatchSchema = z.object({
  op: z.enum(['set', 'remove', 'append', 'merge']),
  path: z.string(),
  value: z.any().optional(),
});

const overlaySelectorSchema = z.object({
  environments: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
});

export const overlayContextSchema = overlaySelectorSchema.extend({
  environment: z.string().optional(),
});

const policyRuleSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  effect: z.enum(['allow', 'deny']),
  priority: z.number().int().default(0),
  conditions: z
    .object({
      actions: z.array(z.string()).optional(),
      resourceTenants: z.array(z.string()).optional(),
      subjectTenants: z.array(z.string()).optional(),
      purposes: z.array(z.string()).optional(),
      environments: z.array(z.string()).optional(),
    })
    .default({}),
});

const crossTenantSchema = z.object({
  mode: z.enum(['deny', 'allowlist', 'delegated']).default('deny'),
  allow: z.array(z.string()).default([]),
  requireAgreements: z.boolean().default(true),
});

const guardrailSchema = z.object({
  defaultDeny: z.boolean().default(true),
  requirePurpose: z.boolean().default(false),
  requireJustification: z.boolean().default(false),
});

const baseProfileSchema = z.object({
  id: z.string(),
  version: z.string(),
  regoPackage: z.string(),
  entrypoints: z.array(z.string()).min(1),
  guardrails: guardrailSchema.default({}),
  crossTenant: crossTenantSchema.default({
    mode: 'deny',
    allow: [],
    requireAgreements: true,
  }),
  rules: z.array(policyRuleSchema).min(1),
});

const overlaySchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  precedence: z.number().int().default(0),
  selectors: overlaySelectorSchema.default({}),
  patches: z.array(overlayPatchSchema).min(1),
});

export const tenantPolicyBundleSchema = z.object({
  tenantId: z.string(),
  bundleId: z.string().optional(),
  metadata: z
    .object({
      issuedAt: z.string().optional(),
      expiresAt: z.string().optional(),
      source: z.string().optional(),
    })
    .default({}),
  baseProfile: baseProfileSchema,
  overlays: z.array(overlaySchema).default([]),
});

export type TenantPolicyBundle = z.infer<typeof tenantPolicyBundleSchema>;
export type OverlayContext = z.infer<typeof overlayContextSchema>;

export const policySimulationInputSchema = z.object({
  subjectTenantId: z.string(),
  resourceTenantId: z.string(),
  action: z.string(),
  purpose: z.string().optional(),
  justification: z.string().optional(),
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

export function simulatePolicyDecision(
  bundle: TenantPolicyBundle,
  input: PolicySimulationInput,
  ctx?: OverlayContext,
): PolicySimulationResult {
  const { profile, applied } = materializeProfile(bundle, ctx);
  const evaluationPath: string[] = [];

  if (input.subjectTenantId !== input.resourceTenantId) {
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

  return { allow, reason, overlaysApplied: applied, evaluationPath };
}

export async function runPolicySimulationCli() {
  const [, , bundlePath, inputPath] = process.argv;
  if (!bundlePath || !inputPath) {
    appLogger.error(
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
  appLogger.info({ result }, 'Policy simulation result');
}
