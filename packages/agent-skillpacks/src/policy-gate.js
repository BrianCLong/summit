"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateToolAccess = exports.mergePolicies = void 0;
const minimatch_1 = require("minimatch");
const matchPattern = (toolName, patterns = []) => patterns.some((pattern) => (0, minimatch_1.minimatch)(toolName, pattern, { matchBase: true }));
const isWaiverActive = (waiver, now) => {
    const expiry = new Date(waiver.expiresAt).getTime();
    return Number.isFinite(expiry) && expiry > now.getTime();
};
const mergePolicies = (base, override) => {
    if (!override) {
        return base;
    }
    return {
        defaultBehavior: override.defaultBehavior ?? base.defaultBehavior,
        allow: [...(base.allow ?? []), ...(override.allow ?? [])],
        deny: [...(base.deny ?? []), ...(override.deny ?? [])],
        environments: {
            ...(base.environments ?? {}),
            ...(override.environments ?? {}),
        },
        breakGlass: override.breakGlass ?? base.breakGlass,
    };
};
exports.mergePolicies = mergePolicies;
const evaluateToolAccess = (options) => {
    const now = options.now ?? new Date();
    const envPolicy = options.policy.environments?.[options.environment] ?? {};
    const combinedAllow = [...(options.policy.allow ?? []), ...(envPolicy.allow ?? [])];
    const combinedDeny = [...(options.policy.deny ?? []), ...(envPolicy.deny ?? [])];
    const deniedByPattern = matchPattern(options.toolName, combinedDeny);
    const allowedByPattern = matchPattern(options.toolName, combinedAllow);
    if (deniedByPattern && allowedByPattern) {
        return {
            toolName: options.toolName,
            allowed: false,
            reason: 'Conflicting policy match; deny takes precedence.',
        };
    }
    if (options.environment === 'ci' && !allowedByPattern) {
        const waiver = options.policy.breakGlass?.waivers?.find((entry) => matchPattern(options.toolName, [entry.toolPattern]));
        if (waiver && isWaiverActive(waiver, now)) {
            return {
                toolName: options.toolName,
                allowed: true,
                reason: 'Break-glass waiver active for CI.',
                waiverId: waiver.id,
            };
        }
        return {
            toolName: options.toolName,
            allowed: false,
            reason: 'CI default deny: tool not allowlisted.',
        };
    }
    if (deniedByPattern) {
        return {
            toolName: options.toolName,
            allowed: false,
            reason: 'Explicitly denied by policy.',
        };
    }
    if (allowedByPattern) {
        return {
            toolName: options.toolName,
            allowed: true,
            reason: 'Explicitly allowlisted by policy.',
        };
    }
    const defaultBehavior = options.policy.defaultBehavior ?? 'deny';
    const allowed = defaultBehavior === 'allow';
    return {
        toolName: options.toolName,
        allowed,
        reason: `Default behavior: ${defaultBehavior}.`,
    };
};
exports.evaluateToolAccess = evaluateToolAccess;
