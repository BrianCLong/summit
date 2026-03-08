"use strict";
// Open Policy Agent (OPA) Integration for Conductor
// Implements policy-based authorization and tenant isolation
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantIsolationMiddleware = exports.tagPropagationSystem = exports.opaPolicyEngine = exports.TenantIsolationMiddleware = exports.TagPropagationSystem = void 0;
const axios_1 = __importDefault(require("axios"));
const prometheus_js_1 = require("../observability/prometheus.js");
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const bundleStore_js_1 = require("../../policy/bundleStore.js");
const index_js_1 = require("../../audit/index.js");
/**
 * OPA Policy Engine Client
 */
class OpaPolicyEngine {
    opaBaseUrl;
    policyCache;
    CACHE_TTL = 300000; // 5 minutes
    constructor() {
        this.opaBaseUrl = process.env.OPA_BASE_URL || 'http://localhost:8181';
        this.policyCache = new Map();
    }
    /**
     * Evaluate policy decision
     */
    async evaluatePolicy(policyName, context) {
        const startTime = Date.now();
        const policyBundleVersion = this.resolvePolicyBundleVersion(context);
        let cacheHit = false;
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(policyName, context);
            const cached = this.policyCache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('opa_cache_hit');
                cacheHit = true;
                const decision = {
                    ...cached.decision,
                    policyBundleVersion,
                };
                await this.recordPolicyDecision(policyName, context, decision, policyBundleVersion, cacheHit);
                return decision;
            }
            // Prepare OPA input
            const opaInput = {
                input: {
                    ...context,
                    timestamp: Date.now(),
                    policyVersion: process.env.OPA_POLICY_VERSION || '1.0',
                },
            };
            // Call OPA
            const response = await axios_1.default.post(`${this.opaBaseUrl}/v1/data/${policyName}`, opaInput, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': crypto_1.default.randomUUID(),
                },
            });
            const decision = this.parseOpaResponse(response.data);
            const enrichedDecision = {
                ...decision,
                policyBundleVersion,
            };
            // Cache the decision
            const ttl = decision.allow ? 60_000 /* 1m */ : 300_000; /* 5m */
            this.policyCache.set(cacheKey, {
                decision: enrichedDecision,
                expiry: Date.now() + ttl,
            });
            // Record metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('opa_policy_evaluation');
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('opa_evaluation_time', Date.now() - startTime);
            await this.recordPolicyDecision(policyName, context, enrichedDecision, policyBundleVersion, cacheHit);
            return enrichedDecision;
        }
        catch (error) {
            console.error('OPA policy evaluation failed:', error);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('opa_evaluation_error');
            // Fail-safe: deny by default
            const decision = {
                allow: false,
                reason: `Policy evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                reasons: ['opa_error'],
                attrsUsed: this.defaultAttrsUsed(context),
                policyBundleVersion,
                auditLog: {
                    logLevel: 'error',
                    message: 'OPA policy evaluation failure',
                    metadata: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                },
            };
            await this.recordPolicyDecision(policyName, context, decision, policyBundleVersion, cacheHit);
            return decision;
        }
    }
    /**
     * Evaluate tenant isolation policy
     */
    async evaluateTenantIsolation(context) {
        return this.evaluatePolicy('conductor/tenant_isolation', context);
    }
    /**
     * Evaluate data access policy
     */
    async evaluateDataAccess(context) {
        return this.evaluatePolicy('conductor/data_access', context);
    }
    /**
     * Evaluate cross-tenant operation policy
     */
    async evaluateCrossTenantOperation(context) {
        return this.evaluatePolicy('conductor/cross_tenant', context);
    }
    /**
     * Load tenant isolation configuration
     */
    async loadTenantConfig(tenantId) {
        try {
            const response = await axios_1.default.get(`${this.opaBaseUrl}/v1/data/conductor/tenant_config/${tenantId}`, {
                timeout: 3000,
            });
            return response.data.result || null;
        }
        catch (error) {
            console.error(`Failed to load tenant config for ${tenantId}:`, error);
            return null;
        }
    }
    /**
     * Parse OPA response
     */
    parseOpaResponse(opaResponse) {
        const result = opaResponse.result;
        if (typeof result === 'boolean') {
            return {
                allow: result,
                reason: result ? 'allowed' : 'denied',
                reasons: [result ? 'allowed' : 'denied'],
                attrsUsed: [],
                conditions: [],
                tags: [],
            };
        }
        const resolved = result || {};
        return {
            allow: resolved.allow || false,
            reason: resolved.reason || 'No reason provided',
            reasons: resolved.reasons || (resolved.reason ? [resolved.reason] : []),
            attrsUsed: resolved.attrs_used || resolved.attrsUsed || [],
            conditions: resolved.conditions || [],
            tags: resolved.tags || [],
            auditLog: resolved.audit_log
                ? {
                    logLevel: resolved.audit_log.level || 'info',
                    message: resolved.audit_log.message || 'Policy evaluation',
                    metadata: resolved.audit_log.metadata || {},
                }
                : undefined,
            dataFilters: resolved.data_filters
                ? {
                    tenantScope: resolved.data_filters.tenant_scope || [],
                    fieldMask: resolved.data_filters.field_mask || [],
                    rowLevelFilters: resolved.data_filters.row_level_filters || {},
                }
                : undefined,
        };
    }
    resolvePolicyBundleVersion(context) {
        try {
            const resolved = bundleStore_js_1.policyBundleStore.resolve(context.policyVersion);
            return resolved.versionId;
        }
        catch (_error) {
            return process.env.OPA_POLICY_VERSION || 'unknown';
        }
    }
    defaultAttrsUsed(context) {
        const attributes = new Set(['tenantId', 'role', 'action', 'resource']);
        if (context.resourceAttributes)
            attributes.add('resourceAttributes');
        if (context.subjectAttributes)
            attributes.add('subjectAttributes');
        return Array.from(attributes);
    }
    async recordPolicyDecision(policyName, context, decision, policyBundleVersion, cacheHit) {
        const reasons = decision.reasons && decision.reasons.length > 0
            ? decision.reasons
            : decision.reason
                ? [decision.reason]
                : [];
        const attrsUsed = decision.attrsUsed && decision.attrsUsed.length > 0
            ? decision.attrsUsed
            : this.defaultAttrsUsed(context);
        const correlationId = context.sessionContext?.traceId ||
            context.sessionContext?.sessionId ||
            crypto_1.default.randomUUID();
        logger_js_1.default.info({
            policy_bundle_version: policyBundleVersion,
            decision: decision.allow ? 'allow' : 'deny',
            reasons,
            attrs_used: attrsUsed,
            policy: policyName,
            tenantId: context.tenantId,
            userId: context.userId,
            action: context.action,
            resource: context.resource,
            cacheHit,
        }, 'OPA policy decision recorded');
        try {
            await index_js_1.advancedAuditSystem.recordEvent({
                eventType: 'policy_decision',
                level: decision.allow ? 'info' : 'warn',
                correlationId,
                tenantId: context.tenantId,
                serviceId: 'opa-policy-engine',
                action: context.action,
                outcome: decision.allow ? 'success' : 'failure',
                message: 'OPA policy decision recorded',
                details: {
                    policy: policyName,
                    policy_bundle_version: policyBundleVersion,
                    decision: decision.allow ? 'allow' : 'deny',
                    reasons,
                    attrs_used: attrsUsed,
                    cacheHit,
                    input: {
                        tenantId: context.tenantId,
                        userId: context.userId,
                        role: context.role,
                        action: context.action,
                        resource: context.resource,
                        resourceAttributes: context.resourceAttributes,
                        subjectAttributes: context.subjectAttributes,
                    },
                },
                complianceRelevant: true,
                complianceFrameworks: ['SOC2'],
                userId: context.userId,
                resourceType: context.resource,
                resourceId: context.resourceAttributes?.id ||
                    context.resourceAttributes?.runId,
            });
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                policy: policyName,
                tenantId: context.tenantId,
            }, 'Failed to write policy decision audit event');
        }
    }
    /**
     * Generate cache key for policy decision
     */
    generateCacheKey(policyName, context) {
        const keyData = {
            policy: policyName,
            tenant: context.tenantId,
            user: context.userId,
            role: context.role,
            action: context.action,
            resource: context.resource,
        };
        return crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(keyData))
            .digest('hex');
    }
    /**
     * Clear policy cache
     */
    clearCache() {
        this.policyCache.clear();
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('opa_cache_cleared');
    }
}
/**
 * Tag Propagation System
 */
class TagPropagationSystem {
    tagStore;
    constructor() {
        this.tagStore = new Map();
    }
    /**
     * Propagate tags from source to target resource
     */
    async propagateTags(sourceResourceId, targetResourceId, context) {
        try {
            const sourceTags = this.tagStore.get(sourceResourceId) || new Set();
            const targetTags = this.tagStore.get(targetResourceId) || new Set();
            // Add tenant isolation tag
            const tenantTag = `tenant:${context.tenantId}`;
            targetTags.add(tenantTag);
            // Add data classification tags based on source
            for (const tag of sourceTags) {
                if (tag.startsWith('classification:') ||
                    tag.startsWith('sensitivity:')) {
                    targetTags.add(tag);
                }
            }
            // Add operation context tags
            targetTags.add(`created_by:${context.userId || 'system'}`);
            targetTags.add(`action:${context.action}`);
            targetTags.add(`timestamp:${Date.now()}`);
            // Store updated tags
            this.tagStore.set(targetResourceId, targetTags);
            console.log(`Tags propagated from ${sourceResourceId} to ${targetResourceId}:`, Array.from(targetTags));
        }
        catch (error) {
            console.error('Tag propagation failed:', error);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('tag_propagation_error');
        }
    }
    /**
     * Get resource tags
     */
    getResourceTags(resourceId) {
        const tags = this.tagStore.get(resourceId);
        return tags ? Array.from(tags) : [];
    }
    /**
     * Add tags to resource
     */
    addTags(resourceId, tags) {
        const existingTags = this.tagStore.get(resourceId) || new Set();
        tags.forEach((tag) => existingTags.add(tag));
        this.tagStore.set(resourceId, existingTags);
    }
    /**
     * Filter resources by tenant isolation
     */
    filterResourcesByTenant(resourceIds, tenantId) {
        return resourceIds.filter((id) => {
            const tags = this.getResourceTags(id);
            return tags.includes(`tenant:${tenantId}`);
        });
    }
    /**
     * Validate cross-tenant access
     */
    validateCrossTenantAccess(resourceId, requestingTenantId) {
        const tags = this.getResourceTags(resourceId);
        // Check if resource belongs to requesting tenant
        if (tags.includes(`tenant:${requestingTenantId}`)) {
            return true;
        }
        // Check for explicit cross-tenant sharing tags
        return tags.some((tag) => tag.startsWith('shared_with:') && tag.includes(requestingTenantId));
    }
}
exports.TagPropagationSystem = TagPropagationSystem;
/**
 * Tenant Isolation Middleware
 */
class TenantIsolationMiddleware {
    opaPolicyEngine;
    tagPropagationSystem;
    constructor() {
        this.opaPolicyEngine = new OpaPolicyEngine();
        this.tagPropagationSystem = new TagPropagationSystem();
    }
    /**
     * Express middleware for tenant isolation
     */
    middleware() {
        return async (req, res, next) => {
            try {
                const tenantId = this.extractTenantId(req);
                const userId = req.user?.sub;
                const role = req.user?.role || 'user';
                if (!tenantId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tenant ID is required',
                    });
                }
                // Build policy context
                const context = {
                    tenantId,
                    userId,
                    role,
                    action: this.mapHttpMethodToAction(req.method),
                    resource: this.extractResourceFromPath(req.path),
                    sessionContext: {
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        timestamp: Date.now(),
                        sessionId: req.sessionID,
                    },
                };
                // Evaluate tenant isolation policy
                const decision = await this.opaPolicyEngine.evaluateTenantIsolation(context);
                if (!decision.allow) {
                    // Log policy violation
                    console.warn('Tenant isolation policy violation:', {
                        tenantId,
                        userId,
                        action: context.action,
                        resource: context.resource,
                        reason: decision.reason,
                    });
                    prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('tenant_isolation_violation');
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied by tenant isolation policy',
                        reason: decision.reason,
                    });
                }
                // Add policy context to request
                req.policyContext = context;
                req.policyDecision = decision;
                // Apply data filters if specified
                if (decision.dataFilters) {
                    req.dataFilters = decision.dataFilters;
                }
                next();
            }
            catch (error) {
                console.error('Tenant isolation middleware error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Tenant isolation check failed',
                });
            }
        };
    }
    /**
     * GraphQL middleware for field-level isolation
     */
    graphqlMiddleware() {
        return {
            requestDidStart() {
                return {
                    willSendResponse(requestContext) {
                        // Apply field masking based on tenant isolation policy
                        if (requestContext.request.http?.policyDecision?.dataFilters
                            ?.fieldMask) {
                            const fieldMask = requestContext.request.http.policyDecision.dataFilters
                                .fieldMask;
                            const self = this;
                            requestContext.response.body = self.applyFieldMask(requestContext.response.body, fieldMask);
                        }
                    },
                };
            },
            applyFieldMask(responseBody, fieldMask) {
                if (!responseBody || !fieldMask.length)
                    return responseBody;
                // Recursively remove masked fields
                const maskFields = (obj) => {
                    if (Array.isArray(obj)) {
                        return obj.map(maskFields);
                    }
                    if (obj && typeof obj === 'object') {
                        const masked = { ...obj };
                        fieldMask.forEach((field) => {
                            delete masked[field];
                        });
                        // Recursively mask nested objects
                        Object.keys(masked).forEach((key) => {
                            masked[key] = maskFields(masked[key]);
                        });
                        return masked;
                    }
                    return obj;
                };
                return maskFields(responseBody);
            },
        };
    }
    extractTenantId(req) {
        return (req.headers['x-tenant-id'] ||
            req.user?.tenantId ||
            req.query.tenantId ||
            null);
    }
    mapHttpMethodToAction(method) {
        const methodMap = {
            GET: 'read',
            POST: 'create',
            PUT: 'update',
            PATCH: 'update',
            DELETE: 'delete',
        };
        return methodMap[method] || 'unknown';
    }
    extractResourceFromPath(path) {
        // Extract resource type from API path
        const pathParts = path.split('/').filter(Boolean);
        return pathParts.length > 1 ? pathParts[1] : 'unknown';
    }
}
exports.TenantIsolationMiddleware = TenantIsolationMiddleware;
// Export singletons
exports.opaPolicyEngine = new OpaPolicyEngine();
exports.tagPropagationSystem = new TagPropagationSystem();
exports.tenantIsolationMiddleware = new TenantIsolationMiddleware();
