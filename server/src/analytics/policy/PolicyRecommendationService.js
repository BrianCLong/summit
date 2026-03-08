"use strict";
/**
 * Policy Recommendation Service
 *
 * ML-powered policy recommendations based on usage patterns,
 * best practices, and security requirements.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC5.3 (Policy Review)
 *
 * @module analytics/policy/PolicyRecommendationService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRecommendationService = void 0;
exports.getPolicyRecommendationService = getPolicyRecommendationService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'policy-recommendation-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'PolicyRecommendationService',
    };
}
function calculatePriority(type, securityImpact, confidence) {
    if (securityImpact === 'high' && confidence >= 0.8) {
        return 'critical';
    }
    if (securityImpact === 'high' || (securityImpact === 'medium' && confidence >= 0.85)) {
        return 'high';
    }
    if (securityImpact === 'medium' || confidence >= 0.7) {
        return 'medium';
    }
    return 'low';
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    enableLeastPrivilege: true,
    unusedPermissionDays: 90,
    enableSoD: true,
    enableCompliance: true,
    minConfidence: 0.6,
    expirationDays: 30,
};
// ============================================================================
// Least Privilege Analyzer
// ============================================================================
class LeastPrivilegeAnalyzer {
    unusedThresholdDays;
    constructor(thresholdDays) {
        this.unusedThresholdDays = thresholdDays;
    }
    /**
     * Analyze for unused permissions
     */
    analyzeUnusedPermissions(patterns) {
        const unused = [];
        const now = Date.now();
        // Group by subject
        const bySubject = new Map();
        for (const pattern of patterns) {
            const existing = bySubject.get(pattern.subject) || [];
            existing.push(pattern);
            bySubject.set(pattern.subject, existing);
        }
        for (const [subject, subjectPatterns] of bySubject) {
            // Find patterns that haven't been used recently
            for (const pattern of subjectPatterns) {
                if (!pattern.isActive)
                    continue;
                const daysSinceUsed = pattern.lastAccess
                    ? Math.floor((now - pattern.lastAccess.getTime()) / (1000 * 60 * 60 * 24))
                    : Infinity;
                if (daysSinceUsed > this.unusedThresholdDays) {
                    unused.push({
                        subject,
                        resource: pattern.resource,
                        permission: pattern.action,
                        lastUsed: pattern.lastAccess || null,
                        daysSinceUsed,
                        riskIfRemoved: this.assessRemovalRisk(pattern, subjectPatterns),
                    });
                }
            }
        }
        return unused;
    }
    /**
     * Generate recommendations for unused permissions
     */
    generateRecommendations(tenantId, unused) {
        const recommendations = [];
        // Group by subject for consolidated recommendations
        const bySubject = new Map();
        for (const perm of unused) {
            const existing = bySubject.get(perm.subject) || [];
            existing.push(perm);
            bySubject.set(perm.subject, existing);
        }
        for (const [subject, permissions] of bySubject) {
            const lowRisk = permissions.filter(p => p.riskIfRemoved === 'low');
            const mediumRisk = permissions.filter(p => p.riskIfRemoved === 'medium');
            if (lowRisk.length > 0) {
                recommendations.push(this.createRecommendation(tenantId, subject, lowRisk, 0.9, 'low'));
            }
            if (mediumRisk.length > 0) {
                recommendations.push(this.createRecommendation(tenantId, subject, mediumRisk, 0.75, 'medium'));
            }
        }
        return recommendations;
    }
    assessRemovalRisk(pattern, allPatterns) {
        // High frequency usage suggests higher risk
        const avgFrequency = allPatterns.reduce((sum, p) => sum + p.frequency, 0) / allPatterns.length;
        if (pattern.frequency > avgFrequency * 2) {
            return 'high';
        }
        if (pattern.frequency > avgFrequency) {
            return 'medium';
        }
        return 'low';
    }
    createRecommendation(tenantId, subject, permissions, confidence, riskLevel) {
        const securityImpact = riskLevel === 'low' ? 'high' : 'medium'; // Removing unused = security improvement
        return {
            id: `rec-${(0, uuid_1.v4)()}`,
            tenantId,
            type: 'least_privilege',
            priority: calculatePriority('least_privilege', securityImpact, confidence),
            status: 'new',
            title: `Remove ${permissions.length} unused permission(s) for ${subject}`,
            description: `Subject "${subject}" has ${permissions.length} permission(s) that haven't been used in ${this.unusedThresholdDays}+ days`,
            rationale: [
                'Principle of least privilege recommends removing unused access',
                `${permissions.length} permission(s) not accessed in over ${this.unusedThresholdDays} days`,
                'Reduces attack surface and compliance risk',
            ],
            suggestedActions: permissions.map((perm, idx) => ({
                order: idx + 1,
                action: 'Remove permission',
                details: `Remove access to ${perm.resource} (${perm.permission})`,
                automated: riskLevel === 'low',
                ruleTemplate: {
                    name: `Revoke ${perm.permission} on ${perm.resource}`,
                    action: 'deny',
                    resource: perm.resource,
                    subjects: [subject],
                    priority: 10,
                },
            })),
            relatedPolicies: [],
            relatedResources: permissions.map(p => p.resource),
            estimatedEffort: permissions.length > 5 ? 'moderate' : 'minimal',
            securityImpact,
            complianceFrameworks: ['SOC2', 'ISO27001', 'NIST'],
            confidence,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Least privilege recommendation generated'),
        };
    }
}
// ============================================================================
// Separation of Duties Analyzer
// ============================================================================
class SoDAnalyzer {
    conflictingRoles = [
        ['admin', 'auditor'],
        ['developer', 'deployer'],
        ['requestor', 'approver'],
        ['data_owner', 'data_auditor'],
    ];
    /**
     * Check for separation of duties violations
     */
    analyzeViolations(patterns) {
        const violations = [];
        // Group by subject
        const bySubject = new Map();
        for (const pattern of patterns) {
            const existing = bySubject.get(pattern.subject) || [];
            existing.push(pattern);
            bySubject.set(pattern.subject, existing);
        }
        for (const [subject, subjectPatterns] of bySubject) {
            const resources = subjectPatterns.map(p => p.resource);
            for (const [role1, role2] of this.conflictingRoles) {
                const hasRole1 = resources.some(r => r.toLowerCase().includes(role1));
                const hasRole2 = resources.some(r => r.toLowerCase().includes(role2));
                if (hasRole1 && hasRole2) {
                    violations.push({
                        subject,
                        conflictingRoles: [role1, role2],
                        resources: resources.filter(r => r.toLowerCase().includes(role1) || r.toLowerCase().includes(role2)),
                        severity: this.assessSeverity(role1, role2),
                    });
                }
            }
        }
        return violations;
    }
    /**
     * Generate recommendations for SoD violations
     */
    generateRecommendations(tenantId, violations) {
        return violations.map(violation => ({
            id: `rec-${(0, uuid_1.v4)()}`,
            tenantId,
            type: 'separation_of_duties',
            priority: violation.severity === 'critical' ? 'critical' : 'high',
            status: 'new',
            title: `Separation of Duties violation: ${violation.subject}`,
            description: `Subject "${violation.subject}" has conflicting roles: ${violation.conflictingRoles.join(' and ')}`,
            rationale: [
                'Separation of duties is a key internal control',
                `Conflicting roles detected: ${violation.conflictingRoles.join(' vs ')}`,
                'Single user should not have both roles',
                'Required by SOC 2 CC5.1 and ISO 27001',
            ],
            suggestedActions: [
                {
                    order: 1,
                    action: 'Review access necessity',
                    details: 'Determine if both roles are required for this user',
                    automated: false,
                },
                {
                    order: 2,
                    action: 'Remove conflicting access',
                    details: `Remove either ${violation.conflictingRoles[0]} or ${violation.conflictingRoles[1]} access`,
                    automated: false,
                },
                {
                    order: 3,
                    action: 'Implement compensating control',
                    details: 'If both roles are required, implement additional approval workflow',
                    automated: false,
                },
            ],
            relatedPolicies: [],
            relatedResources: violation.resources,
            estimatedEffort: 'moderate',
            securityImpact: 'high',
            complianceFrameworks: ['SOC2', 'ISO27001', 'PCI-DSS'],
            confidence: 0.95,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            createdAt: new Date().toISOString(),
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, `SoD violation detected: ${violation.severity}`),
        }));
    }
    assessSeverity(role1, role2) {
        const criticalPairs = [['admin', 'auditor'], ['requestor', 'approver']];
        for (const [r1, r2] of criticalPairs) {
            if ((role1 === r1 && role2 === r2) || (role1 === r2 && role2 === r1)) {
                return 'critical';
            }
        }
        return 'high';
    }
}
// ============================================================================
// Security Best Practices Analyzer
// ============================================================================
class SecurityBestPracticesAnalyzer {
    /**
     * Identify high-risk access patterns
     */
    identifyHighRiskAccess(patterns) {
        const highRisk = [];
        for (const pattern of patterns) {
            const riskFactors = [];
            // Check for wildcard access
            if (pattern.resource === '*' || pattern.subject === '*') {
                riskFactors.push('Wildcard access pattern');
            }
            // Check for sensitive resources
            if (this.isSensitiveResource(pattern.resource)) {
                riskFactors.push('Access to sensitive resource');
            }
            // Check for admin/write access
            if (pattern.action === 'admin' || pattern.action === 'write' || pattern.action === 'delete') {
                riskFactors.push(`${pattern.action} permission on resource`);
            }
            // Check for high frequency access
            if (pattern.frequency > 1000) {
                riskFactors.push('High frequency access pattern');
            }
            if (riskFactors.length >= 2) {
                highRisk.push({
                    subject: pattern.subject,
                    resource: pattern.resource,
                    riskLevel: riskFactors.length >= 3 ? 'critical' : 'high',
                    riskFactors,
                    mitigationSuggestion: this.suggestMitigation(riskFactors),
                });
            }
        }
        return highRisk;
    }
    /**
     * Generate security enhancement recommendations
     */
    generateRecommendations(tenantId, highRisk) {
        return highRisk.map(risk => ({
            id: `rec-${(0, uuid_1.v4)()}`,
            tenantId,
            type: 'security_enhancement',
            priority: risk.riskLevel === 'critical' ? 'critical' : 'high',
            status: 'new',
            title: `High-risk access pattern: ${risk.subject} → ${risk.resource}`,
            description: `Detected ${risk.riskFactors.length} risk factor(s) for this access pattern`,
            rationale: risk.riskFactors,
            suggestedActions: [
                {
                    order: 1,
                    action: 'Review access necessity',
                    details: 'Confirm this access pattern is required for business operations',
                    automated: false,
                },
                {
                    order: 2,
                    action: risk.mitigationSuggestion,
                    details: 'Implement recommended security control',
                    automated: false,
                },
                {
                    order: 3,
                    action: 'Add monitoring',
                    details: 'Enable enhanced logging for this access pattern',
                    automated: true,
                },
            ],
            relatedPolicies: [],
            relatedResources: [risk.resource],
            estimatedEffort: 'moderate',
            securityImpact: 'high',
            complianceFrameworks: ['SOC2', 'ISO27001', 'NIST'],
            confidence: 0.85,
            createdAt: new Date().toISOString(),
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, `High-risk access pattern: ${risk.riskLevel}`),
        }));
    }
    isSensitiveResource(resource) {
        const sensitivePatterns = [
            'admin', 'audit', 'security', 'compliance',
            'secret', 'credential', 'key', 'token',
            'user', 'identity', 'auth',
        ];
        return sensitivePatterns.some(pattern => resource.toLowerCase().includes(pattern));
    }
    suggestMitigation(riskFactors) {
        if (riskFactors.includes('Wildcard access pattern')) {
            return 'Replace wildcard with specific resource patterns';
        }
        if (riskFactors.includes('Access to sensitive resource')) {
            return 'Add additional approval workflow for sensitive access';
        }
        if (riskFactors.some(f => f.includes('admin') || f.includes('delete'))) {
            return 'Implement time-limited privileged access';
        }
        return 'Add monitoring and alerting for this access pattern';
    }
}
// ============================================================================
// Policy Recommendation Service
// ============================================================================
class PolicyRecommendationService extends events_1.EventEmitter {
    config;
    leastPrivilegeAnalyzer;
    sodAnalyzer;
    securityAnalyzer;
    recommendations = new Map();
    stats;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.leastPrivilegeAnalyzer = new LeastPrivilegeAnalyzer(this.config.unusedPermissionDays);
        this.sodAnalyzer = new SoDAnalyzer();
        this.securityAnalyzer = new SecurityBestPracticesAnalyzer();
        this.stats = {
            totalGenerated: 0,
            byType: {
                security_enhancement: 0,
                least_privilege: 0,
                separation_of_duties: 0,
                access_review: 0,
                policy_standardization: 0,
                compliance_alignment: 0,
                performance_improvement: 0,
            },
            byPriority: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
            },
            implemented: 0,
            dismissed: 0,
            averageTimeToImplement: 0,
            lastGeneratedAt: null,
        };
        logger_js_1.default.info({ config: this.config }, 'PolicyRecommendationService initialized');
    }
    /**
     * Generate recommendations based on usage analysis
     */
    async generateRecommendations(analysis) {
        const allRecommendations = [];
        // Least privilege analysis
        if (this.config.enableLeastPrivilege) {
            const unusedPerms = this.leastPrivilegeAnalyzer.analyzeUnusedPermissions(analysis.accessPatterns);
            const lpRecs = this.leastPrivilegeAnalyzer.generateRecommendations(analysis.tenantId, unusedPerms);
            allRecommendations.push(...lpRecs);
        }
        // Separation of duties analysis
        if (this.config.enableSoD) {
            const violations = this.sodAnalyzer.analyzeViolations(analysis.accessPatterns);
            const sodRecs = this.sodAnalyzer.generateRecommendations(analysis.tenantId, violations);
            allRecommendations.push(...sodRecs);
        }
        // Security best practices
        const highRisk = this.securityAnalyzer.identifyHighRiskAccess(analysis.accessPatterns);
        const secRecs = this.securityAnalyzer.generateRecommendations(analysis.tenantId, highRisk);
        allRecommendations.push(...secRecs);
        // Filter by minimum confidence
        const filteredRecs = allRecommendations.filter(r => r.confidence >= this.config.minConfidence);
        // Store recommendations
        const existing = this.recommendations.get(analysis.tenantId) || [];
        this.recommendations.set(analysis.tenantId, [...existing, ...filteredRecs]);
        // Update stats
        this.updateStats(filteredRecs);
        // Emit events for critical recommendations
        for (const rec of filteredRecs) {
            if (rec.priority === 'critical') {
                this.emit('recommendation:critical', rec);
            }
        }
        logger_js_1.default.info({
            tenantId: analysis.tenantId,
            recommendationsGenerated: filteredRecs.length,
            byType: this.groupByType(filteredRecs),
        }, 'Recommendations generated');
        return (0, data_envelope_js_1.createDataEnvelope)(filteredRecs, {
            source: 'PolicyRecommendationService',
            governanceVerdict: createVerdict(filteredRecs.some(r => r.priority === 'critical')
                ? data_envelope_js_1.GovernanceResult.FLAG
                : data_envelope_js_1.GovernanceResult.ALLOW, `Generated ${filteredRecs.length} recommendations`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get recommendations for a tenant
     */
    getRecommendations(tenantId, filters) {
        let recommendations = this.recommendations.get(tenantId) || [];
        if (filters?.type) {
            recommendations = recommendations.filter(r => r.type === filters.type);
        }
        if (filters?.priority) {
            recommendations = recommendations.filter(r => r.priority === filters.priority);
        }
        if (filters?.status) {
            recommendations = recommendations.filter(r => r.status === filters.status);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(recommendations, {
            source: 'PolicyRecommendationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Recommendations retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Update recommendation status
     */
    updateStatus(tenantId, recommendationId, status) {
        const recommendations = this.recommendations.get(tenantId) || [];
        const recommendation = recommendations.find(r => r.id === recommendationId);
        if (!recommendation) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PolicyRecommendationService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Recommendation not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        recommendation.status = status;
        if (status === 'acknowledged') {
            recommendation.acknowledgedAt = new Date().toISOString();
        }
        else if (status === 'implemented') {
            recommendation.implementedAt = new Date().toISOString();
            this.stats.implemented++;
            // Calculate time to implement
            if (recommendation.acknowledgedAt) {
                const acknowledgedTime = new Date(recommendation.acknowledgedAt).getTime();
                const implementedTime = new Date(recommendation.implementedAt).getTime();
                const timeToImplement = (implementedTime - acknowledgedTime) / (1000 * 60 * 60); // hours
                this.updateAverageTimeToImplement(timeToImplement);
            }
        }
        else if (status === 'dismissed') {
            this.stats.dismissed++;
        }
        logger_js_1.default.info({ recommendationId, tenantId, status }, 'Recommendation status updated');
        return (0, data_envelope_js_1.createDataEnvelope)(recommendation, {
            source: 'PolicyRecommendationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Status updated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get recommendation statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'PolicyRecommendationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clean up expired recommendations
     */
    cleanupExpired() {
        let removed = 0;
        for (const [tenantId, recs] of this.recommendations) {
            const now = Date.now();
            const valid = recs.filter(r => {
                if (!r.expiresAt)
                    return true;
                if (r.status === 'implemented' || r.status === 'dismissed')
                    return false;
                return new Date(r.expiresAt).getTime() > now;
            });
            removed += recs.length - valid.length;
            this.recommendations.set(tenantId, valid);
        }
        if (removed > 0) {
            logger_js_1.default.info({ removedCount: removed }, 'Expired recommendations cleaned up');
        }
        return removed;
    }
    /**
     * Clear tenant data
     */
    clearTenant(tenantId) {
        this.recommendations.delete(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant data cleared from recommendation service');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    updateStats(recommendations) {
        this.stats.totalGenerated += recommendations.length;
        this.stats.lastGeneratedAt = new Date().toISOString();
        for (const rec of recommendations) {
            this.stats.byType[rec.type]++;
            this.stats.byPriority[rec.priority]++;
        }
    }
    groupByType(recommendations) {
        const byType = {};
        for (const rec of recommendations) {
            byType[rec.type] = (byType[rec.type] || 0) + 1;
        }
        return byType;
    }
    updateAverageTimeToImplement(newTime) {
        const n = this.stats.implemented;
        this.stats.averageTimeToImplement =
            ((this.stats.averageTimeToImplement * (n - 1)) + newTime) / n;
    }
}
exports.PolicyRecommendationService = PolicyRecommendationService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getPolicyRecommendationService(config) {
    if (!instance) {
        instance = new PolicyRecommendationService(config);
    }
    return instance;
}
exports.default = PolicyRecommendationService;
