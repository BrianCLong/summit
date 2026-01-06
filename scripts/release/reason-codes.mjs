/**
 * @fileoverview
 * Canonical definitions for Release Reason Codes.
 * Used to categorize blocking conditions during the release process.
 */

/**
 * Release Status Blocked Codes
 * @readonly
 * @enum {string}
 */
export const RELEASE_STATUS_BLOCKED = {
  PREFLIGHT_ANCESTRY: 'PREFLIGHT_ANCESTRY',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  FREEZE_WINDOW: 'FREEZE_WINDOW',
  VERIFY_FAILED: 'VERIFY_FAILED',
  MISSING_ARTIFACTS: 'MISSING_ARTIFACTS',
  SECURITY_GUARD: 'SECURITY_GUARD',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Maestro/Bundle No-Go Codes
 * @readonly
 * @enum {string}
 */
export const MAESTRO_NOGO = {
  BUNDLE_SCHEMA_INCOMPATIBLE: 'BUNDLE_SCHEMA_INCOMPATIBLE',
  BUNDLE_SCHEMA_INVALID: 'BUNDLE_SCHEMA_INVALID',
  BUNDLE_INVALID_JSON: 'BUNDLE_INVALID_JSON',
  BUNDLE_MISSING_FIELD: 'BUNDLE_MISSING_FIELD',
  BUNDLE_INVALID_VALUE: 'BUNDLE_INVALID_VALUE',
  // Legacy aliases
  SCHEMA_MAJOR_UNSUPPORTED: 'SCHEMA_MAJOR_UNSUPPORTED',
  SCHEMA_VERSION_INVALID: 'SCHEMA_VERSION_INVALID',
  INVALID_ENUM: 'INVALID_ENUM',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_JSON: 'INVALID_JSON',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR'
};

/**
 * Evidence Check Codes
 * @readonly
 * @enum {string}
 */
export const EVIDENCE_CHECK = {
  EVIDENCE_MISSING: 'EVIDENCE_MISSING',
  EVIDENCE_EXPIRED: 'EVIDENCE_EXPIRED',
  EVIDENCE_SHA_MISMATCH: 'EVIDENCE_SHA_MISMATCH',
  EVIDENCE_BUNDLE_DIGEST_MISMATCH: 'EVIDENCE_BUNDLE_DIGEST_MISMATCH',
  EVIDENCE_NOT_GO: 'EVIDENCE_NOT_GO',
  DIR_EXTRA_FILE: 'DIR_EXTRA_FILE',
  HASH_MISMATCH: 'HASH_MISMATCH',
  DIR_MISSING_FILE: 'DIR_MISSING_FILE',
  INDEX_EXTRA_FILE: 'INDEX_EXTRA_FILE',
  INDEX_HASH_MISMATCH: 'INDEX_HASH_MISMATCH',
  INDEX_MISSING_FILE: 'INDEX_MISSING_FILE',
  POINTER_INVALID: 'POINTER_INVALID',
  INDEX_PARSE_ERROR: 'INDEX_PARSE_ERROR',
  PROV_EXTRA_SUBJECT: 'PROV_EXTRA_SUBJECT',
  PROV_HASH_MISMATCH: 'PROV_HASH_MISMATCH',
  PROV_MISSING_SUBJECT: 'PROV_MISSING_SUBJECT',
  PROV_PARSE_ERROR: 'PROV_PARSE_ERROR',
  NOTES_MISSING: 'NOTES_MISSING',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  COMPATIBILITY_CHECK_FAILED: 'COMPATIBILITY_CHECK_FAILED'
};

/**
 * @typedef {keyof typeof RELEASE_STATUS_BLOCKED} ReleaseStatusBlockedCode
 */

/**
 * @typedef {keyof typeof MAESTRO_NOGO} MaestroNogoCode
 */

/**
 * @typedef {keyof typeof EVIDENCE_CHECK} EvidenceCheckCode
 */

/**
 * Helper to construct a blocked reason object.
 * @param {ReleaseStatusBlockedCode | MaestroNogoCode | EvidenceCheckCode} code
 * @param {string} message
 * @param {any} [details]
 * @returns {{code: string, message: string, details?: any}}
 */
export function blockedReason(code, message, details) {
  return { code, message, details };
}
