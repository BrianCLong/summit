/**
 * Selector Minimization Configuration
 *
 * Central configuration for selector minimization, tripwire monitoring,
 * and Proof-of-Non-Collection reporting features.
 */

// ============================================================================
// Environment Variables
// ============================================================================

export const SelectorMinimizationConfig = {
  // Tripwire thresholds
  DEFAULT_MAX_EXPANSION_RATIO: parseFloat(
    process.env.SELECTOR_MAX_EXPANSION_RATIO || '10.0'
  ),
  DEFAULT_ANOMALY_Z_SCORE: parseFloat(
    process.env.SELECTOR_ANOMALY_Z_SCORE || '4.0'
  ),
  DEFAULT_MAX_RECORDS_ACCESSED: parseInt(
    process.env.SELECTOR_MAX_RECORDS_ACCESSED || '100000'
  ),

  // Reason-for-access validation
  REASON_MIN_LENGTH: parseInt(process.env.REASON_MIN_LENGTH || '10'),
  REASON_MIN_WORDS: parseInt(process.env.REASON_MIN_WORDS || '3'),
  REQUIRE_REASON_FOR_EXPANSION_RATIO: parseFloat(
    process.env.REQUIRE_REASON_FOR_EXPANSION_RATIO || '5.0'
  ),
  REQUIRE_REASON_FOR_RECORD_COUNT: parseInt(
    process.env.REQUIRE_REASON_FOR_RECORD_COUNT || '10000'
  ),

  // Metrics and reporting
  QUERY_METRICS_RETENTION_DAYS: parseInt(
    process.env.QUERY_METRICS_RETENTION_DAYS || '90'
  ),
  BASELINE_MIN_SAMPLE_SIZE: parseInt(
    process.env.BASELINE_MIN_SAMPLE_SIZE || '10'
  ),
  BASELINE_LOOKBACK_DAYS: parseInt(
    process.env.BASELINE_LOOKBACK_DAYS || '30'
  ),

  // PNC reporting
  PNC_REPORTS_DIR: process.env.PNC_REPORTS_DIR || '/var/lib/summit/pnc-reports',
  PNC_DEFAULT_SAMPLE_RATE: parseFloat(process.env.PNC_SAMPLE_RATE || '0.05'), // 5%
  PNC_MIN_SAMPLE_SIZE: parseInt(process.env.PNC_MIN_SAMPLE_SIZE || '1000'),
  PNC_SIGNING_SECRET: process.env.PNC_SIGNING_SECRET || 'default-signing-secret',
  PNC_REPORT_RETENTION_YEARS: parseInt(
    process.env.PNC_REPORT_RETENTION_YEARS || '7'
  ),

  // Alert settings
  ALERT_ENABLED: process.env.SELECTOR_ALERTS_ENABLED !== 'false',
  ALERT_SEVERITY_THRESHOLDS: {
    low: 1.5, // 1.5x threshold
    medium: 2.0, // 2x threshold
    high: 3.0, // 3x threshold
    critical: 5.0, // 5x threshold
  },

  // Performance
  METRICS_CACHE_TTL: parseInt(process.env.METRICS_CACHE_TTL || '3600'), // 1 hour
  BLOCK_ON_VIOLATION: process.env.SELECTOR_BLOCK_ON_VIOLATION === 'true',

  // Feature flags
  ENABLE_SELECTOR_TRACKING: process.env.ENABLE_SELECTOR_TRACKING !== 'false',
  ENABLE_ANOMALY_DETECTION: process.env.ENABLE_ANOMALY_DETECTION !== 'false',
  ENABLE_PNC_REPORTS: process.env.ENABLE_PNC_REPORTS !== 'false',
  ENABLE_REASON_VALIDATION: process.env.ENABLE_REASON_VALIDATION !== 'false',

  // Compliance
  TARGET_VIOLATION_RATE: parseFloat(
    process.env.TARGET_VIOLATION_RATE || '0.01'
  ), // 1%
  COMPLIANCE_REPORTING_ENABLED:
    process.env.COMPLIANCE_REPORTING_ENABLED !== 'false',
};

// ============================================================================
// Data Categories for PNC Monitoring
// ============================================================================

export const DATA_CATEGORIES = {
  // Special category data (GDPR Art. 9)
  BIOMETRIC_DATA: 'biometric_data',
  GENETIC_DATA: 'genetic_data',
  HEALTH_DATA: 'health_records',
  SEXUAL_ORIENTATION: 'sexual_orientation',
  RELIGIOUS_BELIEFS: 'religious_beliefs',
  POLITICAL_OPINIONS: 'political_opinions',
  UNION_MEMBERSHIP: 'union_membership',
  RACIAL_ETHNIC_ORIGIN: 'racial_ethnic_origin',

  // Financial data
  FINANCIAL_ACCOUNTS: 'financial_account_data',
  PAYMENT_CARDS: 'payment_card_data',
  BANK_ACCOUNTS: 'bank_account_data',

  // Location data
  PRECISE_GEOLOCATION: 'geolocation_precise',
  COARSE_GEOLOCATION: 'geolocation_coarse',

  // Identity data
  GOVERNMENT_IDS: 'government_ids',
  SOCIAL_SECURITY: 'social_security_numbers',
  PASSPORT_DATA: 'passport_data',

  // Communication data
  PRIVATE_MESSAGES: 'private_messages',
  EMAIL_CONTENT: 'email_content',
  PHONE_RECORDS: 'phone_records',
};

// ============================================================================
// Tripwire Presets
// ============================================================================

export const TRIPWIRE_PRESETS = {
  // Strict - for production environments with sensitive data
  strict: {
    maxExpansionRatio: 5.0,
    maxRecordsAccessed: 10000,
    requireReason: true,
    blockOnViolation: true,
    alertOnViolation: true,
  },

  // Standard - balanced approach
  standard: {
    maxExpansionRatio: 10.0,
    maxRecordsAccessed: 50000,
    requireReason: false,
    blockOnViolation: false,
    alertOnViolation: true,
  },

  // Permissive - for development/testing
  permissive: {
    maxExpansionRatio: 20.0,
    maxRecordsAccessed: 100000,
    requireReason: false,
    blockOnViolation: false,
    alertOnViolation: true,
  },

  // Compliance - for regulated industries
  compliance: {
    maxExpansionRatio: 3.0,
    maxRecordsAccessed: 5000,
    requireReason: true,
    blockOnViolation: true,
    alertOnViolation: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tripwire preset configuration
 */
export function getTripwirePreset(
  preset: keyof typeof TRIPWIRE_PRESETS = 'standard'
) {
  return TRIPWIRE_PRESETS[preset] || TRIPWIRE_PRESETS.standard;
}

/**
 * Validate configuration
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (SelectorMinimizationConfig.DEFAULT_MAX_EXPANSION_RATIO <= 0) {
    errors.push('DEFAULT_MAX_EXPANSION_RATIO must be positive');
  }

  if (SelectorMinimizationConfig.DEFAULT_ANOMALY_Z_SCORE <= 0) {
    errors.push('DEFAULT_ANOMALY_Z_SCORE must be positive');
  }

  if (SelectorMinimizationConfig.PNC_DEFAULT_SAMPLE_RATE < 0 ||
      SelectorMinimizationConfig.PNC_DEFAULT_SAMPLE_RATE > 1) {
    errors.push('PNC_SAMPLE_RATE must be between 0 and 1');
  }

  if (SelectorMinimizationConfig.TARGET_VIOLATION_RATE < 0 ||
      SelectorMinimizationConfig.TARGET_VIOLATION_RATE > 1) {
    errors.push('TARGET_VIOLATION_RATE must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Environment Variable Documentation
// ============================================================================

export const ENV_DOCS = `
Selector Minimization Environment Variables:

## Tripwire Thresholds
SELECTOR_MAX_EXPANSION_RATIO      - Maximum allowed selector expansion ratio (default: 10.0)
SELECTOR_ANOMALY_Z_SCORE          - Z-score threshold for anomaly detection (default: 4.0)
SELECTOR_MAX_RECORDS_ACCESSED     - Maximum records allowed per query (default: 100000)

## Reason-for-Access
REASON_MIN_LENGTH                 - Minimum character length for reason (default: 10)
REASON_MIN_WORDS                  - Minimum word count for reason (default: 3)
REQUIRE_REASON_FOR_EXPANSION_RATIO - Expansion ratio triggering reason requirement (default: 5.0)
REQUIRE_REASON_FOR_RECORD_COUNT   - Record count triggering reason requirement (default: 10000)

## Metrics and Retention
QUERY_METRICS_RETENTION_DAYS      - Days to retain query metrics (default: 90)
BASELINE_MIN_SAMPLE_SIZE          - Minimum samples for baseline calculation (default: 10)
BASELINE_LOOKBACK_DAYS            - Days to look back for baseline (default: 30)
METRICS_CACHE_TTL                 - Cache TTL in seconds (default: 3600)

## PNC Reporting
PNC_REPORTS_DIR                   - Directory for PNC report storage (default: /var/lib/summit/pnc-reports)
PNC_SAMPLE_RATE                   - Sample rate for PNC reports (default: 0.05)
PNC_MIN_SAMPLE_SIZE               - Minimum sample size (default: 1000)
PNC_SIGNING_SECRET                - Secret for report signing (required in production)
PNC_REPORT_RETENTION_YEARS        - Years to retain reports (default: 7)

## Alerts and Enforcement
SELECTOR_ALERTS_ENABLED           - Enable/disable alerts (default: true)
SELECTOR_BLOCK_ON_VIOLATION       - Block queries that violate tripwires (default: false)

## Feature Flags
ENABLE_SELECTOR_TRACKING          - Enable selector tracking (default: true)
ENABLE_ANOMALY_DETECTION          - Enable anomaly detection (default: true)
ENABLE_PNC_REPORTS                - Enable PNC report generation (default: true)
ENABLE_REASON_VALIDATION          - Enable reason-for-access validation (default: true)

## Compliance
TARGET_VIOLATION_RATE             - Target violation rate for compliance (default: 0.01)
COMPLIANCE_REPORTING_ENABLED      - Enable compliance reporting (default: true)
`;

// Log configuration on startup
if (process.env.NODE_ENV !== 'test') {
  const validation = validateConfiguration();
  if (!validation.valid) {
    console.error('Selector Minimization Configuration Errors:', validation.errors);
  } else {
    console.log('Selector Minimization Configuration: Valid');
  }
}
