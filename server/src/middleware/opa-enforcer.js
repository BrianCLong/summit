"use strict";
/**
 * OPA Policy Enforcement Middleware
 * Integrates with llm-preflight.ts to enforce budget + four-eyes policies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaMiddleware = exports.OPAEnforcer = void 0;
exports.getOPAEnforcer = getOPAEnforcer;
exports.createOPAMiddleware = createOPAMiddleware;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const budgetLedger_js_1 = require("../db/budgetLedger.js");
/**
 * OPA Policy Enforcer
 */
class OPAEnforcer {
    options;
    budgetLedger = (0, budgetLedger_js_1.getBudgetLedgerManager)();
    decisionCache = new Map();
    cacheHits = 0;
    cacheMisses = 0;
    constructor(options = {}) {
        this.options = {
            opaUrl: options.opaUrl || process.env.OPA_URL || 'http://localhost:8181',
            enabled: options.enabled ?? process.env.OPA_ENFORCEMENT === 'true',
            timeoutMs: options.timeoutMs || 5000,
            retries: options.retries || 2,
            cacheDecisions: options.cacheDecisions ?? true,
            cacheTtlMs: options.cacheTtlMs || 60000, // 1 minute
        };
    }
    /**
     * Evaluate policy decision
     */
    async evaluatePolicy(input) {
        if (!this.options.enabled) {
            // When OPA is disabled, apply basic budget checks only
            return this.fallbackDecision(input);
        }
        const cacheKey = this.generateCacheKey(input);
        // Check cache first
        if (this.options.cacheDecisions) {
            const cached = this.decisionCache.get(cacheKey);
            if (cached && Date.now() < cached.expiresAt) {
                this.recordCacheHit(input);
                return cached.decision;
            }
            this.recordCacheMiss(input, cached ? 'expired' : 'miss');
        }
        try {
            const data = await this.buildOPAData(input);
            const decision = await this.queryOPA(input, data);
            // Cache successful decisions
            if (this.options.cacheDecisions) {
                this.decisionCache.set(cacheKey, {
                    decision,
                    expiresAt: Date.now() + this.options.cacheTtlMs,
                });
            }
            // Log decision for audit
            logger_js_1.default.info('OPA policy decision', {
                tenantId: input.tenant_id,
                userId: input.user_id,
                requestId: input.request_id,
                allow: decision.allow,
                estimatedUsd: decision.estimated_usd,
                monthlyRoom: decision.monthly_room,
                requiresFourEyes: decision.requires_four_eyes,
                validApprovers: decision.valid_approvers,
                riskLevel: decision.risk_level,
                violations: decision.violation_reasons,
            });
            return decision;
        }
        catch (error) {
            logger_js_1.default.error('OPA policy evaluation failed', {
                error: error instanceof Error ? error.message : String(error),
                tenantId: input.tenant_id,
                requestId: input.request_id,
            });
            // Fail-safe: use fallback decision
            return this.fallbackDecision(input);
        }
    }
    /**
     * Generate cache key for decisions
     */
    generateCacheKey(input) {
        const keyComponents = [
            input.tenant_id,
            input.user_id,
            input.mutation,
            input.est_usd.toFixed(4),
            input.risk_tag || 'none',
            input.approvers?.map((a) => `${a.user_id}:${a.approved_at}`).join(',') ||
                'none',
            Math.floor(Date.now() / 60000), // Round to minute for cache stability
        ];
        return keyComponents.join('|');
    }
    /**
     * Build OPA data context
     */
    async buildOPAData(input) {
        const [tenantBudget, spendingSummary] = await Promise.all([
            this.budgetLedger.getTenantBudget(input.tenant_id),
            this.budgetLedger.getSpendingSummary(input.tenant_id),
        ]);
        return {
            tenant_budgets: tenantBudget
                ? {
                    [input.tenant_id]: {
                        monthly_usd_limit: tenantBudget.monthlyUsdLimit,
                        daily_usd_limit: tenantBudget.dailyUsdLimit,
                        hard_cap: tenantBudget.hardCap,
                        notification_threshold: tenantBudget.notificationThreshold,
                    },
                }
                : {},
            spending_ledger: {
                [input.tenant_id]: await this.getRecentSpendingEntries(input.tenant_id),
            },
            global_config: {
                four_eyes_threshold_usd: parseFloat(process.env.FOUR_EYES_THRESHOLD_USD || '5.0'),
                four_eyes_threshold_tokens: parseInt(process.env.FOUR_EYES_THRESHOLD_TOKENS || '50000'),
                emergency_multiplier: parseFloat(process.env.EMERGENCY_BUDGET_MULTIPLIER || '1.2'),
            },
            sensitive_tenants: (process.env.SENSITIVE_TENANTS || '')
                .split(',')
                .filter(Boolean),
            tenant_overrides: await this.getTenantOverrides(),
        };
    }
    /**
     * Get recent spending entries for OPA context
     */
    async getRecentSpendingEntries(tenantId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const entries = await this.budgetLedger.getSpendingEntries({
            tenantId,
            startDate: thirtyDaysAgo,
        }, 1000); // Last 1000 entries or 30 days
        return entries.map((entry) => ({
            created_at: entry.createdAt.toISOString(),
            total_usd: entry.actualTotalUsd || entry.estTotalUsd,
            status: entry.status,
        }));
    }
    /**
     * Get tenant overrides (from database or cache)
     */
    async getTenantOverrides() {
        // In production, this would query a database table
        // For now, return empty overrides
        return {};
    }
    /**
     * Query OPA server
     */
    async queryOPA(input, data) {
        const url = `${this.options.opaUrl}/v1/data/intelgraph/budget/decision`;
        const payload = {
            input,
            data,
        };
        let lastError = null;
        for (let attempt = 1; attempt <= this.options.retries; attempt++) {
            try {
                const response = await axios_1.default.post(url, payload, {
                    timeout: this.options.timeoutMs,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.data?.result) {
                    throw new Error('Invalid OPA response structure');
                }
                return response.data.result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.options.retries) {
                    const delay = Math.min(1000 * attempt, 3000); // Exponential backoff, max 3s
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    logger_js_1.default.warn(`OPA query attempt ${attempt} failed, retrying`, {
                        error: lastError.message,
                        tenantId: input.tenant_id,
                        requestId: input.request_id,
                        nextAttempt: attempt + 1,
                    });
                }
            }
        }
        throw lastError || new Error('OPA query failed after retries');
    }
    /**
     * Fallback decision when OPA is unavailable
     */
    async fallbackDecision(input) {
        logger_js_1.default.warn('Using fallback budget decision', {
            tenantId: input.tenant_id,
            requestId: input.request_id,
            reason: this.options.enabled ? 'OPA unavailable' : 'OPA disabled',
        });
        // Simple budget check using database directly
        const budgetCheck = await this.budgetLedger.checkTenantBudget(input.tenant_id, input.est_usd);
        const requiresFourEyes = input.est_usd > 5.0 ||
            ['destructive', 'bulk_delete'].includes(input.risk_tag || '');
        const allow = budgetCheck.canAfford &&
            (!requiresFourEyes || (input.approvers?.length || 0) >= 2);
        return {
            allow,
            tenant_id: input.tenant_id,
            estimated_usd: input.est_usd,
            monthly_room: budgetCheck.budgetLimit - budgetCheck.currentSpend,
            daily_room: budgetCheck.budgetLimit / 30, // Rough daily estimate
            requires_four_eyes: requiresFourEyes,
            valid_approvers: input.approvers?.length || 0,
            risk_level: input.est_usd > 10 ? 'high' : input.est_usd > 1 ? 'medium' : 'low',
            violation_reasons: allow ? [] : [budgetCheck.reason],
            policy_version: 'fallback-1.0',
            evaluated_at: Date.now(),
        };
    }
    /**
     * Express middleware for OPA enforcement
     */
    createMiddleware() {
        return async (req, res, next) => {
            // Skip non-mutation requests
            if (req.method !== 'POST' || !req.body?.query?.includes('mutation')) {
                return next();
            }
            try {
                const input = {
                    tenant_id: req.get('x-tenant-id') || req.user?.tenantId || 'default',
                    user_id: req.user?.id || req.get('x-user-id') || 'anonymous',
                    mutation: req.body.operationName || 'unnamed',
                    field_name: this.extractMutationField(req.body.query, req.body.operationName),
                    est_usd: parseFloat(req.get('x-estimated-usd') || '0'),
                    est_total_tokens: parseInt(req.get('x-estimated-tokens') || '0'),
                    risk_tag: req.get('x-risk-tag'),
                    mutation_category: req.get('x-mutation-category'),
                    approvers: this.parseApprovers(req.get('x-approvers')),
                    request_id: req.get('x-request-id') || `req-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                };
                const decision = await this.evaluatePolicy(input);
                if (!decision.allow) {
                    res.status(403).json({
                        error: 'Policy violation: Operation not permitted',
                        code: 'POLICY_VIOLATION',
                        decision: {
                            allow: decision.allow,
                            requires_four_eyes: decision.requires_four_eyes,
                            valid_approvers: decision.valid_approvers,
                            risk_level: decision.risk_level,
                            violation_reasons: decision.violation_reasons,
                        },
                        tenant_id: input.tenant_id,
                        request_id: input.request_id,
                    });
                    return;
                }
                // Attach decision to request for downstream use
                req.opaDecision = decision;
                next();
            }
            catch (error) {
                logger_js_1.default.error('OPA middleware error', {
                    error: error instanceof Error ? error.message : String(error),
                    url: req.originalUrl,
                });
                // Fail open in case of errors
                next();
            }
        };
    }
    /**
     * Extract mutation field name from GraphQL query
     */
    extractMutationField(query, operationName) {
        const mutationMatch = query.match(/mutation\s+\w*\s*{[^{]*(\w+)\s*\(/);
        const fieldName = mutationMatch?.[1];
        return fieldName && fieldName.length > 2 ? fieldName : operationName;
    }
    /**
     * Parse approvers from header
     */
    parseApprovers(approversHeader) {
        if (!approversHeader)
            return undefined;
        try {
            return JSON.parse(decodeURIComponent(approversHeader));
        }
        catch (error) {
            logger_js_1.default.warn('Failed to parse approvers header', {
                header: approversHeader,
                error,
            });
            return undefined;
        }
    }
    /**
     * Clean up cache periodically
     */
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.decisionCache.entries()) {
                if (now >= cached.expiresAt) {
                    this.decisionCache.delete(key);
                }
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    calculateCacheHitRate() {
        const total = this.cacheHits + this.cacheMisses;
        if (total === 0)
            return 0;
        return this.cacheHits / total;
    }
    recordCacheHit(input) {
        this.cacheHits += 1;
        logger_js_1.default.debug('OPA decision cache hit', {
            tenantId: input.tenant_id,
            requestId: input.request_id,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            cacheHitRate: this.calculateCacheHitRate(),
        });
    }
    recordCacheMiss(input, reason) {
        this.cacheMisses += 1;
        logger_js_1.default.debug('OPA decision cache miss', {
            tenantId: input.tenant_id,
            requestId: input.request_id,
            reason,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            cacheHitRate: this.calculateCacheHitRate(),
        });
    }
    /**
     * Get enforcement statistics
     */
    getStats() {
        const totalCacheChecks = this.cacheHits + this.cacheMisses;
        return {
            enabled: this.options.enabled,
            cacheSize: this.decisionCache.size,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            cacheHitRate: totalCacheChecks === 0 ? 0 : this.cacheHits / totalCacheChecks,
        };
    }
}
exports.OPAEnforcer = OPAEnforcer;
// Global enforcer instance
let globalOPAEnforcer = null;
/**
 * Get global OPA enforcer
 */
function getOPAEnforcer(options) {
    if (!globalOPAEnforcer) {
        globalOPAEnforcer = new OPAEnforcer(options);
        globalOPAEnforcer.startCacheCleanup();
    }
    return globalOPAEnforcer;
}
/**
 * Express middleware factory
 */
function createOPAMiddleware(options) {
    const enforcer = getOPAEnforcer(options);
    return enforcer.createMiddleware();
}
/**
 * Default OPA middleware
 */
exports.opaMiddleware = createOPAMiddleware();
