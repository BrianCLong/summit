"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
const crypto_1 = require("crypto");
class FeatureFlagService {
    environment;
    flags;
    constructor(config = {}, environment) {
        this.environment = environment || process.env.APP_ENV || process.env.NODE_ENV || 'development';
        this.flags = config.flags || {};
    }
    isEnabled(flag, context) {
        const definition = this.flags[flag];
        if (!definition)
            return false;
        const envOverride = definition.environments?.[this.environment];
        const enabled = envOverride !== undefined ? envOverride : definition.enabled;
        if (!enabled)
            return false;
        if (definition.rolloutPercentage && definition.rolloutPercentage < 100) {
            const key = context?.userId || context?.tenantId || 'anonymous';
            const hash = (0, crypto_1.createHash)('sha256').update(`${flag}:${key}:${definition.salt || 'feature-flag'}`).digest('hex');
            const bucket = parseInt(hash.slice(0, 8), 16) % 100;
            return bucket < definition.rolloutPercentage;
        }
        return true;
    }
    all() {
        return this.flags;
    }
}
exports.FeatureFlagService = FeatureFlagService;
