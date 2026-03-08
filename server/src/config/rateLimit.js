"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRateLimitConfig = loadRateLimitConfig;
exports.getRateLimitConfig = getRateLimitConfig;
exports.setRateLimitConfig = setRateLimitConfig;
exports.resetRateLimitConfig = resetRateLimitConfig;
function parseBool(value, fallback) {
    if (value === undefined)
        return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1')
        return true;
    if (normalized === 'false' || normalized === '0')
        return false;
    return fallback;
}
function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function loadRateLimitConfig(env = process.env) {
    const enabled = parseBool(env.RATE_LIMIT_ENABLED, false);
    const store = env.RATE_LIMIT_STORE === 'redis' ? 'redis' : 'memory';
    const defaultWindowMs = parseNumber(env.RATE_LIMIT_DEFAULT_WINDOW_MS, 60_000);
    const defaultLimit = parseNumber(env.RATE_LIMIT_DEFAULT_LIMIT, 100);
    const webhookWindowMs = parseNumber(env.RATE_LIMIT_WEBHOOK_WINDOW_MS, defaultWindowMs);
    const webhookLimit = parseNumber(env.RATE_LIMIT_WEBHOOK_LIMIT, 30);
    const governanceWindowMs = parseNumber(env.RATE_LIMIT_GOVERNANCE_WINDOW_MS, defaultWindowMs);
    const governanceLimit = parseNumber(env.RATE_LIMIT_GOVERNANCE_LIMIT, 30);
    const caseWorkflowWindowMs = parseNumber(env.RATE_LIMIT_CASE_WORKFLOW_WINDOW_MS, defaultWindowMs);
    const caseWorkflowLimit = parseNumber(env.RATE_LIMIT_CASE_WORKFLOW_LIMIT, 60);
    return {
        enabled,
        store,
        groups: {
            default: { limit: defaultLimit, windowMs: defaultWindowMs },
            webhookIngest: { limit: webhookLimit, windowMs: webhookWindowMs },
            governance: { limit: governanceLimit, windowMs: governanceWindowMs },
            caseWorkflow: { limit: caseWorkflowLimit, windowMs: caseWorkflowWindowMs },
        },
    };
}
let currentConfig = loadRateLimitConfig();
function getRateLimitConfig() {
    return currentConfig;
}
function setRateLimitConfig(config) {
    currentConfig = config;
}
function resetRateLimitConfig(env = process.env) {
    currentConfig = loadRateLimitConfig(env);
    return currentConfig;
}
