/**
 * Audit Logger
 *
 * Comprehensive audit logging for all federation operations.
 * Ensures compliance and chain-of-custody tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { FederationAuditLog, ShareableObjectType } from '../models/types.js';

const logger = pino({ name: 'audit' });

/**
 * Audit context
 */
export interface AuditContext {
  userId?: string;
  partnerId?: string;
  agreementId?: string;
  channelId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private auditLogs: FederationAuditLog[] = [];

  /**
   * Log share push operation
   */
  logSharePush(
    context: AuditContext,
    objectCount: number,
    objectTypes: ShareableObjectType[],
    provenanceIds: string[],
    success: boolean,
    errorMessage?: string
  ): FederationAuditLog {
    const entry: FederationAuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      operation: 'share_push',
      agreementId: context.agreementId,
      channelId: context.channelId,
      partnerId: context.partnerId,
      userId: context.userId,
      objectCount,
      objectTypes,
      success,
      errorMessage,
      provenanceIds,
      metadata: {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    };

    this.auditLogs.push(entry);

    logger.info(
      {
        auditId: entry.id,
        operation: entry.operation,
        success,
        objectCount,
      },
      'Audit log: share_push'
    );

    return entry;
  }

  /**
   * Log share pull operation
   */
  logSharePull(
    context: AuditContext,
    objectCount: number,
    objectTypes: ShareableObjectType[],
    success: boolean,
    errorMessage?: string
  ): FederationAuditLog {
    const entry: FederationAuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      operation: 'share_pull',
      agreementId: context.agreementId,
      channelId: context.channelId,
      partnerId: context.partnerId,
      userId: context.userId,
      objectCount,
      objectTypes,
      success,
      errorMessage,
      metadata: {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    };

    this.auditLogs.push(entry);

    logger.info(
      {
        auditId: entry.id,
        operation: entry.operation,
        success,
        objectCount,
      },
      'Audit log: share_pull'
    );

    return entry;
  }

  /**
   * Log subscription delivery
   */
  logSubscriptionDelivery(
    context: AuditContext,
    objectCount: number,
    objectTypes: ShareableObjectType[],
    provenanceIds: string[],
    success: boolean,
    errorMessage?: string
  ): FederationAuditLog {
    const entry: FederationAuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      operation: 'subscription_deliver',
      agreementId: context.agreementId,
      channelId: context.channelId,
      partnerId: context.partnerId,
      userId: context.userId,
      objectCount,
      objectTypes,
      success,
      errorMessage,
      provenanceIds,
      metadata: {
        requestId: context.requestId,
      },
    };

    this.auditLogs.push(entry);

    logger.info(
      {
        auditId: entry.id,
        operation: entry.operation,
        success,
        objectCount,
      },
      'Audit log: subscription_deliver'
    );

    return entry;
  }

  /**
   * Log agreement creation
   */
  logAgreementCreate(
    context: AuditContext,
    agreementId: string,
    success: boolean,
    errorMessage?: string
  ): FederationAuditLog {
    const entry: FederationAuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      operation: 'agreement_create',
      agreementId,
      partnerId: context.partnerId,
      userId: context.userId,
      success,
      errorMessage,
      metadata: {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    };

    this.auditLogs.push(entry);

    logger.info(
      {
        auditId: entry.id,
        operation: entry.operation,
        agreementId,
        success,
      },
      'Audit log: agreement_create'
    );

    return entry;
  }

  /**
   * Log agreement modification
   */
  logAgreementModify(
    context: AuditContext,
    agreementId: string,
    success: boolean,
    errorMessage?: string
  ): FederationAuditLog {
    const entry: FederationAuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      operation: 'agreement_modify',
      agreementId,
      partnerId: context.partnerId,
      userId: context.userId,
      success,
      errorMessage,
      metadata: {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    };

    this.auditLogs.push(entry);

    logger.info(
      {
        auditId: entry.id,
        operation: entry.operation,
        agreementId,
        success,
      },
      'Audit log: agreement_modify'
    );

    return entry;
  }

  /**
   * Query audit logs
   */
  query(filter: {
    startDate?: Date;
    endDate?: Date;
    operation?: string;
    agreementId?: string;
    partnerId?: string;
    userId?: string;
    success?: boolean;
  }): FederationAuditLog[] {
    let results = this.auditLogs;

    if (filter.startDate) {
      results = results.filter((log) => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter((log) => log.timestamp <= filter.endDate!);
    }

    if (filter.operation) {
      results = results.filter((log) => log.operation === filter.operation);
    }

    if (filter.agreementId) {
      results = results.filter((log) => log.agreementId === filter.agreementId);
    }

    if (filter.partnerId) {
      results = results.filter((log) => log.partnerId === filter.partnerId);
    }

    if (filter.userId) {
      results = results.filter((log) => log.userId === filter.userId);
    }

    if (filter.success !== undefined) {
      results = results.filter((log) => log.success === filter.success);
    }

    return results;
  }

  /**
   * Get audit trail for a specific agreement
   */
  getAgreementAuditTrail(agreementId: string): FederationAuditLog[] {
    return this.auditLogs
      .filter((log) => log.agreementId === agreementId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate audit report
   */
  generateReport(filter: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'operation' | 'agreement' | 'partner';
  }): any {
    const logs = this.query({
      startDate: filter.startDate,
      endDate: filter.endDate,
    });

    const report: any = {
      period: {
        start: filter.startDate,
        end: filter.endDate,
      },
      totalOperations: logs.length,
      successfulOperations: logs.filter((l) => l.success).length,
      failedOperations: logs.filter((l) => !l.success).length,
      byOperation: {} as Record<string, number>,
      byAgreement: {} as Record<string, number>,
      byPartner: {} as Record<string, number>,
    };

    // Group by operation
    for (const log of logs) {
      report.byOperation[log.operation] =
        (report.byOperation[log.operation] || 0) + 1;

      if (log.agreementId) {
        report.byAgreement[log.agreementId] =
          (report.byAgreement[log.agreementId] || 0) + 1;
      }

      if (log.partnerId) {
        report.byPartner[log.partnerId] =
          (report.byPartner[log.partnerId] || 0) + 1;
      }
    }

    return report;
  }

  /**
   * Export audit logs (for external storage)
   */
  exportLogs(
    startDate?: Date,
    endDate?: Date
  ): FederationAuditLog[] {
    return this.query({ startDate, endDate });
  }

  /**
   * Clear audit logs (for testing only)
   */
  clear(): void {
    this.auditLogs = [];
    logger.warn('Audit logs cleared (testing only)');
  }
}

export const auditLogger = new AuditLogger();
