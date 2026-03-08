"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryBudgetMiddleware = exports.queryBudgetGuard = exports.QueryBudgetGuard = void 0;
const config_js_1 = require("../config.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const logger_js_1 = require("../config/logger.js");
class QueryBudgetGuard {
    buckets = new Map();
    maxTokens;
    refillRate; // tokens per second
    enabled;
    mode;
    constructor() {
        this.maxTokens = config_js_1.cfg.QUERY_BUDGET_TOKENS;
        this.refillRate = config_js_1.cfg.QUERY_BUDGET_REFILL_RATE;
        this.enabled = config_js_1.cfg.QUERY_BUDGET_ENABLED;
        this.mode = config_js_1.cfg.QUERY_BUDGET_MODE;
    }
    // For testing
    reset() {
        this.buckets.clear();
    }
    getBucket(tenantId) {
        if (!this.buckets.has(tenantId)) {
            this.buckets.set(tenantId, {
                tokens: this.maxTokens,
                lastRefill: Date.now(),
            });
        }
        return this.buckets.get(tenantId);
    }
    refill(bucket) {
        const now = Date.now();
        const elapsedSeconds = (now - bucket.lastRefill) / 1000;
        if (elapsedSeconds > 0) {
            const addedTokens = elapsedSeconds * this.refillRate;
            bucket.tokens = Math.min(this.maxTokens, bucket.tokens + addedTokens);
            bucket.lastRefill = now;
        }
    }
    checkBudget(tenantId, cost = 1) {
        if (!this.enabled)
            return true;
        const bucket = this.getBucket(tenantId);
        this.refill(bucket);
        if (bucket.tokens >= cost) {
            return true;
        }
        return false;
    }
    consumeBudget(tenantId, cost = 1) {
        if (!this.enabled)
            return;
        const bucket = this.getBucket(tenantId);
        // Refill logic is handled in checkBudget, but we should ensure we are up to date
        // if consume is called without check (though typical usage is check then consume)
        this.refill(bucket);
        bucket.tokens = Math.max(0, bucket.tokens - cost);
        // Update metric
        metrics_js_1.queryBudgetRemaining.set({ tenant: tenantId }, bucket.tokens);
    }
    middleware() {
        return (req, res, next) => {
            if (!this.enabled)
                return next();
            const start = process.hrtime();
            // Tenant ID resolution strategy matching app.ts/tenantContext
            const tenantId = req.user?.tenant_id ||
                req.headers['x-tenant-id'] ||
                'anonymous';
            if (tenantId === 'anonymous') {
                // Optionally skip or enforce strict limits for anonymous
                // For now, let's just proceed to avoid breaking unauth flows if not intended
                return next();
            }
            const allowed = this.checkBudget(tenantId, 1);
            if (!allowed) {
                metrics_js_1.queryBudgetBlockedTotal.inc({ tenant: tenantId });
                if (this.mode === 'block') {
                    const end = process.hrtime(start);
                    metrics_js_1.queryBudgetLatencySeconds.observe(end[0] + end[1] / 1e9);
                    logger_js_1.logger.warn({ tenantId }, 'Query budget exceeded, blocking request');
                    return res.status(429).json({
                        error: 'Query budget exceeded',
                        retryAfter: 1
                    });
                }
                else {
                    logger_js_1.logger.warn({ tenantId }, 'Query budget exceeded (warn-only)');
                }
            }
            else {
                this.consumeBudget(tenantId, 1);
            }
            const end = process.hrtime(start);
            metrics_js_1.queryBudgetLatencySeconds.observe(end[0] + end[1] / 1e9);
            next();
        };
    }
}
exports.QueryBudgetGuard = QueryBudgetGuard;
exports.queryBudgetGuard = new QueryBudgetGuard();
exports.queryBudgetMiddleware = exports.queryBudgetGuard.middleware();
