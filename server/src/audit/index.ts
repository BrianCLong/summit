/**
 * Audit Module - Clean API for cross-service audit logging
 *
 * Usage:
 * ```typescript
 * import { Audit } from './audit/index.js';
 *
 * // Log access to a case
 * await Audit.logAccess({
 *   tenantId: 'tenant-123',
 *   caseId: 'case-456',
 *   userId: 'user-789',
 *   action: 'view',
 *   reason: 'Investigating fraud case',
 *   legalBasis: 'investigation',
 * });
 * ```
 */

export { AuditAccessLogRepo, LegalBasis } from '../repos/AuditAccessLogRepo.js';
export type { AuditAccessLog, AuditAccessLogInput, AuditQuery } from '../repos/AuditAccessLogRepo.js';

import { getPostgresPool } from '../db/postgres.js';
import { AuditAccessLogRepo, AuditAccessLogInput, LegalBasis } from '../repos/AuditAccessLogRepo.js';
import logger from '../utils/logger.js';

const auditLogger = logger.child({ service: 'Audit' });

let _instance: AuditAccessLogRepo | null = null;

/**
 * Get singleton instance of AuditAccessLogRepo
 */
function getInstance(): AuditAccessLogRepo {
  if (!_instance) {
    const pg = getPostgresPool();
    _instance = new AuditAccessLogRepo(pg);
  }
  return _instance;
}

/**
 * Audit facade for simplified cross-service audit logging
 */
export const Audit = {
  /**
   * Log an access event to the immutable audit trail
   *
   * @throws Error if reason or legalBasis is missing (policy-by-default)
   *
   * @example
   * ```typescript
   * await Audit.logAccess({
   *   tenantId: 'tenant-123',
   *   caseId: 'case-456',
   *   userId: 'user-789',
   *   action: 'view',
   *   reason: 'Investigating fraud case',
   *   legalBasis: 'investigation',
   * });
   * ```
   */
  async logAccess(input: AuditAccessLogInput) {
    const repo = getInstance();
    return repo.logAccess(input);
  },

  /**
   * Query audit logs with filtering options
   */
  async query(params: {
    tenantId: string;
    caseId?: string;
    userId?: string;
    action?: string;
    legalBasis?: LegalBasis;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }) {
    const repo = getInstance();
    return repo.query(params);
  },

  /**
   * Get all audit logs for a specific case
   */
  async getLogsForCase(caseId: string, tenantId: string, limit = 100) {
    const repo = getInstance();
    return repo.getLogsForCase(caseId, tenantId, limit);
  },

  /**
   * Get all audit logs for a specific user
   */
  async getLogsForUser(userId: string, tenantId: string, limit = 100) {
    const repo = getInstance();
    return repo.getLogsForUser(userId, tenantId, limit);
  },

  /**
   * Get all logs with a specific correlation ID (for tracking workflows)
   */
  async getLogsByCorrelationId(correlationId: string, tenantId: string) {
    const repo = getInstance();
    return repo.getLogsByCorrelationId(correlationId, tenantId);
  },

  /**
   * Verify the integrity of the audit trail
   */
  async verifyIntegrity(tenantId: string, startDate?: Date, endDate?: Date) {
    const repo = getInstance();
    return repo.verifyIntegrity(tenantId, startDate, endDate);
  },

  /**
   * Count audit logs matching the filter criteria
   */
  async count(params: {
    tenantId: string;
    caseId?: string;
    userId?: string;
    action?: string;
    legalBasis?: LegalBasis;
    startTime?: Date;
    endTime?: Date;
  }) {
    const repo = getInstance();
    return repo.count(params);
  },

  /**
   * Get the underlying repository instance for advanced operations
   */
  getRepository(): AuditAccessLogRepo {
    return getInstance();
  },

  /**
   * Reset the singleton instance (useful for testing)
   */
  _reset() {
    _instance = null;
  },
};

/**
 * Legal basis values for reference
 */
export const LEGAL_BASIS = {
  INVESTIGATION: 'investigation' as LegalBasis,
  LAW_ENFORCEMENT: 'law_enforcement' as LegalBasis,
  REGULATORY_COMPLIANCE: 'regulatory_compliance' as LegalBasis,
  COURT_ORDER: 'court_order' as LegalBasis,
  NATIONAL_SECURITY: 'national_security' as LegalBasis,
  LEGITIMATE_INTEREST: 'legitimate_interest' as LegalBasis,
  CONSENT: 'consent' as LegalBasis,
  CONTRACT_PERFORMANCE: 'contract_performance' as LegalBasis,
  VITAL_INTERESTS: 'vital_interests' as LegalBasis,
  PUBLIC_INTEREST: 'public_interest' as LegalBasis,
} as const;

export default Audit;
