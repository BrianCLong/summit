"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouter = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ModelRouter {
    killSwitch = false;
    featureKill = new Set();
    policies = new Map();
    constructor(policies = []) {
        policies.forEach((policy) => this.policies.set(policy.feature, policy));
    }
    setKillSwitch(enabled, feature) {
        if (feature) {
            if (enabled) {
                this.featureKill.add(feature);
            }
            else {
                this.featureKill.delete(feature);
            }
            return;
        }
        this.killSwitch = enabled;
    }
    resolve(feature, tenantId) {
        if (this.killSwitch || this.featureKill.has(feature)) {
            return { disabled: true, code: 'AI_DISABLED' };
        }
        const policy = this.policies.get(feature);
        if (!policy) {
            return { disabled: true, code: 'NO_MODEL_AVAILABLE' };
        }
        const inCanary = this.isTenantInCanary(tenantId, policy.canaryPercent ?? 0);
        const model = inCanary && policy.fallbacks?.length ? policy.fallbacks[0] : policy.defaultModel;
        return {
            model,
            usedFallback: inCanary && !!policy.fallbacks?.length,
            disabled: false,
        };
    }
    isTenantInCanary(tenantId, percent) {
        if (percent <= 0)
            return false;
        if (percent >= 100)
            return true;
        const hash = crypto_1.default.createHash('sha256').update(tenantId).digest('hex');
        const bucket = parseInt(hash.slice(0, 8), 16) % 100;
        return bucket < percent;
    }
}
exports.ModelRouter = ModelRouter;
