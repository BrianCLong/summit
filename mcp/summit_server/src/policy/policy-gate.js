"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePolicy = void 0;
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
const policyPath = path_1.default.join(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), 'policies.json');
const policies = JSON.parse((0, fs_1.readFileSync)(policyPath, 'utf-8'));
const toTimestamp = (value) => {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
};
const now = () => Date.now();
const isBreakGlassValid = (context) => {
    if (!context.breakGlass) {
        return false;
    }
    if (!context.scopes.includes(policies.breakGlass.scope)) {
        return false;
    }
    const expiresAt = toTimestamp(context.breakGlass.expiresAt);
    if (expiresAt <= now()) {
        return false;
    }
    const maxDurationMs = policies.breakGlass.maxDurationMinutes * 60 * 1000;
    return expiresAt - now() <= maxDurationMs;
};
const collectRequiredScopes = (tool, riskTier) => {
    const ruleScopes = policies.rules.find((rule) => rule.riskTier === riskTier)
        ?.requiredScopes;
    return Array.from(new Set([...(ruleScopes ?? []), ...tool.requiredScopes]));
};
const evaluatePolicy = (tool, context) => {
    const requiredScopes = collectRequiredScopes(tool, tool.riskTier);
    const breakGlassAllowed = isBreakGlassValid(context);
    if (breakGlassAllowed) {
        return {
            decision: 'allow',
            reason: `Break-glass approved: ${context.breakGlass?.reason ?? 'unspecified'}`,
            toolId: tool.id,
            riskTier: tool.riskTier,
            scopesRequired: requiredScopes,
            scopesGranted: context.scopes,
            breakGlassUsed: true,
        };
    }
    const hasScopes = requiredScopes.every((scope) => context.scopes.includes(scope));
    if (!hasScopes) {
        return {
            decision: 'deny',
            reason: `Missing required scopes: ${requiredScopes.filter((scope) => !context.scopes.includes(scope)).join(', ')}`,
            toolId: tool.id,
            riskTier: tool.riskTier,
            scopesRequired: requiredScopes,
            scopesGranted: context.scopes,
            breakGlassUsed: false,
        };
    }
    return {
        decision: 'allow',
        reason: 'Policy allowlist satisfied',
        toolId: tool.id,
        riskTier: tool.riskTier,
        scopesRequired: requiredScopes,
        scopesGranted: context.scopes,
        breakGlassUsed: false,
    };
};
exports.evaluatePolicy = evaluatePolicy;
