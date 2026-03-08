"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxEnforcer = exports.OperationType = void 0;
exports.getSandboxEnforcer = getSandboxEnforcer;
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
const uuid_1 = require("uuid");
const logger = (0, logger_js_1.createLogger)('SandboxEnforcer');
/**
 * Operation types that can be enforced
 */
var OperationType;
(function (OperationType) {
    OperationType["QUERY"] = "query";
    OperationType["MUTATION"] = "mutation";
    OperationType["DATA_ACCESS"] = "data_access";
    OperationType["EXPORT"] = "export";
    OperationType["CONNECTOR_USE"] = "connector_use";
    OperationType["INTEGRATION"] = "integration";
    OperationType["FEDERATION"] = "federation";
})(OperationType || (exports.OperationType = OperationType = {}));
/**
 * SandboxEnforcer is responsible for enforcing sandbox policies
 * and preventing unauthorized access or data leakage.
 */
class SandboxEnforcer {
    linkbackAttempts = [];
    operationCounts = new Map();
    /**
     * Enforce sandbox policies for an operation
     */
    async enforce(profile, context) {
        const warnings = [];
        // Check sandbox status first
        const statusCheck = this.checkSandboxStatus(profile);
        if (!statusCheck.allowed) {
            return statusCheck;
        }
        // Check rate limits
        const rateLimitCheck = this.checkRateLimits(profile, context);
        if (!rateLimitCheck.allowed) {
            return rateLimitCheck;
        }
        // Route to specific enforcement based on operation type
        let decision;
        switch (context.operation) {
            case OperationType.QUERY:
                decision = await this.enforceQuery(profile, context);
                break;
            case OperationType.MUTATION:
                decision = await this.enforceMutation(profile, context);
                break;
            case OperationType.DATA_ACCESS:
                decision = await this.enforceDataAccess(profile, context);
                break;
            case OperationType.EXPORT:
                decision = await this.enforceExport(profile, context);
                break;
            case OperationType.CONNECTOR_USE:
                decision = await this.enforceConnector(profile, context);
                break;
            case OperationType.INTEGRATION:
                decision = await this.enforceIntegration(profile, context);
                break;
            case OperationType.FEDERATION:
                decision = await this.enforceFederation(profile, context);
                break;
            default:
                decision = {
                    allowed: false,
                    reason: `Unknown operation type: ${context.operation}`,
                    code: index_js_1.SandboxErrorCode.ACCESS_DENIED,
                    requiresAudit: true,
                    warnings: [],
                };
        }
        // Log the decision
        this.logDecision(profile, context, decision);
        return decision;
    }
    /**
     * Check if an operation would attempt linkback to production
     */
    async checkLinkback(profile, context, targetProductionId) {
        const attempt = index_js_1.LinkbackAttemptSchema.parse({
            id: (0, uuid_1.v4)(),
            sandboxId: profile.id,
            userId: context.userId,
            timestamp: new Date(),
            sourceType: this.mapOperationToSourceType(context.operation),
            sourceId: context.resourceId || 'unknown',
            targetProductionId,
            blocked: true, // Always block linkback
            reason: 'Linkback to production is not allowed from sandbox',
            riskScore: this.calculateLinkbackRisk(context),
            metadata: context.metadata || {},
        });
        // Record the attempt
        this.linkbackAttempts.push(attempt);
        logger.warn('Linkback attempt detected', {
            sandboxId: profile.id,
            userId: context.userId,
            sourceType: attempt.sourceType,
            riskScore: attempt.riskScore,
        });
        // Always block linkback attempts
        return {
            allowed: false,
            reason: 'Linkback to production data is not permitted from sandbox environments',
            code: index_js_1.SandboxErrorCode.LINKBACK_BLOCKED,
            requiresAudit: true,
            warnings: ['This attempt has been logged and may be reviewed'],
        };
    }
    /**
     * Get data filters to apply based on sandbox policy
     */
    getDataFilters(profile) {
        const filters = [];
        // Always filter to sandbox tenant
        filters.push({
            field: 'tenantId',
            operator: 'eq',
            value: profile.id,
        });
        // Apply entity type filters
        if (profile.dataAccessPolicy.allowedEntityTypes.length > 0) {
            filters.push({
                field: 'entityType',
                operator: 'in',
                value: profile.dataAccessPolicy.allowedEntityTypes,
            });
        }
        if (profile.dataAccessPolicy.blockedEntityTypes.length > 0) {
            filters.push({
                field: 'entityType',
                operator: 'nin',
                value: profile.dataAccessPolicy.blockedEntityTypes,
            });
        }
        // Filter out production references
        filters.push({
            field: 'sourceType',
            operator: 'ne',
            value: 'production',
        });
        // Apply data mode restrictions
        if (profile.dataAccessPolicy.mode === index_js_1.DataAccessMode.SYNTHETIC_ONLY) {
            filters.push({
                field: 'dataSource',
                operator: 'eq',
                value: 'synthetic',
            });
        }
        return filters;
    }
    /**
     * Get linkback attempts for a sandbox
     */
    getLinkbackAttempts(sandboxId, limit = 100) {
        return this.linkbackAttempts
            .filter(a => a.sandboxId === sandboxId)
            .slice(-limit);
    }
    /**
     * Clear linkback attempts (for cleanup)
     */
    clearLinkbackAttempts(sandboxId) {
        this.linkbackAttempts = this.linkbackAttempts.filter(a => a.sandboxId !== sandboxId);
    }
    // Private enforcement methods
    checkSandboxStatus(profile) {
        if (profile.status === index_js_1.SandboxStatus.SUSPENDED) {
            return {
                allowed: false,
                reason: 'Sandbox is suspended',
                code: index_js_1.SandboxErrorCode.SUSPENDED,
                requiresAudit: true,
                warnings: [],
            };
        }
        if (profile.status === index_js_1.SandboxStatus.EXPIRED) {
            return {
                allowed: false,
                reason: 'Sandbox has expired',
                code: index_js_1.SandboxErrorCode.EXPIRED,
                requiresAudit: true,
                warnings: [],
            };
        }
        if (profile.status !== index_js_1.SandboxStatus.ACTIVE &&
            profile.status !== index_js_1.SandboxStatus.PROVISIONING) {
            return {
                allowed: false,
                reason: `Sandbox is in invalid status: ${profile.status}`,
                code: index_js_1.SandboxErrorCode.ACCESS_DENIED,
                requiresAudit: true,
                warnings: [],
            };
        }
        // Check expiration
        if (profile.expiresAt && new Date() > profile.expiresAt) {
            return {
                allowed: false,
                reason: 'Sandbox has expired',
                code: index_js_1.SandboxErrorCode.EXPIRED,
                requiresAudit: true,
                warnings: [],
            };
        }
        return {
            allowed: true,
            reason: 'Sandbox status OK',
            requiresAudit: false,
            warnings: [],
        };
    }
    checkRateLimits(profile, context) {
        const key = `${profile.id}:${context.userId}:${new Date().getHours()}`;
        const count = this.operationCounts.get(key) || 0;
        if (count >= profile.resourceQuotas.maxExecutionsPerHour) {
            return {
                allowed: false,
                reason: 'Rate limit exceeded for this hour',
                code: index_js_1.SandboxErrorCode.QUOTA_EXCEEDED,
                requiresAudit: true,
                warnings: [],
            };
        }
        // Increment counter
        this.operationCounts.set(key, count + 1);
        return {
            allowed: true,
            reason: 'Rate limit OK',
            requiresAudit: false,
            warnings: [],
        };
    }
    async enforceQuery(profile, context) {
        const warnings = [];
        const filters = this.getDataFilters(profile);
        // Check record limits
        if (profile.dataAccessPolicy.maxRecords === 0) {
            return {
                allowed: false,
                reason: 'Data queries are not allowed in this sandbox',
                code: index_js_1.SandboxErrorCode.ACCESS_DENIED,
                requiresAudit: true,
                warnings: [],
            };
        }
        // Add limit filter
        filters.push({
            field: '_limit',
            operator: 'eq',
            value: Math.min(profile.dataAccessPolicy.maxRecords, 10000),
        });
        return {
            allowed: true,
            reason: 'Query allowed with filters',
            requiresAudit: profile.auditConfig.logAllQueries,
            warnings,
            filters,
        };
    }
    async enforceMutation(profile, context) {
        // Mutations are allowed within sandbox scope
        return {
            allowed: true,
            reason: 'Mutation allowed within sandbox scope',
            requiresAudit: profile.auditConfig.logAllMutations,
            warnings: ['Mutations only affect sandbox data'],
            filters: this.getDataFilters(profile),
        };
    }
    async enforceDataAccess(profile, context) {
        const warnings = [];
        // Check if fields contain PII
        if (context.dataFields && context.dataFields.length > 0) {
            const piiFields = this.detectPIIFields(context.dataFields);
            if (piiFields.length > 0) {
                if (profile.dataAccessPolicy.piiHandling === 'block') {
                    return {
                        allowed: false,
                        reason: `PII fields detected and blocked: ${piiFields.join(', ')}`,
                        code: index_js_1.SandboxErrorCode.PII_DETECTED,
                        requiresAudit: true,
                        warnings: [],
                    };
                }
                warnings.push(`PII fields will be ${profile.dataAccessPolicy.piiHandling}ed: ${piiFields.join(', ')}`);
            }
        }
        return {
            allowed: true,
            reason: 'Data access allowed with policy applied',
            requiresAudit: profile.auditConfig.logDataAccess,
            warnings,
            filters: this.getDataFilters(profile),
        };
    }
    async enforceExport(profile, context) {
        // Check if exports are allowed
        if (profile.resourceQuotas.maxDataExportMb === 0) {
            return {
                allowed: false,
                reason: 'Data exports are disabled for this sandbox',
                code: index_js_1.SandboxErrorCode.EXPORT_BLOCKED,
                requiresAudit: true,
                warnings: [],
            };
        }
        // Check integration restrictions
        if (!profile.integrationRestrictions.allowExternalExports &&
            context.targetEndpoint) {
            return {
                allowed: false,
                reason: 'External exports are not allowed',
                code: index_js_1.SandboxErrorCode.EXPORT_BLOCKED,
                requiresAudit: true,
                warnings: [],
            };
        }
        return {
            allowed: true,
            reason: 'Export allowed within quota',
            requiresAudit: profile.auditConfig.logExportAttempts,
            warnings: [
                `Export limited to ${profile.resourceQuotas.maxDataExportMb}MB`,
                'Export will be anonymized per policy',
            ],
        };
    }
    async enforceConnector(profile, context) {
        if (!context.connectorType) {
            return {
                allowed: false,
                reason: 'Connector type not specified',
                code: index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED,
                requiresAudit: true,
                warnings: [],
            };
        }
        const restriction = profile.connectorRestrictions.find(r => r.connectorType === context.connectorType);
        if (!restriction) {
            return {
                allowed: false,
                reason: `Connector type ${context.connectorType} not configured`,
                code: index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED,
                requiresAudit: true,
                warnings: [],
            };
        }
        if (!restriction.allowed) {
            return {
                allowed: false,
                reason: `Connector type ${context.connectorType} is not allowed`,
                code: index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED,
                requiresAudit: true,
                warnings: [],
            };
        }
        // Check allowlist/blocklist
        if (context.targetEndpoint) {
            const isBlocked = restriction.blocklist.some(pattern => this.matchesPattern(context.targetEndpoint, pattern));
            if (isBlocked) {
                return {
                    allowed: false,
                    reason: `Target endpoint is blocked: ${context.targetEndpoint}`,
                    code: index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED,
                    requiresAudit: true,
                    warnings: [],
                };
            }
            if (restriction.allowlist.length > 0) {
                const isAllowed = restriction.allowlist.some(pattern => this.matchesPattern(context.targetEndpoint, pattern));
                if (!isAllowed) {
                    return {
                        allowed: false,
                        reason: `Target endpoint not in allowlist: ${context.targetEndpoint}`,
                        code: index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED,
                        requiresAudit: true,
                        warnings: [],
                    };
                }
            }
        }
        return {
            allowed: true,
            reason: 'Connector access allowed',
            requiresAudit: restriction.auditAllAccess,
            warnings: restriction.requireApproval
                ? ['This connector requires approval for production use']
                : [],
        };
    }
    async enforceIntegration(profile, context) {
        const restrictions = profile.integrationRestrictions;
        // Check if integration is blocked
        if (restrictions.blockedIntegrations.includes('*')) {
            const isAllowed = context.targetEndpoint &&
                restrictions.allowedIntegrations.some(pattern => this.matchesPattern(context.targetEndpoint, pattern));
            if (!isAllowed) {
                return {
                    allowed: false,
                    reason: 'Integration not in allowlist',
                    code: index_js_1.SandboxErrorCode.ACCESS_DENIED,
                    requiresAudit: true,
                    warnings: [],
                };
            }
        }
        // Check external call limits
        if (restrictions.maxExternalCalls === 0) {
            return {
                allowed: false,
                reason: 'External integration calls are disabled',
                code: index_js_1.SandboxErrorCode.ACCESS_DENIED,
                requiresAudit: true,
                warnings: [],
            };
        }
        return {
            allowed: true,
            reason: 'Integration allowed',
            requiresAudit: true,
            warnings: [],
        };
    }
    async enforceFederation(profile, context) {
        // Federation is always blocked in sandbox
        return {
            allowed: false,
            reason: 'Federation is not allowed in sandbox environments',
            code: index_js_1.SandboxErrorCode.FEDERATION_BLOCKED,
            requiresAudit: true,
            warnings: [],
        };
    }
    // Helper methods
    detectPIIFields(fields) {
        const piiPatterns = [
            /ssn/i,
            /social.?security/i,
            /passport/i,
            /driver.?license/i,
            /credit.?card/i,
            /card.?number/i,
            /cvv/i,
            /email/i,
            /phone/i,
            /address/i,
            /dob/i,
            /date.?of.?birth/i,
            /birth.?date/i,
            /salary/i,
            /income/i,
            /password/i,
            /secret/i,
            /token/i,
            /api.?key/i,
        ];
        return fields.filter(field => piiPatterns.some(pattern => pattern.test(field)));
    }
    matchesPattern(value, pattern) {
        if (pattern === '*')
            return true;
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regexPattern}$`, 'i').test(value);
    }
    mapOperationToSourceType(operation) {
        switch (operation) {
            case OperationType.EXPORT:
                return 'export';
            case OperationType.QUERY:
            case OperationType.DATA_ACCESS:
                return 'query';
            default:
                return 'entity';
        }
    }
    calculateLinkbackRisk(context) {
        let risk = 0.5; // Base risk
        // Higher risk for exports
        if (context.operation === OperationType.EXPORT) {
            risk += 0.3;
        }
        // Higher risk for federation attempts
        if (context.operation === OperationType.FEDERATION) {
            risk += 0.4;
        }
        // Higher risk if targeting specific production ID
        if (context.resourceId && context.resourceId.startsWith('prod_')) {
            risk += 0.2;
        }
        return Math.min(risk, 1.0);
    }
    logDecision(profile, context, decision) {
        if (decision.requiresAudit || !decision.allowed) {
            logger.info('Enforcement decision', {
                sandboxId: profile.id,
                userId: context.userId,
                operation: context.operation,
                allowed: decision.allowed,
                reason: decision.reason,
                code: decision.code,
            });
        }
    }
}
exports.SandboxEnforcer = SandboxEnforcer;
/**
 * Singleton instance
 */
let enforcerInstance = null;
function getSandboxEnforcer() {
    if (!enforcerInstance) {
        enforcerInstance = new SandboxEnforcer();
    }
    return enforcerInstance;
}
