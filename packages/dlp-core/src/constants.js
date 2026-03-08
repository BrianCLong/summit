"use strict";
/**
 * DLP Constants
 * @package dlp-core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTS = exports.RISK_THRESHOLDS = exports.COMPLIANCE_FRAMEWORKS = exports.ENVIRONMENTS = exports.DLP_EVENT_TYPES = exports.DETECTED_DATA_TYPES = exports.REDACTION_STRATEGIES = exports.SCAN_ACTIONS = exports.BARRIER_TYPES = exports.DATA_CATEGORIES = exports.DATA_CLASSIFICATIONS = void 0;
/**
 * Data classification levels (ordered from least to most sensitive)
 */
exports.DATA_CLASSIFICATIONS = {
    PUBLIC: 'PUBLIC',
    INTERNAL: 'INTERNAL',
    CONFIDENTIAL: 'CONFIDENTIAL',
    RESTRICTED: 'RESTRICTED',
    TOP_SECRET: 'TOP_SECRET',
};
/**
 * Data categories
 */
exports.DATA_CATEGORIES = {
    PII: 'PII',
    PCI: 'PCI',
    PHI: 'PHI',
    TRADE_SECRET: 'TRADE_SECRET',
    FINANCIAL: 'FINANCIAL',
    REGULATED: 'REGULATED',
    INTERNAL: 'INTERNAL',
};
/**
 * Barrier types
 */
exports.BARRIER_TYPES = {
    TENANT_ISOLATION: 'TENANT_ISOLATION',
    BUSINESS_UNIT: 'BUSINESS_UNIT',
    ROLE_BASED: 'ROLE_BASED',
    ENVIRONMENT: 'ENVIRONMENT',
    JURISDICTION: 'JURISDICTION',
};
/**
 * Scan actions
 */
exports.SCAN_ACTIONS = {
    ALLOW: 'ALLOW',
    BLOCK: 'BLOCK',
    REDACT: 'REDACT',
    WARN: 'WARN',
    REQUIRE_JUSTIFICATION: 'REQUIRE_JUSTIFICATION',
    REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
    QUARANTINE: 'QUARANTINE',
};
/**
 * Redaction strategies
 */
exports.REDACTION_STRATEGIES = {
    FULL_MASK: 'FULL_MASK',
    PARTIAL_MASK: 'PARTIAL_MASK',
    GENERALIZE: 'GENERALIZE',
    TOKENIZE: 'TOKENIZE',
    ENCRYPT: 'ENCRYPT',
    REMOVE: 'REMOVE',
};
/**
 * Detected data types
 */
exports.DETECTED_DATA_TYPES = {
    SSN: 'SSN',
    CREDIT_CARD: 'CREDIT_CARD',
    BANK_ACCOUNT: 'BANK_ACCOUNT',
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
    DATE_OF_BIRTH: 'DATE_OF_BIRTH',
    ADDRESS: 'ADDRESS',
    IP_ADDRESS: 'IP_ADDRESS',
    PASSPORT: 'PASSPORT',
    DRIVER_LICENSE: 'DRIVER_LICENSE',
    API_KEY: 'API_KEY',
    PASSWORD: 'PASSWORD',
    PHI: 'PHI',
    BIOMETRIC: 'BIOMETRIC',
    FINANCIAL_DATA: 'FINANCIAL_DATA',
    TRADE_SECRET: 'TRADE_SECRET',
    CUSTOM: 'CUSTOM',
};
/**
 * DLP event types
 */
exports.DLP_EVENT_TYPES = {
    INGESTION_SCAN: 'INGESTION_SCAN',
    EGRESS_SCAN: 'EGRESS_SCAN',
    TRANSFER_SCAN: 'TRANSFER_SCAN',
    BARRIER_CHECK: 'BARRIER_CHECK',
    EXCEPTION_USED: 'EXCEPTION_USED',
    POLICY_VIOLATION: 'POLICY_VIOLATION',
    REDACTION_APPLIED: 'REDACTION_APPLIED',
    ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
};
/**
 * Environments
 */
exports.ENVIRONMENTS = {
    PRODUCTION: 'production',
    STAGING: 'staging',
    DEVELOPMENT: 'development',
    TESTING: 'testing',
    AUDIT: 'audit',
};
/**
 * Compliance frameworks
 */
exports.COMPLIANCE_FRAMEWORKS = {
    GDPR: 'GDPR',
    CCPA: 'CCPA',
    HIPAA: 'HIPAA',
    PCI_DSS: 'PCI_DSS',
    SOX: 'SOX',
    ITAR: 'ITAR',
    NIST: 'NIST',
    ISO_27001: 'ISO_27001',
};
/**
 * Risk score thresholds
 */
exports.RISK_THRESHOLDS = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90,
};
/**
 * Default configuration values
 */
exports.DEFAULTS = {
    CACHE_TTL: 300000, // 5 minutes
    MAX_DETECTIONS: 1000,
    CONTEXT_WINDOW: 50,
    BULK_THRESHOLD_RECORDS: 1000,
    BULK_THRESHOLD_PII: 100,
    BULK_THRESHOLD_HIGH_RISK: 10,
    AUDIT_RETENTION_DAYS: 2555, // 7 years
    JUSTIFICATION_MIN_LENGTH: 50,
    STEP_UP_VALIDITY_MS: 3600000, // 1 hour
};
