"use strict";
/**
 * GovernanceClient - Client for interacting with Governance/Retention services
 * Handles policy checks, legal holds, and compliance requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceClient = void 0;
class GovernanceClient {
    baseUrl;
    logger;
    constructor(baseUrl, logger) {
        this.baseUrl = baseUrl;
        this.logger = logger.child({ client: 'GovernanceClient' });
    }
    /**
     * Check export permissions for a set of evidence items
     */
    async checkExportPermissions(caseId, itemIds, userId) {
        try {
            const response = await fetch(`${this.baseUrl}/governance/export-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseId, itemIds, userId }),
            });
            if (response.ok) {
                return await response.json();
            }
            // Handle blocked responses
            if (response.status === 403) {
                const data = await response.json();
                return {
                    allowed: false,
                    blocked: true,
                    reason: data.reason,
                    warnings: [],
                    requiredRedactions: [],
                    requiredApprovals: 0,
                };
            }
            // Default to allowing with warning in development
            if (process.env.NODE_ENV === 'development') {
                return {
                    allowed: true,
                    blocked: false,
                    warnings: ['Governance service unavailable - operating in permissive mode'],
                    requiredRedactions: [],
                    requiredApprovals: 1,
                };
            }
            return {
                allowed: false,
                blocked: true,
                reason: 'Governance service unavailable',
                warnings: [],
                requiredRedactions: [],
                requiredApprovals: 0,
            };
        }
        catch (err) {
            this.logger.warn({ err, caseId }, 'Failed to check export permissions');
            // Development fallback
            if (process.env.NODE_ENV === 'development') {
                return {
                    allowed: true,
                    blocked: false,
                    warnings: ['Governance service unavailable - operating in permissive mode'],
                    requiredRedactions: [],
                    requiredApprovals: 1,
                };
            }
            return {
                allowed: false,
                blocked: true,
                reason: 'Service unavailable',
                warnings: [],
                requiredRedactions: [],
                requiredApprovals: 0,
            };
        }
    }
    /**
     * Get legal holds for a case
     */
    async getLegalHolds(caseId) {
        try {
            const response = await fetch(`${this.baseUrl}/governance/legal-holds?caseId=${caseId}`);
            if (response.ok) {
                return await response.json();
            }
            return [];
        }
        catch (err) {
            this.logger.warn({ err, caseId }, 'Failed to get legal holds');
            return [];
        }
    }
    /**
     * Get retention policy for items
     */
    async getRetentionPolicy(itemIds) {
        try {
            const response = await fetch(`${this.baseUrl}/governance/retention-policy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds }),
            });
            if (response.ok) {
                return await response.json();
            }
            return null;
        }
        catch (err) {
            this.logger.warn({ err }, 'Failed to get retention policy');
            return null;
        }
    }
    /**
     * Check if four-eyes approval is required
     */
    async checkFourEyesRequirement(classificationLevel, hasLegalHold, sensitivityMarkings) {
        try {
            const response = await fetch(`${this.baseUrl}/governance/four-eyes-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classificationLevel,
                    hasLegalHold,
                    sensitivityMarkings,
                }),
            });
            if (response.ok) {
                return await response.json();
            }
            // Default rules
            return this.getDefaultFourEyesConfig(classificationLevel, hasLegalHold);
        }
        catch (err) {
            this.logger.warn({ err }, 'Failed to check four-eyes requirement');
            return this.getDefaultFourEyesConfig(classificationLevel, hasLegalHold);
        }
    }
    /**
     * Apply redactions based on governance policies
     */
    async applyRedactions(data, rules) {
        const log = [];
        const redactedData = data.map((item) => {
            const clone = JSON.parse(JSON.stringify(item));
            for (const rule of rules) {
                if (Object.prototype.hasOwnProperty.call(clone, rule.field)) {
                    const entry = {
                        timestamp: new Date().toISOString(),
                        field: rule.field,
                        action: rule.action,
                        reason: rule.reason,
                        authorizedBy: 'governance-policy',
                    };
                    if (rule.action === 'redact' || rule.action === 'mask') {
                        clone[rule.field] = '[REDACTED]';
                    }
                    else if (rule.action === 'remove') {
                        delete clone[rule.field];
                    }
                    log.push(entry);
                }
            }
            return clone;
        });
        return { data: redactedData, log };
    }
    /**
     * Validate classification level meets requirements
     */
    async validateClassification(requestedLevel, itemClassifications) {
        const levelOrder = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'SCI'];
        const requestedIndex = levelOrder.indexOf(requestedLevel);
        const errors = [];
        let minimumRequired = 'UNCLASSIFIED';
        for (const level of itemClassifications) {
            const itemIndex = levelOrder.indexOf(level);
            if (itemIndex > levelOrder.indexOf(minimumRequired)) {
                minimumRequired = level;
            }
            if (itemIndex > requestedIndex) {
                errors.push(`Item requires ${level} classification, but bundle is ${requestedLevel}`);
            }
        }
        return {
            valid: errors.length === 0,
            minimumRequired,
            errors,
        };
    }
    /**
     * Record governance action in audit log
     */
    async recordGovernanceAction(action, entityType, entityId, userId, details) {
        try {
            await fetch(`${this.baseUrl}/governance/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    entityType,
                    entityId,
                    userId,
                    details,
                    timestamp: new Date().toISOString(),
                }),
            });
        }
        catch (err) {
            this.logger.error({ err, action, entityId }, 'Failed to record governance action');
        }
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    getDefaultFourEyesConfig(classificationLevel, hasLegalHold) {
        // Four-eyes required for high classification or legal hold items
        const highClassificationLevels = ['SECRET', 'TOP_SECRET', 'SCI'];
        const required = hasLegalHold || highClassificationLevels.includes(classificationLevel);
        return {
            required,
            approverRoles: required ? ['supervisor', 'compliance_officer'] : [],
            escalationTimeoutMinutes: 60,
        };
    }
}
exports.GovernanceClient = GovernanceClient;
