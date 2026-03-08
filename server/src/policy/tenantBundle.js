"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policySimulationInputSchema = exports.tenantPolicyBundleSchema = exports.overlayContextSchema = void 0;
exports.simulatePolicyDecision = simulatePolicyDecision;
exports.runPolicySimulationCli = runPolicySimulationCli;
// @ts-nocheck
const promises_1 = require("node:fs/promises");
const z = __importStar(require("zod"));
const cloneDeep_js_1 = __importDefault(require("lodash/cloneDeep.js"));
const get_js_1 = __importDefault(require("lodash/get.js"));
const mergeWith_js_1 = __importDefault(require("lodash/mergeWith.js"));
const set_js_1 = __importDefault(require("lodash/set.js"));
const unset_js_1 = __importDefault(require("lodash/unset.js"));
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
exports.overlayContextSchema = overlaySelectorSchema.extend({
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
const tenantIsolationSchema = z.object({
    enabled: z.boolean().default(true),
    allowCrossTenant: z.boolean().default(false),
    actions: z.array(z.string()).default([]),
});
const quotaLimitSchema = z.object({
    limit: z.number().int().positive(),
    period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});
const quotasSchema = z.object({
    actions: z.record(quotaLimitSchema).default({}),
});
const rampRuleSchema = z.object({
    maxPercent: z.number().min(0).max(100),
});
const rampsSchema = z.object({
    actions: z.record(rampRuleSchema).default({}),
});
const freezeWindowSchema = z.object({
    id: z.string(),
    start: z.string(),
    end: z.string(),
    actions: z.array(z.string()).optional(),
    description: z.string().optional(),
});
const dualControlSchema = z.object({
    actions: z.array(z.string()).default(['delete']),
    minApprovals: z.number().int().min(2).default(2),
});
const baseProfileSchema = z.object({
    id: z.string(),
    version: z.string(),
    regoPackage: z.string(),
    entrypoints: z.array(z.string()).min(1),
    guardrails: guardrailSchema.default({}),
    tenantIsolation: tenantIsolationSchema.default({}),
    crossTenant: crossTenantSchema.default({
        mode: 'deny',
        allow: [],
        requireAgreements: true,
    }),
    quotas: quotasSchema.default({}),
    ramps: rampsSchema.default({}),
    freezeWindows: z.array(freezeWindowSchema).default([]),
    dualControl: dualControlSchema.default({}),
    rules: z.array(policyRuleSchema).min(1),
});
const overlaySchema = z.object({
    id: z.string(),
    description: z.string().optional(),
    precedence: z.number().int().default(0),
    selectors: overlaySelectorSchema.default({}),
    patches: z.array(overlayPatchSchema).min(1),
});
exports.tenantPolicyBundleSchema = z.object({
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
exports.policySimulationInputSchema = z.object({
    subjectTenantId: z.string(),
    resourceTenantId: z.string(),
    action: z.string(),
    purpose: z.string().optional(),
    justification: z.string().optional(),
    requestTime: z.string().optional(),
    approvals: z.number().int().nonnegative().optional(),
    rampPercent: z.number().min(0).max(100).optional(),
    quotaUsage: z
        .object({
        actions: z.record(z.number().int().nonnegative()).default({}),
    })
        .optional(),
});
function normalizePath(pointer) {
    const trimmed = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    return trimmed.replace(/\//g, '.');
}
function overlayMatches(overlay, ctx) {
    if (!ctx)
        return true;
    const selectors = overlay.selectors || {};
    const envContext = ctx.environment || ctx.environments?.[0];
    if (selectors.environments && selectors.environments.length > 0) {
        if (!envContext || !selectors.environments.includes(envContext))
            return false;
    }
    if (selectors.regions && selectors.regions.length > 0) {
        if (!ctx.regions || !ctx.regions.some((region) => selectors.regions.includes(region))) {
            return false;
        }
    }
    if (selectors.labels && selectors.labels.length > 0) {
        const ctxLabels = ctx.labels || [];
        if (!ctxLabels.some((label) => selectors.labels.includes(label)))
            return false;
    }
    return true;
}
function applyPatch(target, patch) {
    const path = normalizePath(patch.path);
    switch (patch.op) {
        case 'set':
            (0, set_js_1.default)(target, path, patch.value);
            break;
        case 'remove':
            (0, unset_js_1.default)(target, path);
            break;
        case 'append': {
            const current = (0, get_js_1.default)(target, path);
            const next = Array.isArray(current)
                ? [...current, ...(Array.isArray(patch.value) ? patch.value : [patch.value])]
                : patch.value;
            (0, set_js_1.default)(target, path, next);
            break;
        }
        case 'merge': {
            const existing = (0, get_js_1.default)(target, path) || {};
            const merged = (0, mergeWith_js_1.default)({}, existing, patch.value);
            (0, set_js_1.default)(target, path, merged);
            break;
        }
    }
}
function materializeProfile(bundle, ctx) {
    const profile = (0, cloneDeep_js_1.default)(bundle.baseProfile);
    const overlays = [...(bundle.overlays || [])].sort((a, b) => (a.precedence || 0) - (b.precedence || 0));
    const applied = [];
    for (const overlay of overlays) {
        if (!overlayMatches(overlay, ctx))
            continue;
        applied.push(overlay.id);
        for (const patch of overlay.patches) {
            applyPatch(profile, patch);
        }
    }
    return { profile, applied };
}
function ruleMatches(rule, input, ctx) {
    if (rule.conditions.actions && !rule.conditions.actions.includes(input.action))
        return false;
    if (rule.conditions.resourceTenants &&
        !rule.conditions.resourceTenants.includes(input.resourceTenantId))
        return false;
    if (rule.conditions.subjectTenants &&
        !rule.conditions.subjectTenants.includes(input.subjectTenantId))
        return false;
    if (rule.conditions.purposes && input.purpose && !rule.conditions.purposes.includes(input.purpose))
        return false;
    if (rule.conditions.environments && ctx?.environment) {
        if (!rule.conditions.environments.includes(ctx.environment))
            return false;
    }
    return true;
}
function actionMatches(actions, action) {
    if (!actions || actions.length === 0)
        return true;
    return actions.includes(action);
}
function isWithinFreezeWindow(requestTime, window) {
    const start = Date.parse(window.start);
    const end = Date.parse(window.end);
    const target = Date.parse(requestTime);
    if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(target))
        return false;
    return target >= start && target <= end;
}
function simulatePolicyDecision(bundle, input, ctx) {
    const { profile, applied } = materializeProfile(bundle, ctx);
    const evaluationPath = [];
    if (input.subjectTenantId !== input.resourceTenantId) {
        if (profile.tenantIsolation.enabled &&
            actionMatches(profile.tenantIsolation.actions, input.action) &&
            !profile.tenantIsolation.allowCrossTenant) {
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
        if (profile.crossTenant.mode === 'allowlist' &&
            !profile.crossTenant.allow.includes(input.resourceTenantId)) {
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
        if (!ruleMatches(rule, input, ctx))
            continue;
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
            if (!actionMatches(window.actions, input.action))
                return false;
            return isWithinFreezeWindow(input.requestTime, window);
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
        }
        else if (input.rampPercent > rampRule.maxPercent) {
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
async function runPolicySimulationCli() {
    const [, , bundlePath, inputPath] = process.argv;
    if (!bundlePath || !inputPath) {
        console.error('Usage: node ./dist/policy/simulationCli.js <bundle.json> <input.json> [context.json]');
        process.exit(1);
    }
    const bundle = exports.tenantPolicyBundleSchema.parse(JSON.parse(await (0, promises_1.readFile)(bundlePath, { encoding: 'utf-8' })));
    const input = exports.policySimulationInputSchema.parse(JSON.parse(await (0, promises_1.readFile)(inputPath, { encoding: 'utf-8' })));
    const ctxPath = process.argv[4];
    const ctx = ctxPath
        ? exports.overlayContextSchema.parse(JSON.parse(await (0, promises_1.readFile)(ctxPath, { encoding: 'utf-8' })))
        : undefined;
    const result = simulatePolicyDecision(bundle, input, ctx);
    console.log(JSON.stringify(result, null, 2));
}
