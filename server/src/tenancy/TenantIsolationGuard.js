"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantIsolationGuard = exports.TenantIsolationGuard = void 0;
const pino_1 = __importDefault(require("pino"));
const RateLimiter_js_1 = require("../services/RateLimiter.js");
const killSwitch_js_1 = require("./killSwitch.js");
const tenant_limit_enforcer_js_1 = require("../lib/resources/tenant-limit-enforcer.js");
const logger = pino_1.default({ name: 'tenant-isolation-guard' });
const DEFAULT_CONFIG = {
    defaultWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    rateLimits: {
        api: 120,
        ingestion: 45,
        rag: 60,
        llm: Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 50),
    },
    llmSoftCeiling: Math.max(10, Math.floor(Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 50) / 2)),
};
class TenantIsolationGuard {
    limiter;
    killSwitch;
    config;
    constructor(limiter = RateLimiter_js_1.rateLimiter, killSwitch = killSwitch_js_1.tenantKillSwitch, config = DEFAULT_CONFIG) {
        this.limiter = limiter;
        this.killSwitch = killSwitch;
        this.config = config;
    }
    assertTenantContext(context) {
        if (!context?.tenantId) {
            throw new Error('Tenant context missing tenantId');
        }
        if (!context.environment) {
            throw new Error('Tenant context missing environment');
        }
        if (!context.privilegeTier) {
            throw new Error('Tenant context missing privilegeTier');
        }
    }
    evaluatePolicy(context, input) {
        this.assertTenantContext(context);
        if (context.environment === 'prod' && !this.killSwitch.hasConfig()) {
            return {
                allowed: false,
                status: 500,
                reason: 'Kill-switch configuration missing',
            };
        }
        if (this.killSwitch.isDisabled(context.tenantId)) {
            return {
                allowed: false,
                status: 423,
                reason: 'Tenant kill switch active',
            };
        }
        if (input.resourceTenantId &&
            input.resourceTenantId !== context.tenantId) {
            return {
                allowed: false,
                status: 403,
                reason: 'Cross-tenant access denied',
            };
        }
        if (input.environment && input.environment !== context.environment) {
            return {
                allowed: false,
                status: 400,
                reason: 'Tenant environment mismatch',
            };
        }
        return { allowed: true };
    }
    async enforceRateLimit(context, bucket) {
        this.assertTenantContext(context);
        const limit = this.config.rateLimits[bucket] ?? this.config.rateLimits.api;
        const key = `tenant:${context.tenantId}:${bucket}:${context.environment}:${context.privilegeTier}`;
        const result = await this.limiter.checkLimit(key, limit, this.config.defaultWindowMs);
        if (!result.allowed) {
            logger.warn({
                tenantId: context.tenantId,
                bucket,
                environment: context.environment,
                privilegeTier: context.privilegeTier,
            }, 'Tenant rate limit exceeded');
        }
        return { ...result, bucket };
    }
    async enforceIngestionCap(context) {
        const rateResult = await this.enforceRateLimit(context, 'ingestion');
        return {
            allowed: rateResult.allowed,
            status: rateResult.allowed ? 200 : 429,
            reason: rateResult.allowed ? undefined : 'Tenant ingestion cap reached',
            warning: rateResult.remaining < 5
                ? 'Approaching ingestion cap'
                : undefined,
            limit: rateResult.total,
            reset: rateResult.reset,
        };
    }
    async enforceStorageQuota(context, estimatedBytes) {
        this.assertTenantContext(context);
        const result = await tenant_limit_enforcer_js_1.tenantLimitEnforcer.enforceStorageBudget(context.tenantId, estimatedBytes, 'ingestion');
        return {
            allowed: result.allowed,
            status: result.allowed ? 200 : 403,
            reason: result.allowed ? undefined : 'Tenant storage quota exceeded',
            projected: result.projected,
            limit: result.limit,
        };
    }
    async enforceLlmCeiling(context) {
        const rateResult = await this.enforceRateLimit(context, 'llm');
        const softBlocked = !rateResult.allowed;
        const warning = rateResult.remaining <= this.config.llmSoftCeiling
            ? 'LLM budget nearly exhausted'
            : undefined;
        return {
            allowed: !softBlocked,
            status: softBlocked ? 429 : 200,
            reason: softBlocked ? 'LLM ceiling reached' : undefined,
            warning,
            limit: rateResult.total,
            reset: rateResult.reset,
        };
    }
    isPrivileged(context) {
        return (context.privilegeTier === 'break-glass' ||
            context.privilegeTier === 'elevated');
    }
    hardenPrivilege(context) {
        const downgrade = {
            'break-glass': 'elevated',
            elevated: 'elevated',
            standard: 'standard',
        };
        return {
            ...context,
            privilegeTier: downgrade[context.privilegeTier],
        };
    }
}
exports.TenantIsolationGuard = TenantIsolationGuard;
exports.tenantIsolationGuard = new TenantIsolationGuard();
