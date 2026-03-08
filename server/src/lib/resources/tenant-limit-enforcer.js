"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantLimitEnforcer = exports.TenantLimitEnforcer = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const quota_manager_js_1 = __importDefault(require("./quota-manager.js"));
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
class TenantLimitEnforcer {
    /**
     * Track active seats for a tenant and enforce the seat cap derived from quota tier.
     * Uses Redis sets keyed by day to avoid unbounded growth; falls back to allow when Redis is unavailable.
     */
    async enforceSeatCap(context, actorId) {
        const quota = quota_manager_js_1.default.getQuotaForTenant(context.tenantId);
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            logger_js_1.default.warn({ tenantId: context.tenantId }, 'Redis unavailable for seat cap enforcement; allowing request');
            return { allowed: true, remaining: quota.seatCap, limit: quota.seatCap };
        }
        const dayKey = new Date().toISOString().slice(0, 10);
        const key = `tenant:seats:${context.tenantId}:${dayKey}`;
        const actorKey = actorId || context.subject || 'anonymous';
        await redis.sadd(key, actorKey);
        await redis.pexpire(key, ONE_DAY_MS);
        const seatCount = await redis.scard(key);
        const allowed = seatCount <= quota.seatCap;
        const remaining = Math.max(quota.seatCap - seatCount, 0);
        if (!allowed) {
            await this.recordLimitEvent(context, 'TENANT_SEAT_CAP_EXCEEDED', {
                seatCount,
                seatCap: quota.seatCap,
                actorKey,
            });
        }
        return { allowed, remaining, limit: quota.seatCap };
    }
    /**
     * Enforce a soft storage budget counter using Redis. Designed for services that only
     * have an estimated byte size (e.g., ingestion). Returns the new projected total.
     */
    async enforceStorageBudget(tenantId, estimatedBytes, resource) {
        const quota = quota_manager_js_1.default.getQuotaForTenant(tenantId);
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            logger_js_1.default.warn({ tenantId, resource }, 'Redis unavailable for storage budget enforcement; allowing request');
            return {
                allowed: true,
                projected: estimatedBytes,
                limit: quota.storageLimitBytes,
            };
        }
        const key = `tenant:storage:${tenantId}:${new Date().toISOString().slice(0, 10)}`;
        const projected = await redis.incrby(key, estimatedBytes);
        await redis.pexpire(key, ONE_DAY_MS);
        const allowed = projected <= quota.storageLimitBytes;
        if (!allowed) {
            await this.recordLimitEvent({ tenantId, environment: 'prod', privilegeTier: 'standard' }, 'TENANT_STORAGE_BUDGET_EXCEEDED', { projected, limit: quota.storageLimitBytes, resource });
        }
        return { allowed, projected, limit: quota.storageLimitBytes };
    }
    async recordLimitEvent(context, action, payload) {
        try {
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: context.tenantId,
                actionType: action,
                resourceType: 'tenant',
                resourceId: context.tenantId,
                actorId: context.userId || 'system',
                actorType: 'system',
                payload: {
                    ...payload,
                    hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(payload)).digest('hex'),
                },
                metadata: {
                    environment: context.environment,
                    privilegeTier: context.privilegeTier,
                },
            });
        }
        catch (error) {
            logger_js_1.default.warn({ tenantId: context.tenantId, action, error }, 'Failed to append provenance entry for limit event');
        }
    }
}
exports.TenantLimitEnforcer = TenantLimitEnforcer;
exports.tenantLimitEnforcer = new TenantLimitEnforcer();
