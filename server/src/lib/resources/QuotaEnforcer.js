"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaEnforcer = exports.QuotaEnforcer = void 0;
// @ts-nocheck
const RateLimiter_js_1 = require("../../services/RateLimiter.js");
const QuotaConfig_js_1 = require("./QuotaConfig.js");
const metrics_js_1 = require("../../utils/metrics.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'QuotaEnforcer' });
class QuotaEnforcer {
    static instance;
    metrics;
    constructor() {
        this.metrics = new metrics_js_1.PrometheusMetrics('quota_enforcer');
        this.metrics.createCounter('quota_rejections_total', 'Total quota rejections', [
            'tenant_id',
            'reason',
        ]);
        this.metrics.createCounter('feature_access_denied_total', 'Total feature access denials', ['tenant_id', 'feature']);
    }
    static getInstance() {
        if (!QuotaEnforcer.instance) {
            QuotaEnforcer.instance = new QuotaEnforcer();
        }
        return QuotaEnforcer.instance;
    }
    getLimits(tenantId) {
        const plan = QuotaConfig_js_1.quotaConfigService.getTenantPlan(tenantId);
        const baseLimits = QuotaConfig_js_1.DEFAULT_PLANS[plan];
        const overrides = QuotaConfig_js_1.quotaConfigService.getTenantOverrides(tenantId);
        return {
            ...baseLimits,
            ...overrides,
        };
    }
    /**
     * Check if a tenant is allowed to use a specific feature (e.g. 'write_aware_sharding')
     */
    isFeatureAllowed(tenantId, feature) {
        const allowedTenants = QuotaConfig_js_1.quotaConfigService.getFeatureAllowlist(feature);
        const allowed = allowedTenants.includes(tenantId);
        if (!allowed) {
            this.metrics.incrementCounter('feature_access_denied_total', {
                tenant_id: tenantId,
                feature,
            });
        }
        return allowed;
    }
    /**
     * Enforce API Requests Per Minute (RPM) quota.
     */
    async checkApiQuota(tenantId) {
        const limits = this.getLimits(tenantId);
        const result = await RateLimiter_js_1.rateLimiter.checkLimit(`quota:${tenantId}:api_rpm`, limits.api_rpm, 60 * 1000);
        if (!result.allowed) {
            this.metrics.incrementCounter('quota_rejections_total', {
                tenant_id: tenantId,
                reason: 'api_rpm',
            });
        }
        return {
            allowed: result.allowed,
            limit: result.total,
            remaining: result.remaining,
            reset: result.reset,
            reason: result.allowed ? undefined : 'API_RPM_EXCEEDED',
        };
    }
    /**
     * Enforce Ingest Events Per Second (EPS) quota.
     * @param count Number of events in this batch
     */
    async checkIngestQuota(tenantId, count = 1) {
        const limits = this.getLimits(tenantId);
        // EPS check: window 1 second
        const result = await RateLimiter_js_1.rateLimiter.checkLimit(`quota:${tenantId}:ingest_eps`, limits.ingest_eps, 1000, count);
        if (!result.allowed) {
            this.metrics.incrementCounter('quota_rejections_total', {
                tenant_id: tenantId,
                reason: 'ingest_eps',
            });
        }
        return {
            allowed: result.allowed,
            limit: result.total,
            remaining: result.remaining,
            reset: result.reset,
            reason: result.allowed ? undefined : 'INGEST_EPS_EXCEEDED',
        };
    }
    /**
     * Enforce Egress Volume (GB/Day) quota.
     * @param bytes Number of bytes to check/consume
     */
    async checkEgressQuota(tenantId, bytes) {
        const limits = this.getLimits(tenantId);
        const limitBytes = limits.egress_gb_day * 1024 * 1024 * 1024;
        const windowMs = 24 * 60 * 60 * 1000; // 1 day
        const result = await RateLimiter_js_1.rateLimiter.checkLimit(`quota:${tenantId}:egress_day`, limitBytes, windowMs, bytes);
        if (!result.allowed) {
            this.metrics.incrementCounter('quota_rejections_total', {
                tenant_id: tenantId,
                reason: 'egress_day',
            });
        }
        return {
            allowed: result.allowed,
            limit: result.total,
            remaining: result.remaining,
            reset: result.reset,
            reason: result.allowed ? undefined : 'EGRESS_LIMIT_EXCEEDED',
        };
    }
}
exports.QuotaEnforcer = QuotaEnforcer;
exports.quotaEnforcer = QuotaEnforcer.getInstance();
