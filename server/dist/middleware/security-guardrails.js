import { ForbiddenError, UserInputError } from 'apollo-server-express';
import { Logger } from '../config/logger';
const logger = Logger.getLogger('security-guardrails');
// Security classification levels
export var SecurityClassification;
(function (SecurityClassification) {
    SecurityClassification["PUBLIC"] = "public";
    SecurityClassification["INTERNAL"] = "internal";
    SecurityClassification["CONFIDENTIAL"] = "confidential";
    SecurityClassification["RESTRICTED"] = "restricted";
    SecurityClassification["TOP_SECRET"] = "top_secret";
})(SecurityClassification || (SecurityClassification = {}));
// Legal compliance frameworks
export var ComplianceFramework;
(function (ComplianceFramework) {
    ComplianceFramework["GDPR"] = "gdpr";
    ComplianceFramework["CCPA"] = "ccpa";
    ComplianceFramework["HIPAA"] = "hipaa";
    ComplianceFramework["SOX"] = "sox";
    ComplianceFramework["ITAR"] = "itar";
    ComplianceFramework["EAR"] = "ear";
    ComplianceFramework["FIPS_140"] = "fips_140";
    ComplianceFramework["COMMON_CRITERIA"] = "common_criteria";
})(ComplianceFramework || (ComplianceFramework = {}));
// OSINT collection legal basis
export var OSINTLegalBasis;
(function (OSINTLegalBasis) {
    OSINTLegalBasis["PUBLIC_DOMAIN"] = "public_domain";
    OSINTLegalBasis["LEGITIMATE_INTEREST"] = "legitimate_interest";
    OSINTLegalBasis["CONSENT"] = "consent";
    OSINTLegalBasis["LEGAL_OBLIGATION"] = "legal_obligation";
    OSINTLegalBasis["VITAL_INTERESTS"] = "vital_interests";
    OSINTLegalBasis["PUBLIC_TASK"] = "public_task";
})(OSINTLegalBasis || (OSINTLegalBasis = {}));
// Crypto operation risk levels
export var CryptoRiskLevel;
(function (CryptoRiskLevel) {
    CryptoRiskLevel["LOW"] = "low";
    CryptoRiskLevel["MEDIUM"] = "medium";
    CryptoRiskLevel["HIGH"] = "high";
    CryptoRiskLevel["CRITICAL"] = "critical";
})(CryptoRiskLevel || (CryptoRiskLevel = {}));
const RATE_LIMITS = {
    'osint:collection': { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1000/hour
    'osint:social_media': { windowMs: 15 * 60 * 1000, maxRequests: 300 }, // 300/15min
    'osint:search_engine': { windowMs: 60 * 60 * 1000, maxRequests: 500 }, // 500/hour
    'osint:dark_web': { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50/hour - restricted
    'crypto:analysis': { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100/hour
    'crypto:key_recovery': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 10 }, // 10/day
    'crypto:export': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 5 }, // 5/day
};
// RBAC permission matrix for sensitive operations
const SENSITIVE_OPERATION_PERMISSIONS = {
    // OSINT operations
    'osint:dark_web_access': ['senior_analyst', 'investigator', 'admin'],
    'osint:social_media_scraping': ['analyst', 'investigator', 'admin'],
    'osint:personal_data_collection': ['investigator', 'admin'],
    'osint:export_control_sources': ['senior_analyst', 'admin'],
    // Crypto operations
    'crypto:key_recovery': ['crypto_analyst', 'senior_analyst', 'admin'],
    'crypto:plaintext_access': ['crypto_analyst', 'admin'],
    'crypto:export_controlled': ['admin'],
    'crypto:hsm_operations': ['crypto_analyst', 'admin'],
    'crypto:vulnerability_research': ['senior_analyst', 'admin'],
};
// Legal compliance checks
export class LegalComplianceValidator {
    static EXPORT_CONTROLLED_COUNTRIES = [
        'IR', 'KP', 'SY', 'CU', 'RU' // Iran, North Korea, Syria, Cuba, Russia (example)
    ];
    static SENSITIVE_PERSONAL_DATA_FIELDS = [
        'ssn', 'national_id', 'passport', 'credit_card', 'bank_account',
        'medical_record', 'biometric', 'genetic', 'political_opinion',
        'religious_belief', 'trade_union', 'sexual_orientation'
    ];
    static async validateOSINTCollection(operation, user, tenantId, db) {
        const reasons = [];
        const restrictions = [];
        let allowed = true;
        // Check if operation involves personal data
        if (operation.data_types?.some((type) => this.SENSITIVE_PERSONAL_DATA_FIELDS.includes(type.toLowerCase()))) {
            // Require legal basis for personal data collection
            if (!operation.legal_basis || !Object.values(OSINTLegalBasis).includes(operation.legal_basis)) {
                allowed = false;
                reasons.push('Personal data collection requires valid legal basis');
            }
            // Check GDPR compliance for EU data subjects
            if (operation.target_region?.includes('EU') &&
                operation.legal_basis !== OSINTLegalBasis.CONSENT &&
                operation.legal_basis !== OSINTLegalBasis.LEGITIMATE_INTEREST) {
                restrictions.push('GDPR: Requires consent or legitimate interest for EU data subjects');
            }
        }
        // Check geographic restrictions
        if (operation.target_countries?.some((country) => this.EXPORT_CONTROLLED_COUNTRIES.includes(country))) {
            if (!user.clearance_level || user.clearance_level < 3) {
                allowed = false;
                reasons.push('Export controlled country access requires security clearance');
            }
            restrictions.push('Export control restrictions apply');
        }
        // Check source legitimacy
        if (operation.source_type === 'dark_web' || operation.source_type === 'underground_forum') {
            restrictions.push('Dark web/underground sources require additional legal review');
            // Log high-risk operation
            logger.warn('High-risk OSINT operation requested', {
                userId: user.id,
                tenantId,
                sourceType: operation.source_type,
                targetCountries: operation.target_countries
            });
        }
        // Rate limiting check
        const rateLimitKey = `osint:${operation.source_type || 'collection'}`;
        const rateLimit = RATE_LIMITS[rateLimitKey] || RATE_LIMITS['osint:collection'];
        const rateLimitQuery = `
      SELECT COUNT(*) as request_count
      FROM osint_audit_log 
      WHERE user_id = $1 AND tenant_id = $2 
      AND created_at > NOW() - INTERVAL '${rateLimit.windowMs}ms'
    `;
        const rateLimitResult = await db.query(rateLimitQuery, [user.id, tenantId]);
        const requestCount = parseInt(rateLimitResult.rows[0]?.request_count || '0');
        if (requestCount >= rateLimit.maxRequests) {
            allowed = false;
            reasons.push(`Rate limit exceeded: ${requestCount}/${rateLimit.maxRequests} requests`);
        }
        return { allowed, reasons, restrictions };
    }
    static async validateCryptoOperation(operation, user, tenantId, db) {
        const reasons = [];
        const restrictions = [];
        let allowed = true;
        let approvalRequired = false;
        let riskLevel = CryptoRiskLevel.LOW;
        // Assess risk level based on operation type
        switch (operation.type) {
            case 'key_recovery':
                riskLevel = CryptoRiskLevel.CRITICAL;
                approvalRequired = true;
                break;
            case 'plaintext_access':
                riskLevel = CryptoRiskLevel.HIGH;
                approvalRequired = true;
                break;
            case 'vulnerability_research':
                riskLevel = CryptoRiskLevel.HIGH;
                break;
            case 'certificate_analysis':
                riskLevel = CryptoRiskLevel.MEDIUM;
                break;
            default:
                riskLevel = CryptoRiskLevel.LOW;
        }
        // Check export control restrictions
        if (operation.algorithm_strength > 128 || operation.key_size > 2048) {
            restrictions.push('Strong cryptography subject to export controls (EAR/ITAR)');
            // Check user's export control clearance
            if (!user.export_control_cleared) {
                allowed = false;
                reasons.push('Export controlled cryptography requires clearance');
            }
        }
        // Dual-use technology restrictions
        if (operation.type === 'vulnerability_research' || operation.type === 'exploit_development') {
            restrictions.push('Dual-use cryptographic research requires additional oversight');
            if (!user.roles?.includes('researcher') && !user.roles?.includes('admin')) {
                allowed = false;
                reasons.push('Cryptographic research requires researcher role');
            }
        }
        // Classification level restrictions
        if (operation.classification === SecurityClassification.RESTRICTED ||
            operation.classification === SecurityClassification.TOP_SECRET) {
            if (!user.security_clearance || user.security_clearance < 4) {
                allowed = false;
                reasons.push('Operation classification exceeds user clearance level');
            }
            approvalRequired = true;
        }
        // Rate limiting for sensitive operations
        const rateLimitKey = `crypto:${operation.type}`;
        const rateLimit = RATE_LIMITS[rateLimitKey] || RATE_LIMITS['crypto:analysis'];
        const rateLimitQuery = `
      SELECT COUNT(*) as request_count
      FROM crypto_audit_entries 
      WHERE user_id = $1 AND tenant_id = $2 
      AND timestamp > NOW() - INTERVAL '${rateLimit.windowMs}ms'
      AND action = $3
    `;
        const rateLimitResult = await db.query(rateLimitQuery, [user.id, tenantId, operation.type]);
        const requestCount = parseInt(rateLimitResult.rows[0]?.request_count || '0');
        if (requestCount >= rateLimit.maxRequests) {
            allowed = false;
            reasons.push(`Rate limit exceeded: ${requestCount}/${rateLimit.maxRequests} requests`);
        }
        // HSM operations require special handling
        if (operation.requires_hsm) {
            restrictions.push('HSM operations logged in tamper-evident audit trail');
            if (!user.hsm_authorized) {
                allowed = false;
                reasons.push('HSM operations require special authorization');
            }
        }
        return { allowed, reasons, restrictions, approvalRequired, riskLevel };
    }
}
// Audit logging for security operations
export class SecurityAuditLogger {
    static async logOSINTOperation(operation, user, tenantId, result, db) {
        const auditEntry = {
            user_id: user.id,
            tenant_id: tenantId,
            operation_type: 'osint_collection',
            operation_details: operation,
            legal_basis: operation.legal_basis,
            data_types_collected: operation.data_types,
            target_countries: operation.target_countries,
            source_type: operation.source_type,
            compliance_flags: operation.compliance_flags,
            result_classification: result.classification,
            ip_address: operation.ip_address,
            user_agent: operation.user_agent,
            timestamp: new Date().toISOString()
        };
        await db.query(`
      INSERT INTO osint_audit_log (
        user_id, tenant_id, operation_type, operation_details,
        legal_basis, data_types_collected, target_countries, source_type,
        compliance_flags, result_classification, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
            auditEntry.user_id, auditEntry.tenant_id, auditEntry.operation_type,
            JSON.stringify(auditEntry.operation_details), auditEntry.legal_basis,
            auditEntry.data_types_collected, auditEntry.target_countries,
            auditEntry.source_type, auditEntry.compliance_flags,
            auditEntry.result_classification, auditEntry.ip_address,
            auditEntry.user_agent, auditEntry.timestamp
        ]);
        logger.info('OSINT operation audit logged', {
            userId: user.id,
            tenantId,
            operationType: auditEntry.operation_type,
            legalBasis: auditEntry.legal_basis,
            sourceType: auditEntry.source_type
        });
    }
    static async logCryptoOperation(operation, user, tenantId, result, riskLevel, db) {
        const auditEntry = {
            analysis_id: result.id,
            user_id: user.id,
            timestamp: new Date().toISOString(),
            action: operation.type,
            details: `Crypto operation: ${operation.type}`,
            ip_address: operation.ip_address,
            user_agent: operation.user_agent,
            classification: operation.classification,
            data_accessed: operation.type === 'plaintext_access' || operation.type === 'key_recovery',
            risk_level: riskLevel,
            approval_id: operation.approval_id,
            export_controlled: operation.algorithm_strength > 128
        };
        await db.query(`
      INSERT INTO crypto_audit_entries (
        analysis_id, user_id, timestamp, action, details,
        ip_address, user_agent, classification, data_accessed,
        risk_level, approval_id, export_controlled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
            auditEntry.analysis_id, auditEntry.user_id, auditEntry.timestamp,
            auditEntry.action, auditEntry.details, auditEntry.ip_address,
            auditEntry.user_agent, auditEntry.classification, auditEntry.data_accessed,
            auditEntry.risk_level, auditEntry.approval_id, auditEntry.export_controlled
        ]);
        // Additional HSM audit logging if applicable
        if (operation.hsm_operation_id) {
            await db.query(`
        INSERT INTO hsm_audit_entries (
          operation_id, timestamp, operation, user_id, success, 
          ip_address, user_agent, risk_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                operation.hsm_operation_id, auditEntry.timestamp, operation.type,
                user.id, true, auditEntry.ip_address, auditEntry.user_agent, riskLevel
            ]);
        }
        logger.info('Crypto operation audit logged', {
            userId: user.id,
            tenantId,
            operationType: operation.type,
            riskLevel,
            classification: operation.classification,
            exportControlled: auditEntry.export_controlled
        });
    }
}
// Middleware for security guardrails
export const securityGuardrailsMiddleware = async (req, res, next) => {
    try {
        const context = req.context;
        const operation = req.body;
        if (!context?.user) {
            return next();
        }
        // Check for sensitive operations
        const operationType = operation.operationName || operation.query?.match(/mutation\s+(\w+)/)?.[1];
        if (!operationType) {
            return next();
        }
        // OSINT operation guardrails
        if (operationType.toLowerCase().includes('osint')) {
            const validation = await LegalComplianceValidator.validateOSINTCollection(operation.variables?.input || {}, context.user, context.user.tenantId, context.db);
            if (!validation.allowed) {
                logger.warn('OSINT operation blocked by security guardrails', {
                    userId: context.user.id,
                    operationType,
                    reasons: validation.reasons
                });
                throw new ForbiddenError(`Operation denied: ${validation.reasons.join(', ')}`);
            }
            if (validation.restrictions.length > 0) {
                // Add compliance warnings to response headers
                res.setHeader('X-Compliance-Warnings', validation.restrictions.join('; '));
            }
        }
        // Crypto operation guardrails
        if (operationType.toLowerCase().includes('crypto')) {
            const validation = await LegalComplianceValidator.validateCryptoOperation(operation.variables?.input || {}, context.user, context.user.tenantId, context.db);
            if (!validation.allowed) {
                logger.warn('Crypto operation blocked by security guardrails', {
                    userId: context.user.id,
                    operationType,
                    reasons: validation.reasons,
                    riskLevel: validation.riskLevel
                });
                throw new ForbiddenError(`Operation denied: ${validation.reasons.join(', ')}`);
            }
            if (validation.approvalRequired && !operation.variables?.input?.approval_id) {
                throw new ForbiddenError('This operation requires prior approval');
            }
            if (validation.restrictions.length > 0) {
                res.setHeader('X-Security-Restrictions', validation.restrictions.join('; '));
                res.setHeader('X-Risk-Level', validation.riskLevel);
            }
        }
        next();
    }
    catch (error) {
        if (error instanceof ForbiddenError || error instanceof UserInputError) {
            throw error;
        }
        logger.error('Security guardrails middleware error', error);
        next(error);
    }
};
// Tenant data isolation validator
export class TenantIsolationValidator {
    static async validateDataAccess(resourceType, resourceId, userTenantId, db) {
        const queries = {
            'osint_source': 'SELECT tenant_id FROM osint_sources WHERE id = $1',
            'osint_task': 'SELECT tenant_id FROM osint_tasks WHERE id = $1',
            'crypto_analysis': 'SELECT tenant_id FROM crypto_analyses WHERE id = $1',
            'forensic_case': 'SELECT tenant_id FROM forensic_cases WHERE id = $1',
            'ml_model': 'SELECT tenant_id FROM ml_models WHERE id = $1',
            'detection_rule': 'SELECT tenant_id FROM detection_rules WHERE id = $1',
        };
        const query = queries[resourceType];
        if (!query) {
            logger.warn(`Unknown resource type for tenant validation: ${resourceType}`);
            return false;
        }
        const result = await db.query(query, [resourceId]);
        if (result.rows.length === 0) {
            return false;
        }
        const resourceTenantId = result.rows[0].tenant_id;
        return resourceTenantId === userTenantId;
    }
}
// Data classification and handling
export class DataClassificationHandler {
    static classifyData(data) {
        let classification = SecurityClassification.PUBLIC;
        const handlingRestrictions = [];
        let retentionPeriod = 365; // default 1 year
        // Check for personal data
        const personalDataFields = LegalComplianceValidator['SENSITIVE_PERSONAL_DATA_FIELDS'];
        const hasPersonalData = Object.keys(data).some(key => personalDataFields.some(field => key.toLowerCase().includes(field)));
        if (hasPersonalData) {
            classification = SecurityClassification.CONFIDENTIAL;
            handlingRestrictions.push('Personal data - GDPR/CCPA compliance required');
            retentionPeriod = 90; // Shorter retention for personal data
        }
        // Check for cryptographic material
        if (data.key_material || data.private_key || data.plaintext_recovered) {
            classification = SecurityClassification.RESTRICTED;
            handlingRestrictions.push('Cryptographic material - restricted access');
            retentionPeriod = 30; // Very short retention
        }
        // Check for threat intelligence
        if (data.threat_indicators || data.malware_signatures || data.attack_patterns) {
            if (classification < SecurityClassification.CONFIDENTIAL) {
                classification = SecurityClassification.CONFIDENTIAL;
            }
            handlingRestrictions.push('Threat intelligence - controlled distribution');
            retentionPeriod = 730; // 2 years for TI data
        }
        // Check for law enforcement data
        if (data.case_number || data.evidence_id || data.chain_of_custody) {
            classification = SecurityClassification.RESTRICTED;
            handlingRestrictions.push('Law enforcement data - chain of custody required');
            retentionPeriod = 2555; // 7 years for legal data
        }
        return { classification, handlingRestrictions, retentionPeriod };
    }
    static async enforceDataHandling(data, classification, userClearance, db) {
        // Redact data based on user clearance
        if (classification === SecurityClassification.RESTRICTED && userClearance < 4) {
            return this.redactSensitiveData(data);
        }
        if (classification === SecurityClassification.CONFIDENTIAL && userClearance < 3) {
            return this.redactPersonalData(data);
        }
        return data;
    }
    static redactSensitiveData(data) {
        const redacted = { ...data };
        // Redact cryptographic material
        if (redacted.key_material)
            redacted.key_material = '[REDACTED]';
        if (redacted.private_key)
            redacted.private_key = '[REDACTED]';
        if (redacted.plaintext_recovered)
            redacted.plaintext_recovered = '[REDACTED]';
        return redacted;
    }
    static redactPersonalData(data) {
        const redacted = { ...data };
        const personalFields = ['ssn', 'email', 'phone', 'address', 'name'];
        personalFields.forEach(field => {
            if (redacted[field]) {
                redacted[field] = '[REDACTED]';
            }
        });
        return redacted;
    }
}
// Export control validation
export class ExportControlValidator {
    static CONTROLLED_ALGORITHMS = [
        'AES-256', 'RSA-4096', 'ECC-P521', 'ChaCha20', 'Poly1305'
    ];
    static CONTROLLED_COUNTRIES = [
        'IR', 'KP', 'SY', 'CU', 'RU', 'BY', 'VE', 'LY', 'SO'
    ];
    static async validateExportOperation(operation, userLocation, targetLocation) {
        const restrictions = [];
        let allowed = true;
        let license_required = false;
        // Check if operation involves controlled algorithms
        if (operation.algorithm && this.CONTROLLED_ALGORITHMS.includes(operation.algorithm)) {
            license_required = true;
            restrictions.push(`Algorithm ${operation.algorithm} subject to export controls`);
        }
        // Check if operation involves controlled countries
        if (targetLocation && this.CONTROLLED_COUNTRIES.includes(targetLocation)) {
            allowed = false;
            restrictions.push(`Export to ${targetLocation} prohibited under current regulations`);
        }
        // Check key size restrictions
        if (operation.key_size > 1024) {
            license_required = true;
            restrictions.push('Key size >1024 bits requires export license');
        }
        // US person restrictions
        if (userLocation === 'US' && operation.type === 'vulnerability_research') {
            restrictions.push('US person engaging in vulnerability research - ITAR considerations');
        }
        return { allowed, license_required, restrictions };
    }
}
//# sourceMappingURL=security-guardrails.js.map