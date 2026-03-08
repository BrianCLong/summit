"use strict";
// @ts-nocheck
/**
 * Barrier Enforcer
 *
 * Enforces information barriers between tenants, business units,
 * roles, and environments using OPA policy evaluation.
 *
 * @package dlp-core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarrierEnforcer = void 0;
class BarrierEnforcer {
    config;
    cache;
    constructor(config) {
        this.config = {
            opaPolicy: 'dlp/barriers',
            cacheEnabled: true,
            cacheTtl: 300000, // 5 minutes
            strictMode: true,
            ...config,
        };
        this.cache = new Map();
    }
    /**
     * Check if data flow is allowed across barriers
     */
    async check(request) {
        const cacheKey = this.getCacheKey(request);
        // Check cache
        if (this.config.cacheEnabled) {
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return cached.result;
            }
        }
        // Perform local checks first (fast path)
        const localViolations = this.performLocalChecks(request);
        if (localViolations.length > 0 && this.config.strictMode) {
            const result = {
                allowed: false,
                barrierViolation: true,
                violations: localViolations,
                barriersChecked: ['tenant_isolation', 'environment_boundary'],
                auditEventId: this.generateAuditId(),
            };
            if (this.config.cacheEnabled) {
                this.cache.set(cacheKey, {
                    result,
                    expires: Date.now() + (this.config.cacheTtl || 300000),
                });
            }
            return result;
        }
        // Call OPA for full policy evaluation
        try {
            const opaResult = await this.evaluateOPA(request);
            const result = this.mapOPAResult(opaResult);
            if (this.config.cacheEnabled) {
                this.cache.set(cacheKey, {
                    result,
                    expires: Date.now() + (this.config.cacheTtl || 300000),
                });
            }
            return result;
        }
        catch (error) {
            // Fail closed in strict mode
            if (this.config.strictMode) {
                return {
                    allowed: false,
                    barrierViolation: true,
                    violations: [
                        {
                            type: 'POLICY_EVALUATION_ERROR',
                            message: `Failed to evaluate policy: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            severity: 'CRITICAL',
                        },
                    ],
                    barriersChecked: [],
                    auditEventId: this.generateAuditId(),
                };
            }
            // Fail open in non-strict mode (with logging)
            console.error('Barrier check failed, allowing with warning:', error);
            return {
                allowed: true,
                barrierViolation: false,
                violations: [],
                barriersChecked: [],
                auditEventId: this.generateAuditId(),
            };
        }
    }
    /**
     * Perform fast local checks without OPA
     */
    performLocalChecks(request) {
        const violations = [];
        // Tenant isolation - always enforced
        if (request.source.tenantId !== request.target.tenantId &&
            request.source.tenantId !== 'PLATFORM' &&
            request.target.tenantId !== 'PLATFORM') {
            violations.push({
                type: 'TENANT_ISOLATION',
                message: `Cross-tenant data flow blocked: ${request.source.tenantId} -> ${request.target.tenantId}`,
                severity: 'CRITICAL',
                sourceContext: { tenantId: request.source.tenantId },
                targetContext: { tenantId: request.target.tenantId },
            });
        }
        // Environment boundary - PII in non-production
        if (request.resource.containsPii &&
            !request.resource.anonymized &&
            request.target.environment !== 'production' &&
            request.target.environment !== 'audit') {
            violations.push({
                type: 'ENVIRONMENT',
                message: `PII not allowed in ${request.target.environment} environment`,
                severity: 'CRITICAL',
                targetContext: { environment: request.target.environment },
                remediation: 'Use anonymized or synthetic data for non-production environments',
            });
        }
        // Classification vs clearance check
        const classificationLevels = {
            PUBLIC: 0,
            INTERNAL: 1,
            CONFIDENTIAL: 2,
            RESTRICTED: 3,
            TOP_SECRET: 4,
        };
        const clearanceLevels = {
            NONE: 0,
            BASIC: 1,
            ELEVATED: 2,
            SECRET: 3,
            TOP_SECRET: 4,
        };
        const dataLevel = classificationLevels[request.resource.classification] || 0;
        const actorLevel = clearanceLevels[request.actor.clearance || 'NONE'] || 0;
        if (dataLevel > actorLevel && !request.actor.stepUpVerified) {
            violations.push({
                type: 'ROLE_BASED',
                message: `Insufficient clearance: actor has ${request.actor.clearance || 'NONE'}, data requires ${request.resource.classification}`,
                severity: 'HIGH',
                remediation: 'Request elevated access or complete step-up authentication',
            });
        }
        return violations;
    }
    /**
     * Evaluate policy with OPA
     */
    async evaluateOPA(request) {
        const input = this.mapToOPAInput(request);
        const response = await fetch(`${this.config.opaEndpoint}/v1/data/${this.config.opaPolicy}/decision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input }),
        });
        if (!response.ok) {
            throw new Error(`OPA request failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return result.result;
    }
    /**
     * Map request to OPA input format
     */
    mapToOPAInput(request) {
        return {
            source: {
                tenant_id: request.source.tenantId,
                business_unit: request.source.businessUnit,
                environment: request.source.environment,
                jurisdiction: request.source.jurisdiction,
            },
            target: {
                tenant_id: request.target.tenantId,
                business_unit: request.target.businessUnit,
                environment: request.target.environment,
                jurisdiction: request.target.jurisdiction,
            },
            actor: {
                id: request.actor.id,
                tenant_id: request.actor.tenantId,
                business_unit: request.actor.businessUnit,
                roles: request.actor.roles,
                clearance: request.actor.clearance,
                step_up_verified: request.actor.stepUpVerified,
                step_up_level: request.actor.stepUpLevel,
                step_up_timestamp: request.actor.stepUpTimestamp,
            },
            resource: {
                id: request.resource.id,
                type: request.resource.type,
                classification: request.resource.classification,
                categories: request.resource.categories,
                contains_pii: request.resource.containsPii,
                anonymized: request.resource.anonymized,
            },
            operation: request.operation,
            transfer: request.transfer
                ? {
                    scc_in_place: request.transfer.sccInPlace,
                    bcr_approved: request.transfer.bcrApproved,
                }
                : undefined,
        };
    }
    /**
     * Map OPA result to BarrierCheckResult
     */
    mapOPAResult(opaResult) {
        return {
            allowed: opaResult.allowed,
            barrierViolation: opaResult.barrier_violation,
            violations: opaResult.violations.map((v) => ({
                type: v.type,
                message: v.message,
                severity: v.severity,
                remediation: v.remediation,
            })),
            barriersChecked: opaResult.barriers_checked,
            auditEventId: this.generateAuditId(),
        };
    }
    /**
     * Generate cache key for request
     */
    getCacheKey(request) {
        const key = {
            s: `${request.source.tenantId}:${request.source.businessUnit}:${request.source.environment}`,
            t: `${request.target.tenantId}:${request.target.businessUnit}:${request.target.environment}`,
            a: `${request.actor.id}:${request.actor.clearance}:${request.actor.stepUpVerified}`,
            r: `${request.resource.classification}:${request.resource.containsPii}`,
            o: request.operation,
        };
        return JSON.stringify(key);
    }
    /**
     * Generate audit event ID
     */
    generateAuditId() {
        return `DLP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits/misses
        };
    }
}
exports.BarrierEnforcer = BarrierEnforcer;
exports.default = BarrierEnforcer;
