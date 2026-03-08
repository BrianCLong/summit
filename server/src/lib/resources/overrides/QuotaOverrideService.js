"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaOverrideService = exports.QuotaOverrideService = void 0;
const database_js_1 = require("../../../config/database.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'QuotaOverrideService' });
class QuotaOverrideService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!QuotaOverrideService.instance) {
            QuotaOverrideService.instance = new QuotaOverrideService();
        }
        return QuotaOverrideService.instance;
    }
    /**
     * Set a temporary override for a tenant's quota.
     * @param tenantId The tenant ID.
     * @param meter The meter to override (e.g. 'requests_day', 'api_rpm').
     * @param ttlSeconds How long the override should last.
     * @param reason Why the override was granted.
     */
    async setOverride(tenantId, meter, ttlSeconds, reason) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            throw new Error('Redis unavailable');
        const key = `tenant:${tenantId}:override:${meter}`;
        await redis.set(key, 'true', 'EX', ttlSeconds);
        logger.info({ tenantId, meter, ttlSeconds, reason }, 'Quota override set');
    }
    /**
     * Check if a valid override exists for a tenant's meter.
     */
    async hasOverride(tenantId, meter) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return false;
        const key = `tenant:${tenantId}:override:${meter}`;
        const exists = await redis.exists(key);
        return exists === 1;
    }
    /**
     * Remove an override manually.
     */
    async removeOverride(tenantId, meter) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis)
            return;
        const key = `tenant:${tenantId}:override:${meter}`;
        await redis.del(key);
        logger.info({ tenantId, meter }, 'Quota override removed');
    }
}
exports.QuotaOverrideService = QuotaOverrideService;
exports.quotaOverrideService = QuotaOverrideService.getInstance();
