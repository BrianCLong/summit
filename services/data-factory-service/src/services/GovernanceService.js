"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Governance Service
 *
 * Enforces policy guardrails, checks training eligibility, and applies redaction rules.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceService = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'governance-service' });
const POLICY_VERSION = '1.0.0';
class GovernanceService {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    // ============================================================================
    // Policy Profile Management
    // ============================================================================
    async getPolicyProfile(profileId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM policy_profiles WHERE profile_id = $1', [profileId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            profileId: row.profile_id,
            profileName: row.profile_name,
            allowedUseCases: JSON.parse(row.allowed_use_cases),
            prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
            requiredRedactions: JSON.parse(row.required_redactions),
            piiHandling: row.pii_handling,
            sensitivityLevel: row.sensitivity_level,
            auditLevel: row.audit_level,
        };
    }
    async listPolicyProfiles() {
        const result = await (0, connection_js_1.query)('SELECT * FROM policy_profiles ORDER BY profile_name');
        return result.rows.map((row) => ({
            profileId: row.profile_id,
            profileName: row.profile_name,
            allowedUseCases: JSON.parse(row.allowed_use_cases),
            prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
            requiredRedactions: JSON.parse(row.required_redactions),
            piiHandling: row.pii_handling,
            sensitivityLevel: row.sensitivity_level,
            auditLevel: row.audit_level,
        }));
    }
    async createPolicyProfile(profile, createdBy) {
        const profileId = profile.profileId || (0, uuid_1.v4)();
        await (0, connection_js_1.query)(`INSERT INTO policy_profiles (
        profile_id, profile_name, allowed_use_cases, prohibited_use_cases,
        required_redactions, pii_handling, sensitivity_level, audit_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            profileId,
            profile.profileName,
            JSON.stringify(profile.allowedUseCases),
            JSON.stringify(profile.prohibitedUseCases),
            JSON.stringify(profile.requiredRedactions),
            profile.piiHandling,
            profile.sensitivityLevel,
            profile.auditLevel,
        ]);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: profileId,
            action: 'create_policy_profile',
            actorId: createdBy,
            actorRole: 'admin',
            newState: profile,
            metadata: {},
        });
        logger.info({ profileId }, 'Policy profile created');
        return { ...profile, profileId };
    }
    // ============================================================================
    // Governance Checks
    // ============================================================================
    async checkSampleEligibility(sample, dataset, useCase, checkedBy) {
        const violations = [];
        const requiredActions = [];
        const policy = dataset.policyProfile;
        // Check use case
        if (policy.prohibitedUseCases.includes(useCase)) {
            violations.push({
                code: 'PROHIBITED_USE_CASE',
                severity: 'critical',
                message: `Use case '${useCase}' is prohibited by policy`,
                remediation: 'Select a different use case or obtain special authorization',
            });
        }
        if (policy.allowedUseCases.length > 0 &&
            !policy.allowedUseCases.includes(useCase)) {
            violations.push({
                code: 'USE_CASE_NOT_ALLOWED',
                severity: 'high',
                message: `Use case '${useCase}' is not in the allowed list`,
                remediation: 'Request policy update or use an approved use case',
            });
        }
        // Check license restrictions
        if (!dataset.license.commercialUseAllowed &&
            useCase.includes('commercial')) {
            violations.push({
                code: 'LICENSE_VIOLATION',
                severity: 'critical',
                message: 'Commercial use not allowed by license',
                remediation: 'Use only for non-commercial purposes',
            });
        }
        if (dataset.license.expirationDate) {
            const expirationDate = new Date(dataset.license.expirationDate);
            if (expirationDate < new Date()) {
                violations.push({
                    code: 'LICENSE_EXPIRED',
                    severity: 'critical',
                    message: 'Dataset license has expired',
                    remediation: 'Renew license or remove dataset from use',
                });
            }
        }
        // Check jurisdiction restrictions
        if (dataset.jurisdiction.exportRestrictions.length > 0) {
            requiredActions.push('Verify export compliance before use');
        }
        if (dataset.jurisdiction.dataLocalizationRequired) {
            requiredActions.push('Ensure data remains in required jurisdiction');
        }
        // Check PII handling requirements
        if (policy.piiHandling !== 'allow') {
            const piiFields = this.detectPII(sample);
            if (piiFields.length > 0) {
                if (policy.piiHandling === 'remove') {
                    violations.push({
                        code: 'PII_REQUIRES_REMOVAL',
                        severity: 'high',
                        message: `PII detected in fields: ${piiFields.join(', ')}`,
                        remediation: 'Apply PII removal before export',
                    });
                    requiredActions.push('Remove PII before training use');
                }
                else if (policy.piiHandling === 'mask') {
                    requiredActions.push('Apply PII masking before training use');
                }
                else if (policy.piiHandling === 'encrypt') {
                    requiredActions.push('Apply PII encryption before training use');
                }
            }
        }
        // Check required redactions
        for (const redactionType of policy.requiredRedactions) {
            requiredActions.push(`Apply ${redactionType} redaction`);
        }
        // Check sensitivity level restrictions
        if (policy.sensitivityLevel === 'restricted' ||
            policy.sensitivityLevel === 'confidential') {
            requiredActions.push('Obtain explicit authorization for training use');
        }
        const eligible = violations.filter((v) => v.severity === 'critical').length === 0;
        // Save governance check
        const checkId = (0, uuid_1.v4)();
        await (0, connection_js_1.query)(`INSERT INTO governance_checks (
        id, sample_id, dataset_id, check_type, passed, violations, policy_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            checkId,
            sample.id,
            dataset.id,
            'eligibility',
            eligible,
            JSON.stringify(violations),
            POLICY_VERSION,
        ]);
        await this.auditService.log({
            entityType: 'sample',
            entityId: sample.id,
            action: 'eligibility_check',
            actorId: checkedBy,
            actorRole: 'system',
            metadata: { eligible, violationCount: violations.length, useCase },
        });
        return {
            eligible,
            reasons: violations.map((v) => v.message),
            requiredActions,
            policyVersion: POLICY_VERSION,
            checkedAt: new Date(),
        };
    }
    async checkDatasetEligibility(dataset, useCase, checkedBy) {
        const violations = [];
        const requiredActions = [];
        const policy = dataset.policyProfile;
        // Check use case
        if (policy.prohibitedUseCases.includes(useCase)) {
            violations.push({
                code: 'PROHIBITED_USE_CASE',
                severity: 'critical',
                message: `Use case '${useCase}' is prohibited by policy`,
            });
        }
        if (policy.allowedUseCases.length > 0 &&
            !policy.allowedUseCases.includes(useCase)) {
            violations.push({
                code: 'USE_CASE_NOT_ALLOWED',
                severity: 'high',
                message: `Use case '${useCase}' is not in the allowed list`,
            });
        }
        // Check dataset status
        if (dataset.status !== 'active') {
            violations.push({
                code: 'DATASET_NOT_ACTIVE',
                severity: 'high',
                message: `Dataset status is '${dataset.status}', must be 'active'`,
            });
        }
        // Check labeling completeness
        if (dataset.labeledSampleCount < dataset.sampleCount * 0.8) {
            violations.push({
                code: 'INSUFFICIENT_LABELS',
                severity: 'medium',
                message: 'Less than 80% of samples are labeled',
                remediation: 'Complete labeling before export',
            });
        }
        // Check quality metrics
        if (dataset.qualityMetrics.interAnnotatorAgreement &&
            dataset.qualityMetrics.interAnnotatorAgreement < 0.7) {
            violations.push({
                code: 'LOW_AGREEMENT',
                severity: 'medium',
                message: 'Inter-annotator agreement below 70%',
                remediation: 'Review and resolve labeling disagreements',
            });
        }
        const eligible = violations.filter((v) => v.severity === 'critical').length === 0;
        await this.auditService.log({
            entityType: 'dataset',
            entityId: dataset.id,
            action: 'eligibility_check',
            actorId: checkedBy,
            actorRole: 'system',
            metadata: { eligible, violationCount: violations.length, useCase },
        });
        return {
            eligible,
            reasons: violations.map((v) => v.message),
            requiredActions,
            policyVersion: POLICY_VERSION,
            checkedAt: new Date(),
        };
    }
    async getGovernanceHistory(entityType, entityId) {
        const column = entityType === 'sample' ? 'sample_id' : 'dataset_id';
        const result = await (0, connection_js_1.query)(`SELECT * FROM governance_checks WHERE ${column} = $1 ORDER BY checked_at DESC`, [entityId]);
        return result.rows.map((row) => ({
            sampleId: row.sample_id,
            datasetId: row.dataset_id,
            checkType: row.check_type,
            passed: row.passed,
            violations: JSON.parse(row.violations),
            checkedAt: row.checked_at,
            policyVersion: row.policy_version,
        }));
    }
    // ============================================================================
    // Redaction
    // ============================================================================
    async applyRedaction(content, rules) {
        let redactedContent = JSON.parse(JSON.stringify(content));
        for (const rule of rules) {
            redactedContent = this.applyRedactionRule(redactedContent, rule);
        }
        return redactedContent;
    }
    async getRedactionRulesForPolicy(profileId) {
        const policy = await this.getPolicyProfile(profileId);
        if (!policy) {
            return [];
        }
        const rules = [];
        // Add rules based on required redactions
        for (const redactionType of policy.requiredRedactions) {
            rules.push(...this.getRedactionRulesForType(redactionType));
        }
        // Add PII rules based on handling policy
        if (policy.piiHandling !== 'allow') {
            rules.push(...this.getPIIRedactionRules(policy.piiHandling));
        }
        return rules;
    }
    applyRedactionRule(content, rule) {
        const pathParts = rule.fieldPath.split('.');
        let current = content;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (current[part] && typeof current[part] === 'object') {
                current = current[part];
            }
            else {
                return content; // Path doesn't exist
            }
        }
        const finalKey = pathParts[pathParts.length - 1];
        if (finalKey in current) {
            switch (rule.redactionType) {
                case 'remove':
                    delete current[finalKey];
                    break;
                case 'mask':
                    if (typeof current[finalKey] === 'string') {
                        current[finalKey] = this.maskValue(current[finalKey], rule.pattern, rule.replacement);
                    }
                    break;
                case 'hash':
                    if (typeof current[finalKey] === 'string') {
                        current[finalKey] = this.hashValue(current[finalKey]);
                    }
                    break;
                case 'generalize':
                    if (typeof current[finalKey] === 'string') {
                        current[finalKey] = rule.replacement || '[REDACTED]';
                    }
                    break;
            }
        }
        return content;
    }
    maskValue(value, pattern, replacement) {
        if (pattern) {
            return value.replace(new RegExp(pattern, 'g'), replacement || '***');
        }
        // Default masking: show first and last character
        if (value.length <= 2) {
            return '***';
        }
        return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
    }
    hashValue(value) {
        // Simple hash for demonstration - in production use proper crypto
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            const char = value.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return `HASH:${Math.abs(hash).toString(16)}`;
    }
    detectPII(sample) {
        const piiFields = [];
        const content = sample.content;
        // Check for common PII patterns
        const piiPatterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
            phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
            ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
            creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/,
        };
        const checkValue = (value, path) => {
            if (typeof value === 'string') {
                for (const [piiType, pattern] of Object.entries(piiPatterns)) {
                    if (pattern.test(value)) {
                        piiFields.push(`${path} (${piiType})`);
                    }
                }
            }
            else if (typeof value === 'object' && value !== null) {
                for (const [key, val] of Object.entries(value)) {
                    checkValue(val, `${path}.${key}`);
                }
            }
        };
        checkValue(content, 'content');
        return piiFields;
    }
    getRedactionRulesForType(redactionType) {
        const rulesByType = {
            ssn: [
                {
                    id: (0, uuid_1.v4)(),
                    fieldPath: '*',
                    redactionType: 'mask',
                    pattern: '\\b\\d{3}[-.]?\\d{2}[-.]?\\d{4}\\b',
                    replacement: '***-**-****',
                },
            ],
            credit_card: [
                {
                    id: (0, uuid_1.v4)(),
                    fieldPath: '*',
                    redactionType: 'mask',
                    pattern: '\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b',
                    replacement: '****-****-****-****',
                },
            ],
            phone: [
                {
                    id: (0, uuid_1.v4)(),
                    fieldPath: '*',
                    redactionType: 'mask',
                    pattern: '\\b(\\+?1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b',
                    replacement: '(***) ***-****',
                },
            ],
            email: [
                {
                    id: (0, uuid_1.v4)(),
                    fieldPath: '*',
                    redactionType: 'mask',
                    pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
                    replacement: '***@***.***',
                },
            ],
        };
        return rulesByType[redactionType] || [];
    }
    getPIIRedactionRules(handling) {
        const redactionType = handling === 'remove' ? 'remove' : handling === 'mask' ? 'mask' : 'hash';
        return [
            ...this.getRedactionRulesForType('ssn').map((r) => ({
                ...r,
                redactionType,
            })),
            ...this.getRedactionRulesForType('credit_card').map((r) => ({
                ...r,
                redactionType,
            })),
            ...this.getRedactionRulesForType('phone').map((r) => ({
                ...r,
                redactionType,
            })),
            ...this.getRedactionRulesForType('email').map((r) => ({
                ...r,
                redactionType,
            })),
        ];
    }
}
exports.GovernanceService = GovernanceService;
