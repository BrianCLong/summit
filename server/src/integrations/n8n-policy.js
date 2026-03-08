"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkN8nTriggerAllowed = checkN8nTriggerAllowed;
exports.listAllowedN8nFlows = listAllowedN8nFlows;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const axios_1 = __importDefault(require("axios"));
const logger = logger_js_1.default.child({ name: 'n8n-policy' });
function loadPolicy() {
    try {
        const p = path_1.default.resolve(__dirname, '../../config/n8n-flows.json');
        const j = JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
        return {
            allowedPrefixes: Array.isArray(j.allowedPrefixes)
                ? j.allowedPrefixes
                : ['integration/'],
            deniedPrefixes: Array.isArray(j.deniedPrefixes)
                ? j.deniedPrefixes
                : ['deploy/', 'db/'],
            allowedFlows: Array.isArray(j.allowedFlows) ? j.allowedFlows : [],
        };
    }
    catch (e) {
        logger.warn('n8n-flows.json not found; using defaults');
        return {
            allowedPrefixes: ['integration/'],
            deniedPrefixes: ['deploy/', 'db/'],
            allowedFlows: [],
        };
    }
}
/**
 * Check if an n8n flow trigger is permitted by static policy and OPA
 */
async function checkN8nTriggerAllowed(params) {
    const policy = loadPolicy();
    if (policy.deniedPrefixes.some((p) => params.flowKey.startsWith(p))) {
        return { allow: false, reason: 'denied by prefix policy' };
    }
    const prefixAllowed = policy.allowedPrefixes.some((p) => params.flowKey.startsWith(p));
    const explicitAllowed = policy.allowedFlows.includes(params.flowKey);
    if (!prefixAllowed && !explicitAllowed) {
        return { allow: false, reason: 'not in allowed prefixes or flows' };
    }
    // Consult OPA if configured
    try {
        const opaBase = process.env.OPA_BASE_URL || '';
        if (!opaBase)
            return {
                allow: prefixAllowed || explicitAllowed,
                reason: 'no opa configured',
            };
        const input = {
            input: {
                tenantId: params.tenantId || 'unknown',
                userId: params.userId,
                role: params.role || 'user',
                action: 'trigger',
                resource: params.flowKey,
                resourceAttributes: { flowKey: params.flowKey },
                timestamp: Date.now(),
            },
        };
        const resp = await axios_1.default.post(`${opaBase}/v1/data/maestro/integrations/n8n/trigger`, input, { timeout: 5000 });
        const result = resp.data?.result || {};
        return { allow: !!result.allow, reason: result.reason || 'opa' };
    }
    catch (e) {
        logger.warn({ err: e }, 'OPA evaluation failed; default deny');
        return { allow: false, reason: 'opa evaluation failed' };
    }
}
function listAllowedN8nFlows() {
    const policy = loadPolicy();
    return { flows: policy.allowedFlows, prefixes: policy.allowedPrefixes };
}
