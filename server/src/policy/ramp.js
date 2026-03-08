"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampDecisionError = void 0;
exports.normalizeRampConfig = normalizeRampConfig;
exports.areRampConfigsEqual = areRampConfigsEqual;
exports.selectRampRule = selectRampRule;
exports.computeRampBucket = computeRampBucket;
exports.evaluateRampDecision = evaluateRampDecision;
exports.evaluateRampDecisionForTenant = evaluateRampDecisionForTenant;
exports.enforceRampDecisionForTenant = enforceRampDecisionForTenant;
const crypto_1 = require("crypto");
const bundleStore_js_1 = require("./bundleStore.js");
const DEFAULT_RAMP_CONFIG = {
    enabled: false,
    defaultAllowPercentage: 100,
    rules: [],
};
function normalizeAction(action) {
    return action.trim().toUpperCase();
}
function normalizeWorkflow(workflow) {
    return workflow ? workflow.trim().toLowerCase() : undefined;
}
function normalizeRules(rules) {
    return [...rules].map((rule) => ({
        ...rule,
        action: normalizeAction(rule.action),
        workflow: normalizeWorkflow(rule.workflow),
    }));
}
function normalizeRampConfig(config) {
    const merged = {
        ...DEFAULT_RAMP_CONFIG,
        ...(config || {}),
        rules: normalizeRules(config?.rules || DEFAULT_RAMP_CONFIG.rules),
    };
    merged.rules.sort((a, b) => {
        const actionCompare = a.action.localeCompare(b.action);
        if (actionCompare !== 0)
            return actionCompare;
        const workflowCompare = (a.workflow || '').localeCompare(b.workflow || '');
        if (workflowCompare !== 0)
            return workflowCompare;
        return (a.id || '').localeCompare(b.id || '');
    });
    return merged;
}
function areRampConfigsEqual(a, b) {
    return (JSON.stringify(normalizeRampConfig(a)) ===
        JSON.stringify(normalizeRampConfig(b)));
}
function selectRampRule(config, input) {
    const action = normalizeAction(input.action);
    const workflow = normalizeWorkflow(input.workflow);
    const candidates = config.rules.filter((rule) => {
        if (normalizeAction(rule.action) !== action)
            return false;
        if (rule.workflow && workflow) {
            return normalizeWorkflow(rule.workflow) === workflow;
        }
        if (rule.workflow && !workflow)
            return false;
        return true;
    });
    if (!candidates.length)
        return undefined;
    return candidates.sort((a, b) => {
        const aSpecific = a.workflow ? 1 : 0;
        const bSpecific = b.workflow ? 1 : 0;
        return bSpecific - aSpecific;
    })[0];
}
function computeRampBucket(params) {
    const action = normalizeAction(params.action);
    const workflow = normalizeWorkflow(params.workflow) || '';
    const salt = params.salt || '';
    const payload = `${params.tenantId}|${action}|${workflow}|${params.key}|${salt}`;
    const digest = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
    const slice = parseInt(digest.slice(0, 8), 16);
    return slice % 100;
}
function evaluateRampDecision(bundle, input) {
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
function evaluateRampDecisionForTenant(input) {
    const version = bundleStore_js_1.policyBundleStore.resolveForTenant(input.tenantId, input.policyVersionId);
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
class RampDecisionError extends Error {
    decision;
    code = 'ramp_denied';
    status = 403;
    constructor(decision) {
        super(`Ramp denied (${decision.reason})`);
        this.name = 'RampDecisionError';
        this.decision = decision;
    }
}
exports.RampDecisionError = RampDecisionError;
function enforceRampDecisionForTenant(input) {
    const decision = evaluateRampDecisionForTenant(input);
    if (!decision.allow) {
        throw new RampDecisionError(decision);
    }
    return decision;
}
