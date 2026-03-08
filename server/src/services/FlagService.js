"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagService = exports.FlagService = void 0;
const index_js_1 = require("../audit/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class FlagService {
    static instance;
    cache = new Map();
    constructor() { }
    static getInstance() {
        if (!FlagService.instance) {
            FlagService.instance = new FlagService();
        }
        return FlagService.instance;
    }
    /**
     * Gets the current value of a feature flag/kill switch.
     * Priority:
     * 1. In-memory override (set via API)
     * 2. Environment variable (FLAG_NAME)
     * 3. Default false
     */
    getFlag(name) {
        const cached = this.cache.get(name);
        if (cached) {
            return cached.value;
        }
        // Fallback to env
        const envKey = `FLAG_${name.toUpperCase()}`;
        const envValue = process.env[envKey];
        if (envValue !== undefined) {
            if (envValue.toLowerCase() === 'true')
                return true;
            if (envValue.toLowerCase() === 'false')
                return false;
            const num = Number(envValue);
            if (!isNaN(num))
                return num;
            return envValue;
        }
        return false;
    }
    /**
     * Sets an in-memory override for a flag.
     * "Break glass" mechanism - takes effect immediately.
     */
    async setFlag(name, value, userId = 'system', tenantId = 'system') {
        this.cache.set(name, {
            value,
            updatedAt: Date.now()
        });
        logger_js_1.default.warn({ name, value, userId }, 'Flag override set (Kill Switch / Break Glass)');
        try {
            await index_js_1.advancedAuditSystem.recordEvent({
                eventType: 'system_modification',
                action: 'update_flag',
                outcome: 'success',
                userId: userId,
                tenantId: tenantId,
                serviceId: 'flag-service',
                resourceType: 'feature_flag',
                resourceId: name,
                message: `Flag ${name} set to ${value}`,
                level: 'warn',
                details: { name, value, timestamp: Date.now() },
                complianceRelevant: true,
                complianceFrameworks: ['SOC2'] // Operations change
            });
        }
        catch (err) {
            logger_js_1.default.error({ err }, 'Failed to emit audit event for flag update');
        }
    }
    /**
     * Clears an override, reverting to ENV or default.
     */
    async clearFlag(name, userId = 'system', tenantId = 'system') {
        this.cache.delete(name);
        logger_js_1.default.info({ name, userId }, 'Flag override cleared');
        try {
            await index_js_1.advancedAuditSystem.recordEvent({
                eventType: 'system_modification',
                action: 'clear_flag',
                outcome: 'success',
                userId: userId,
                tenantId: tenantId,
                serviceId: 'flag-service',
                resourceType: 'feature_flag',
                resourceId: name,
                message: `Flag ${name} override cleared`,
                level: 'info',
                details: { name, timestamp: Date.now() },
                complianceRelevant: true,
                complianceFrameworks: ['SOC2']
            });
        }
        catch (err) {
            logger_js_1.default.error({ err }, 'Failed to emit audit event for flag clear');
        }
    }
}
exports.FlagService = FlagService;
exports.flagService = FlagService.getInstance();
