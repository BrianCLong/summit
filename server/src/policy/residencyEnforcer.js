"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.residencyEnforcer = exports.ResidencyPolicyEnforcer = exports.Purpose = void 0;
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const pubsub_js_1 = require("../subscriptions/pubsub.js");
const tracer = api_1.trace.getTracer('residency-enforcer', '24.3.0');
// Enhanced policy metrics for v24.3
const residencyDecisions = new prom_client_1.Counter({
    name: 'residency_decisions_total',
    help: 'Total residency policy decisions made',
    labelNames: ['tenant_id', 'operation', 'decision', 'region', 'target_region'],
});
const residencyEvaluationDuration = new prom_client_1.Histogram({
    name: 'residency_evaluation_duration_seconds',
    help: 'Time spent evaluating residency policies',
    labelNames: ['tenant_id', 'region'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
});
const residencyViolations = new prom_client_1.Counter({
    name: 'residency_violations_total',
    help: 'Total residency policy violations',
    labelNames: [
        'tenant_id',
        'source_region',
        'target_region',
        'operation',
        'violation_type',
    ],
});
const crossRegionRequests = new prom_client_1.Counter({
    name: 'cross_region_requests_total',
    help: 'Total cross-region requests',
    labelNames: [
        'tenant_id',
        'source_region',
        'target_region',
        'operation',
        'allowed',
    ],
});
const exportTokenValidations = new prom_client_1.Counter({
    name: 'export_token_validations_total',
    help: 'Total export token validations',
    labelNames: ['tenant_id', 'valid', 'purpose'],
});
var Purpose;
(function (Purpose) {
    Purpose["INVESTIGATION"] = "investigation";
    Purpose["MONITORING"] = "monitoring";
    Purpose["ANALYTICS"] = "analytics";
    Purpose["COMPLIANCE"] = "compliance";
    Purpose["BENCHMARKING"] = "benchmarking";
    Purpose["DATA_MIGRATION"] = "data_migration";
    Purpose["LEGAL_COMPLIANCE"] = "legal_compliance";
    Purpose["BACKUP"] = "backup";
})(Purpose || (exports.Purpose = Purpose = {}));
class ResidencyPolicyEnforcer {
    cachePrefix = 'residency_cache';
    cacheTTL = 300; // 5 minutes
    currentRegion;
    constructor(currentRegion = process.env.CURRENT_REGION || 'us-east-1') {
        this.currentRegion = currentRegion;
    }
    async enforceResidencyPolicy(context, tenantContext) {
        return tracer.startActiveSpan('residency.enforce_policy', async (span) => {
            const startTime = Date.now();
            span.setAttributes({
                tenant_id: context.tenantId,
                operation: context.operation,
                region: context.region,
                target_region: context.targetRegion || 'same',
                has_export_token: !!context.hasExportToken,
                residency_class: tenantContext.residency.class,
            });
            try {
                // Check cache first for performance
                const cacheKey = this.buildCacheKey(context, tenantContext);
                const cached = await this.getFromCache(cacheKey);
                if (cached) {
                    span.setAttributes({ cache_hit: true });
                    return cached;
                }
                // Evaluate residency policy
                const decision = await this.evaluateResidencyPolicy(context, tenantContext);
                // Cache positive decisions briefly
                if (decision.allow) {
                    await this.setCache(cacheKey, decision, this.cacheTTL);
                }
                // Record provenance for audit trail
                await this.recordProvenance(context, tenantContext, decision);
                // Update metrics
                const duration = (Date.now() - startTime) / 1000;
                residencyEvaluationDuration.observe({ tenant_id: context.tenantId, region: context.region }, duration);
                residencyDecisions.inc({
                    tenant_id: context.tenantId,
                    operation: context.operation,
                    decision: decision.allow ? 'allow' : 'deny',
                    region: context.region,
                    target_region: context.targetRegion || 'same',
                });
                if (!decision.allow) {
                    residencyViolations.inc({
                        tenant_id: context.tenantId,
                        source_region: context.region,
                        target_region: context.targetRegion || context.region,
                        operation: context.operation,
                        violation_type: this.categorizeViolation(decision.denialReasons || []),
                    });
                }
                span.setAttributes({
                    decision_allow: decision.allow,
                    decision_reason: decision.reason,
                    cache_hit: false,
                });
                return decision;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                // Fail closed - deny access on policy evaluation errors
                return {
                    allow: false,
                    reason: 'Policy evaluation failed',
                    auditRequired: true,
                    denialReasons: [
                        `Policy evaluation error: ${error.message}`,
                    ],
                };
            }
            finally {
                span.end();
            }
        });
    }
    async evaluateResidencyPolicy(context, tenantContext) {
        const denialReasons = [];
        let requiresExportToken = false;
        // 1. Same region access - always allowed (fastest path)
        if (context.region === tenantContext.regionTag && !context.targetRegion) {
            return {
                allow: true,
                reason: 'Same region access',
                auditRequired: false,
            };
        }
        // 2. Determine effective target region
        const targetRegion = context.targetRegion || context.region;
        // 3. Check if target region is in tenant's allowed regions
        if (!tenantContext.residency.allowedRegions.includes(targetRegion)) {
            denialReasons.push(`Target region ${targetRegion} not in allowed regions: ${tenantContext.residency.allowedRegions.join(', ')}`);
        }
        // 4. Apply residency class restrictions
        switch (tenantContext.residency.class) {
            case 'sovereign':
                if (!this.evaluateSovereignAccess(context, tenantContext, targetRegion)) {
                    denialReasons.push('Sovereign tenant restrictions: cross-region access requires export authorization');
                    requiresExportToken = true;
                }
                break;
            case 'restricted':
                if (!this.evaluateRestrictedAccess(context, tenantContext, targetRegion)) {
                    denialReasons.push('Restricted tenant: cross-region access requires export token');
                    requiresExportToken = true;
                }
                break;
            case 'standard':
                // Standard tenants have more flexibility but still need validation
                if (!this.evaluateStandardAccess(context, tenantContext, targetRegion)) {
                    denialReasons.push('Standard tenant: write operations require same region or export authorization');
                }
                break;
        }
        // 5. Validate export token if provided
        if (context.hasExportToken && context.exportToken) {
            const tokenValidation = await this.validateExportToken(context.exportToken, context, tenantContext);
            if (!tokenValidation.valid) {
                denialReasons.push(`Invalid export token: ${tokenValidation.reason}`);
            }
            else {
                // Valid export token can override some restrictions
                denialReasons.length = 0; // Clear previous denials if token is valid
            }
            exportTokenValidations.inc({
                tenant_id: context.tenantId,
                valid: tokenValidation.valid ? 'true' : 'false',
                purpose: context.purpose,
            });
        }
        // 6. Check data classification permissions
        if (context.dataClassifications && context.dataClassifications.length > 0) {
            const classificationCheck = this.validateDataClassificationAccess(context.dataClassifications, tenantContext.residency.dataClassification);
            if (!classificationCheck.allowed) {
                denialReasons.push(`Data classification access denied: ${classificationCheck.reason}`);
            }
        }
        // 7. Check export destination restrictions
        if (context.operation === 'export' && context.exportDestination) {
            const exportCheck = this.validateExportDestination(context.exportDestination, tenantContext);
            if (!exportCheck.allowed) {
                denialReasons.push(`Export destination not allowed: ${exportCheck.reason}`);
            }
        }
        // 8. Check rate limits for export operations
        if (context.operation === 'export') {
            const rateLimitCheck = this.checkExportRateLimit(context, tenantContext);
            if (!rateLimitCheck.allowed) {
                denialReasons.push(`Export rate limit exceeded: ${rateLimitCheck.reason}`);
            }
        }
        // 9. Record cross-region request metrics
        if (targetRegion !== tenantContext.regionTag) {
            crossRegionRequests.inc({
                tenant_id: context.tenantId,
                source_region: tenantContext.regionTag,
                target_region: targetRegion,
                operation: context.operation,
                allowed: denialReasons.length === 0 ? 'true' : 'false',
            });
        }
        // Final decision
        const allow = denialReasons.length === 0;
        return {
            allow,
            reason: allow
                ? 'Residency policy allows access'
                : 'Residency policy denies access',
            denialReasons: denialReasons.length > 0 ? denialReasons : undefined,
            requiresExportToken: !allow && requiresExportToken,
            auditRequired: !allow ||
                context.operation === 'export' ||
                targetRegion !== tenantContext.regionTag,
            allowedOperations: allow
                ? undefined
                : this.getAllowedOperations(context, tenantContext),
            regionRestrictions: allow
                ? undefined
                : tenantContext.residency.allowedRegions,
        };
    }
    evaluateSovereignAccess(context, tenantContext, targetRegion) {
        // Sovereign tenants: strict same-region only, unless export token for read operations
        if (targetRegion === tenantContext.regionTag) {
            return true;
        }
        if (context.operation === 'read' && context.hasExportToken) {
            return true;
        }
        return false;
    }
    evaluateRestrictedAccess(context, tenantContext, targetRegion) {
        // Restricted tenants: same region or with export token
        if (targetRegion === tenantContext.regionTag) {
            return true;
        }
        if (context.hasExportToken) {
            return true;
        }
        return false;
    }
    evaluateStandardAccess(context, tenantContext, targetRegion) {
        // Standard tenants: read from allowed regions, write needs same region or export token
        if (targetRegion === tenantContext.regionTag) {
            return true;
        }
        if (context.operation === 'read' &&
            tenantContext.residency.allowedRegions.includes(targetRegion)) {
            return true;
        }
        if (context.operation === 'write' && context.hasExportToken) {
            return true;
        }
        return false;
    }
    async validateExportToken(token, context, tenantContext) {
        try {
            // In production, this would use JWT verification with proper secret
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            // Basic validations
            if (payload.tenantId !== context.tenantId) {
                return { valid: false, reason: 'Token tenant mismatch' };
            }
            if (payload.expiresAt < Date.now()) {
                return { valid: false, reason: 'Token expired' };
            }
            if (context.targetRegion &&
                !payload.allowedRegions.includes(context.targetRegion)) {
                return { valid: false, reason: 'Target region not allowed by token' };
            }
            if (!payload.allowedOperations.includes(context.operation)) {
                return { valid: false, reason: 'Operation not allowed by token' };
            }
            return { valid: true, payload };
        }
        catch (error) {
            return { valid: false, reason: 'Token parsing failed' };
        }
    }
    validateDataClassificationAccess(requestedClassifications, tenantClassifications) {
        for (const classification of requestedClassifications) {
            if (!tenantClassifications.includes(classification)) {
                return {
                    allowed: false,
                    reason: `Missing clearance for classification: ${classification}`,
                };
            }
        }
        return { allowed: true };
    }
    validateExportDestination(destination, tenantContext) {
        const allowedDestinations = tenantContext.residency.exportRestrictions?.allowedDestinations || [];
        if (allowedDestinations.length === 0) {
            return { allowed: true }; // No restrictions
        }
        if (allowedDestinations.includes(destination)) {
            return { allowed: true };
        }
        return {
            allowed: false,
            reason: `Destination ${destination} not in allowed list: ${allowedDestinations.join(', ')}`,
        };
    }
    checkExportRateLimit(context, tenantContext) {
        const dailyLimit = tenantContext.quotas.exportCallsPerDay;
        const callsToday = context.exportCallsToday || 0;
        if (callsToday >= dailyLimit) {
            return {
                allowed: false,
                reason: `Daily export limit exceeded: ${callsToday}/${dailyLimit}`,
            };
        }
        return { allowed: true };
    }
    getAllowedOperations(context, tenantContext) {
        const operations = [];
        // Always allow read in home region
        if (context.region === tenantContext.regionTag) {
            operations.push('read', 'write');
        }
        // Standard tenants can read from allowed regions
        if (tenantContext.residency.class === 'standard' &&
            tenantContext.residency.allowedRegions.includes(context.region)) {
            operations.push('read');
        }
        return operations;
    }
    categorizeViolation(denialReasons) {
        if (denialReasons.some((r) => r.includes('sovereign'))) {
            return 'sovereign_restriction';
        }
        if (denialReasons.some((r) => r.includes('region'))) {
            return 'region_restriction';
        }
        if (denialReasons.some((r) => r.includes('classification'))) {
            return 'classification_restriction';
        }
        if (denialReasons.some((r) => r.includes('rate limit'))) {
            return 'rate_limit';
        }
        return 'other';
    }
    buildCacheKey(context, tenantContext) {
        return `${this.cachePrefix}:${context.tenantId}:${context.operation}:${context.region}:${context.targetRegion || 'same'}:${tenantContext.residency.class}:${!!context.hasExportToken}`;
    }
    async getFromCache(key) {
        try {
            const cached = await pubsub_js_1.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            return null; // Cache miss on error
        }
    }
    async setCache(key, decision, ttl) {
        try {
            await pubsub_js_1.redis.setex(key, ttl, JSON.stringify(decision));
        }
        catch (error) {
            // Ignore cache errors
        }
    }
    async recordProvenance(context, tenantContext, decision) {
        const record = {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            tenantId: context.tenantId,
            userId: context.userId,
            operation: context.operation,
            region: context.region,
            targetRegion: context.targetRegion,
            decision: decision.allow ? 'allow' : 'deny',
            reason: decision.reason,
            dataClassifications: context.dataClassifications,
            hasExportToken: !!context.hasExportToken,
            timestamp: new Date(),
            ipAddress: context.metadata?.clientIP,
            userAgent: context.metadata?.userAgent,
        };
        // In production, this would write to an audit log or database
        console.log('RESIDENCY_AUDIT:', JSON.stringify(record));
    }
}
exports.ResidencyPolicyEnforcer = ResidencyPolicyEnforcer;
exports.residencyEnforcer = new ResidencyPolicyEnforcer();
