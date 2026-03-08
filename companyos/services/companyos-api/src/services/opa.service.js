"use strict";
/**
 * CompanyOS OPA Service
 *
 * Implements B1: OPA-Backed Authorization v1 (ABAC -> Real PDP)
 *
 * Integrates with OPA for policy-based authorization decisions.
 * Supports hot-reloadable policies without code changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAService = void 0;
exports.getOPAService = getOPAService;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('opa-service');
// ============================================================================
// OPA Service
// ============================================================================
class OPAService {
    config;
    decisionCache = new Map();
    healthy = true;
    lastHealthCheck = 0;
    healthCheckInterval = 30000; // 30 seconds
    constructor(config) {
        this.config = {
            enabled: true,
            url: process.env.OPA_URL || 'http://localhost:8181',
            policyPath: '/v1/data/companyos/authz/decision',
            timeout: 5000,
            cacheEnabled: true,
            cacheTTL: 5000, // 5 seconds
            failOpen: process.env.NODE_ENV === 'development',
            ...config,
        };
        logger.info('OPAService initialized', {
            enabled: this.config.enabled,
            url: this.config.url,
            failOpen: this.config.failOpen,
        });
    }
    // ============================================================================
    // Authorization Methods
    // ============================================================================
    /**
     * Check if user has permission to perform action on resource
     */
    async checkPermission(action, userId, context, resource) {
        const decision = await this.evaluate({
            subject: {
                id: userId,
                tenant_id: context.tenantId,
                roles: context.roles || [],
                mfa_verified: context.mfaVerified,
            },
            resource: {
                type: resource?.type || 'system',
                id: resource?.id,
                tenant_id: resource?.tenantId || context.tenantId,
            },
            action,
            environment: {
                timestamp: new Date().toISOString(),
                ip_address: context.ipAddress,
                user_agent: context.userAgent,
                request_id: context.requestId,
            },
        });
        if (!decision.allow) {
            logger.warn('Permission denied by OPA', {
                userId,
                action,
                resource,
                reason: decision.reason,
            });
            throw new Error(decision.reason || `Permission denied: ${action}`);
        }
        // Handle MFA requirement
        if (decision.requires_mfa && !context.mfaVerified) {
            throw new Error('MFA verification required for this operation');
        }
        logger.debug('Permission granted', { userId, action, resource });
    }
    /**
     * Check if user has a specific role
     */
    async hasRole(userId, role, context) {
        // For now, check roles from context
        // In production, this would query OPA for role validation
        return context.roles?.includes(role) || false;
    }
    /**
     * Evaluate OPA policy and get decision
     */
    async evaluate(input) {
        if (!this.config.enabled) {
            return { allow: true, reason: 'OPA disabled' };
        }
        // Check cache first
        const cacheKey = this.getCacheKey(input);
        if (this.config.cacheEnabled) {
            const cached = this.decisionCache.get(cacheKey);
            if (cached && Date.now() < cached.expiresAt) {
                logger.debug('OPA cache hit', { cacheKey });
                return cached.decision;
            }
        }
        try {
            const decision = await this.queryOPA(input);
            // Cache the decision
            if (this.config.cacheEnabled) {
                this.decisionCache.set(cacheKey, {
                    decision,
                    expiresAt: Date.now() + this.config.cacheTTL,
                });
            }
            return decision;
        }
        catch (error) {
            logger.error('OPA query failed', {
                error: error instanceof Error ? error.message : String(error),
                input,
            });
            // Fail open or closed based on config
            if (this.config.failOpen) {
                logger.warn('OPA unavailable, failing open');
                return { allow: true, reason: 'OPA unavailable (fail-open mode)' };
            }
            else {
                logger.error('OPA unavailable, failing closed');
                return { allow: false, reason: 'Authorization service unavailable' };
            }
        }
    }
    /**
     * Query OPA for policy decision
     */
    async queryOPA(input) {
        const url = `${this.config.url}${this.config.policyPath}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`OPA returned status ${response.status}`);
            }
            const result = await response.json();
            // OPA returns { result: { allow: boolean, ... } }
            const decision = result.result || result;
            return {
                allow: decision.allow ?? false,
                reason: decision.reason,
                obligations: decision.obligations,
                audit_required: decision.audit_required,
                requires_mfa: decision.requires_mfa,
            };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    // ============================================================================
    // Policy Simulation (for testing policy changes)
    // ============================================================================
    /**
     * Simulate policy evaluation without affecting real decisions
     */
    async simulate(input, policyOverride) {
        // In a real implementation, this would use OPA's decision log
        // or a separate simulation endpoint
        const decision = await this.evaluate(input);
        return {
            decision,
            trace: [`Evaluated policy at ${this.config.policyPath}`],
        };
    }
    // ============================================================================
    // Health Check
    // ============================================================================
    async healthCheck() {
        const now = Date.now();
        if (now - this.lastHealthCheck < this.healthCheckInterval) {
            return this.healthy;
        }
        try {
            const response = await fetch(`${this.config.url}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });
            this.healthy = response.ok;
            this.lastHealthCheck = now;
            if (!this.healthy) {
                logger.warn('OPA health check failed', { status: response.status });
            }
            return this.healthy;
        }
        catch (error) {
            this.healthy = false;
            this.lastHealthCheck = now;
            logger.error('OPA health check error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    // ============================================================================
    // Cache Management
    // ============================================================================
    clearCache() {
        this.decisionCache.clear();
        logger.info('OPA decision cache cleared');
    }
    getCacheStats() {
        return {
            size: this.decisionCache.size,
            hitRate: 0, // Would need to track hits/misses
        };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    getCacheKey(input) {
        // Create a stable cache key from input
        const key = JSON.stringify({
            subject: input.subject.id,
            tenant: input.subject.tenant_id,
            roles: input.subject.roles.sort(),
            resource: `${input.resource.type}:${input.resource.id || '*'}`,
            action: input.action,
        });
        return key;
    }
}
exports.OPAService = OPAService;
// Export singleton
let opaServiceInstance = null;
function getOPAService(config) {
    if (!opaServiceInstance) {
        opaServiceInstance = new OPAService(config);
    }
    return opaServiceInstance;
}
