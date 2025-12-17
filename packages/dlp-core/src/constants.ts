/**
 * DLP Constants
 * @package dlp-core
 */

/**
 * Data classification levels (ordered from least to most sensitive)
 */
export const DATA_CLASSIFICATIONS = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
  TOP_SECRET: 'TOP_SECRET',
} as const;

/**
 * Data categories
 */
export const DATA_CATEGORIES = {
  PII: 'PII',
  PCI: 'PCI',
  PHI: 'PHI',
  TRADE_SECRET: 'TRADE_SECRET',
  FINANCIAL: 'FINANCIAL',
  REGULATED: 'REGULATED',
  INTERNAL: 'INTERNAL',
} as const;

/**
 * Barrier types
 */
export const BARRIER_TYPES = {
  TENANT_ISOLATION: 'TENANT_ISOLATION',
  BUSINESS_UNIT: 'BUSINESS_UNIT',
  ROLE_BASED: 'ROLE_BASED',
  ENVIRONMENT: 'ENVIRONMENT',
  JURISDICTION: 'JURISDICTION',
} as const;

/**
 * Scan actions
 */
export const SCAN_ACTIONS = {
  ALLOW: 'ALLOW',
  BLOCK: 'BLOCK',
  REDACT: 'REDACT',
  WARN: 'WARN',
  REQUIRE_JUSTIFICATION: 'REQUIRE_JUSTIFICATION',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  QUARANTINE: 'QUARANTINE',
} as const;

/**
 * Redaction strategies
 */
export const REDACTION_STRATEGIES = {
  FULL_MASK: 'FULL_MASK',
  PARTIAL_MASK: 'PARTIAL_MASK',
  GENERALIZE: 'GENERALIZE',
  TOKENIZE: 'TOKENIZE',
  ENCRYPT: 'ENCRYPT',
  REMOVE: 'REMOVE',
} as const;

/**
 * Detected data types
 */
export const DETECTED_DATA_TYPES = {
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
} as const;

/**
 * DLP event types
 */
export const DLP_EVENT_TYPES = {
  INGESTION_SCAN: 'INGESTION_SCAN',
  EGRESS_SCAN: 'EGRESS_SCAN',
  TRANSFER_SCAN: 'TRANSFER_SCAN',
  BARRIER_CHECK: 'BARRIER_CHECK',
  EXCEPTION_USED: 'EXCEPTION_USED',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  REDACTION_APPLIED: 'REDACTION_APPLIED',
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
} as const;

/**
 * Environments
 */
export const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  AUDIT: 'audit',
} as const;

/**
 * Compliance frameworks
 */
export const COMPLIANCE_FRAMEWORKS = {
  GDPR: 'GDPR',
  CCPA: 'CCPA',
  HIPAA: 'HIPAA',
  PCI_DSS: 'PCI_DSS',
  SOX: 'SOX',
  ITAR: 'ITAR',
  NIST: 'NIST',
  ISO_27001: 'ISO_27001',
} as const;

/**
 * Risk score thresholds
 */
export const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  CACHE_TTL: 300000, // 5 minutes
  MAX_DETECTIONS: 1000,
  CONTEXT_WINDOW: 50,
  BULK_THRESHOLD_RECORDS: 1000,
  BULK_THRESHOLD_PII: 100,
  BULK_THRESHOLD_HIGH_RISK: 10,
  AUDIT_RETENTION_DAYS: 2555, // 7 years
  JUSTIFICATION_MIN_LENGTH: 50,
  STEP_UP_VALIDITY_MS: 3600000, // 1 hour
} as const;
