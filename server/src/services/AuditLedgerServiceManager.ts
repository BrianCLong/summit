/**
 * Singleton Audit Ledger Service Manager
 * 
 * Manages a single instance of the audit ledger service across the application
 */

import { RedisAuditLedgerService } from './AuditLedgerService';

// Create a singleton instance of the audit ledger service
let auditLedgerService: RedisAuditLedgerService | null = null;

/**
 * Get or create the audit ledger service instance
 */
export function getAuditLedgerService(): RedisAuditLedgerService {
  if (!auditLedgerService) {
    auditLedgerService = new RedisAuditLedgerService();
  }
  return auditLedgerService;
}

/**
 * Initialize the audit ledger service with a specific configuration
 */
export function initAuditLedgerService(redisUrl?: string, retentionDays?: number): RedisAuditLedgerService {
  auditLedgerService = new RedisAuditLedgerService(redisUrl, retentionDays);
  return auditLedgerService;
}

/**
 * Reset the audit ledger service (useful for testing)
 */
export function resetAuditLedgerService(): void {
  if (auditLedgerService) {
    auditLedgerService.close().catch(console.error);
    auditLedgerService = null;
  }
}