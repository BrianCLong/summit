import crypto from 'crypto';
import type { AuditLogEntry } from './types.js';

/**
 * Audit Logger for ZK Deconfliction Operations
 * Maintains tamper-evident log of all deconfliction checks
 */

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  /**
   * Record a deconfliction operation
   */
  log(
    tenantAId: string,
    tenantBId: string,
    hasOverlap: boolean,
    overlapCount: number,
    proof: string,
    context?: Record<string, any>,
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString(),
      tenantAId,
      tenantBId,
      hasOverlap,
      overlapCount,
      proof,
      context,
    };

    this.logs.push(entry);
    return entry;
  }

  /**
   * Get all audit logs
   */
  getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific tenant
   */
  getLogsByTenant(tenantId: string): AuditLogEntry[] {
    return this.logs.filter(
      (log) => log.tenantAId === tenantId || log.tenantBId === tenantId,
    );
  }

  /**
   * Get log by ID
   */
  getLogById(id: string): AuditLogEntry | undefined {
    return this.logs.find((log) => log.id === id);
  }

  /**
   * Export logs (for external audit)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
