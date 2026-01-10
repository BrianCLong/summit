import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { pg } from '../../db/pg.js';
import { SIEMEvent, Severity } from '../../siem/types.js';
import { SIEMSink } from '../../siem/sink.js';
import logger from '../../utils/logger.js';
import { RedactionService } from '../../ai/copilot/redaction.service.js';

/**
 * SIEM Export Service
 *
 * Provides enterprise-grade SIEM integration with:
 * - Push (webhook/batch) with retry and idempotency
 * - Pull (time-bounded query endpoint)
 * - Common SIEM field mapping (CEF/LEEF compatible)
 * - Tenant isolation and redaction enforcement
 *
 * Conforms to Export Contract v1.0.0 (SecuritySignalExport)
 */

// Export contracts (aligned with EXPORT_CONTRACTS.md)
export interface SecuritySignalExport {
  schemaVersion: '1.0.0';
  exportedAt: string;

  // Signal identification
  id: string;
  timestamp: string;
  severity: Severity;

  // SIEM common fields (CEF/LEEF compatible)
  category: SecurityCategory;
  signatureId: string;
  name: string;

  // Actor
  sourceUser?: string;
  sourceTenant: string;
  sourceIp?: string;

  // Target
  destinationResource?: string;
  destinationResourceId?: string;

  // Outcome
  outcome: 'success' | 'failure' | 'blocked';
  message: string;

  // Context
  requestId?: string;
  correlationId?: string;

  // Security metadata
  ruleId?: string;
  policyVersion?: string;
  threatScore?: number;

  // Raw event reference
  auditEventId: string;

  // Compliance
  complianceFrameworks: string[];
}

export type SecurityCategory =
  | 'Authentication'
  | 'Authorization'
  | 'DataAccess'
  | 'PolicyViolation'
  | 'RateLimiting'
  | 'Anomaly'
  | 'SystemIntegrity';

export interface SIEMExportRequest {
  tenantId: string;
  startTime: Date;
  endTime: Date;
  category?: SecurityCategory;
  minSeverity?: Severity;
  limit?: number;
  cursor?: string;
}

export interface SIEMExportResponse {
  signals: SecuritySignalExport[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export interface SIEMPushConfig {
  tenantId: string;
  enabled: boolean;
  mode: 'webhook' | 'batch';
  endpoint?: string;
  batchSize?: number;
  batchIntervalSeconds?: number;
  retryMaxAttempts?: number;
  retryBackoffMs?: number;
}

interface IdempotencyRecord {
  id: string;
  tenantId: string;
  eventId: string;
  exportedAt: Date;
  hash: string;
}

export class SIEMExportService {
  private redactionService: RedactionService;
  private severityOrder: Record<Severity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  constructor() {
    this.redactionService = new RedactionService();
  }

  /**
   * Pull-based export: Query security signals within a time range
   */
  async querySecuritySignals(request: SIEMExportRequest): Promise<SIEMExportResponse> {
    const {
      tenantId,
      startTime,
      endTime,
      category,
      minSeverity,
      limit = 1000,
      cursor
    } = request;

    // Build query with tenant isolation
    let query = `
      SELECT
        ae.id,
        ae.event_type,
        ae.timestamp,
        ae.level as severity,
        ae.user_id,
        ae.tenant_id,
        ae.correlation_id,
        ae.request_id,
        ae.action,
        ae.outcome,
        ae.message,
        ae.details,
        ae.resource_type,
        ae.resource_id,
        ae.compliance_frameworks,
        ae.ip_address,
        ae.policy_id,
        ae.policy_version
      FROM audit.events ae
      WHERE ae.tenant_id = $1
        AND ae.timestamp >= $2
        AND ae.timestamp <= $3
        AND ae.compliance_relevant = true
    `;

    const params: any[] = [tenantId, startTime, endTime];
    let paramIndex = 4;

    // Filter by category
    if (category) {
      query += ` AND ae.details->>'category' = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Filter by minimum severity
    if (minSeverity) {
      const minSeverityValue = this.severityOrder[minSeverity];
      query += ` AND (
        CASE ae.level
          WHEN 'critical' THEN 4
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END
      ) >= $${paramIndex}`;
      params.push(minSeverityValue);
      paramIndex++;
    }

    // Cursor-based pagination
    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const [lastTimestamp, lastId] = decodedCursor.split('|');
      query += ` AND (ae.timestamp, ae.id) > ($${paramIndex}, $${paramIndex + 1})`;
      params.push(new Date(lastTimestamp), lastId);
      paramIndex += 2;
    }

    query += ` ORDER BY ae.timestamp ASC, ae.id ASC LIMIT $${paramIndex}`;
    params.push(limit + 1); // Fetch one extra to determine hasMore

    const result = await pg.readMany(query, params);
    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    // Map to SecuritySignalExport format with redaction
    const signals = await Promise.all(
      rows.map((row: any) => this.mapToSecuritySignal(row, tenantId))
    );

    // Generate next cursor
    let nextCursor: string | undefined;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const cursorData = `${lastRow.timestamp.toISOString()}|${lastRow.id}`;
      nextCursor = Buffer.from(cursorData).toString('base64');
    }

    return {
      signals,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined // Optional: could run COUNT query
      }
    };
  }

  /**
   * Push-based export: Send events to SIEM with retry and idempotency
   */
  async pushSecuritySignal(
    tenantId: string,
    auditEventId: string,
    sink: SIEMSink,
    config: SIEMPushConfig
  ): Promise<void> {
    // Check idempotency
    if (await this.isAlreadyExported(tenantId, auditEventId)) {
      logger.debug('Event already exported, skipping', { tenantId, auditEventId });
      return;
    }

    // Fetch audit event
    const result = await pg.readMany(
      `SELECT * FROM audit.events WHERE id = $1 AND tenant_id = $2`,
      [auditEventId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Audit event not found: ${auditEventId}`);
    }

    const signal = await this.mapToSecuritySignal(result.rows[0], tenantId);

    // Retry logic with exponential backoff
    const maxAttempts = config.retryMaxAttempts || 4;
    const baseBackoffMs = config.retryBackoffMs || 2000;

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Convert SecuritySignalExport to SIEMEvent format
        const siemEvent = this.convertToSIEMEvent(signal);
        await sink.send([siemEvent]);

        // Record idempotency
        await this.recordExport(tenantId, auditEventId, signal);

        logger.info('Successfully pushed security signal to SIEM', {
          tenantId,
          auditEventId,
          attempt
        });
        return;
      } catch (error: any) {
        lastError = error;
        logger.warn('Failed to push to SIEM, will retry', {
          tenantId,
          auditEventId,
          attempt,
          maxAttempts,
          error: error.message
        });

        if (attempt < maxAttempts) {
          const backoffMs = baseBackoffMs * Math.pow(2, attempt - 1);
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to push to SIEM after ${maxAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Batch export: Send multiple signals in a single batch
   */
  async pushBatch(
    tenantId: string,
    auditEventIds: string[],
    sink: SIEMSink,
    config: SIEMPushConfig
  ): Promise<void> {
    const batchSize = config.batchSize || 100;
    const batches = this.chunkArray(auditEventIds, batchSize);

    for (const batch of batches) {
      await Promise.all(
        batch.map(eventId => this.pushSecuritySignal(tenantId, eventId, sink, config))
      );
    }
  }

  /**
   * Map audit event to SecuritySignalExport with redaction
   */
  private async mapToSecuritySignal(
    row: any,
    tenantId: string
  ): Promise<SecuritySignalExport> {
    // Apply redaction
    const redactionPolicy = {
      maxClassification: 'CONFIDENTIAL' as const,
      policyLabels: []
    };

    const redactedMessage = await this.redactionService.redact(
      row.message || '',
      redactionPolicy
    );

    const redactedDetails = await this.redactionService.redact(
      JSON.stringify(row.details || {}),
      redactionPolicy
    );

    // Anonymize IP address (last octet)
    const anonymizedIp = row.ip_address
      ? this.anonymizeIp(row.ip_address)
      : undefined;

    // Determine category from event type
    const category = this.mapEventTypeToCategory(row.event_type);

    // Calculate threat score from severity
    const threatScore = this.calculateThreatScore(row.severity, row.details);

    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),

      id: uuidv4(),
      timestamp: row.timestamp.toISOString(),
      severity: row.severity as Severity,

      category,
      signatureId: this.generateSignatureId(row.event_type, category),
      name: this.generateSignalName(row.event_type),

      sourceUser: row.user_id ? `user_${this.hashId(row.user_id)}` : undefined,
      sourceTenant: tenantId,
      sourceIp: anonymizedIp,

      destinationResource: row.resource_type,
      destinationResourceId: row.resource_id
        ? `resource_${this.hashId(row.resource_id)}`
        : undefined,

      outcome: this.mapOutcome(row.outcome),
      message: redactedMessage,

      requestId: row.request_id,
      correlationId: row.correlation_id,

      ruleId: row.policy_id,
      policyVersion: row.policy_version,
      threatScore,

      auditEventId: row.id,

      complianceFrameworks: row.compliance_frameworks || []
    };
  }

  /**
   * Convert SecuritySignalExport to SIEMEvent format
   */
  private convertToSIEMEvent(signal: SecuritySignalExport): SIEMEvent {
    return {
      id: signal.id,
      timestamp: new Date(signal.timestamp),
      eventType: signal.signatureId,
      source: 'summit',
      severity: signal.severity,
      message: signal.message,
      userId: signal.sourceUser,
      tenantId: signal.sourceTenant,
      ipAddress: signal.sourceIp,
      userAgent: undefined,
      details: {
        category: signal.category,
        outcome: signal.outcome,
        destinationResource: signal.destinationResource,
        destinationResourceId: signal.destinationResourceId,
        requestId: signal.requestId,
        correlationId: signal.correlationId,
        ruleId: signal.ruleId,
        policyVersion: signal.policyVersion,
        threatScore: signal.threatScore,
        auditEventId: signal.auditEventId,
        complianceFrameworks: signal.complianceFrameworks
      },
      tags: [signal.category, `severity:${signal.severity}`]
    };
  }

  /**
   * Map event type to security category
   */
  private mapEventTypeToCategory(eventType: string): SecurityCategory {
    if (eventType.startsWith('auth_')) return 'Authentication';
    if (eventType.startsWith('authz_')) return 'Authorization';
    if (eventType.startsWith('data_')) return 'DataAccess';
    if (eventType.includes('policy_violation')) return 'PolicyViolation';
    if (eventType.includes('rate_limit')) return 'RateLimiting';
    if (eventType.includes('anomaly')) return 'Anomaly';
    return 'SystemIntegrity';
  }

  /**
   * Generate signature ID (unique identifier for signal type)
   */
  private generateSignatureId(eventType: string, category: SecurityCategory): string {
    return `SUMMIT-${category.toUpperCase()}-${eventType.toUpperCase()}`;
  }

  /**
   * Generate human-readable signal name
   */
  private generateSignalName(eventType: string): string {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Map outcome to standard values
   */
  private mapOutcome(outcome: string): 'success' | 'failure' | 'blocked' {
    if (outcome === 'success') return 'success';
    if (outcome === 'failure') return 'failure';
    return 'blocked';
  }

  /**
   * Calculate threat score (0-100)
   */
  private calculateThreatScore(severity: Severity, details: any): number {
    const baseScore = this.severityOrder[severity as Severity] * 25;

    // Adjust based on details (simple heuristic)
    let adjustment = 0;
    if (details?.repeated) adjustment += 10;
    if (details?.privileged) adjustment += 15;
    if (details?.external) adjustment += 10;

    return Math.min(100, baseScore + adjustment);
  }

  /**
   * Anonymize IP address (replace last octet)
   */
  private anonymizeIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'XXX';
      return parts.join('.');
    }
    // IPv6 or invalid format
    return '[REDACTED]';
  }

  /**
   * Hash ID for privacy
   */
  private hashId(id: string): string {
    return crypto.createHash('sha256').update(id).digest('hex').substring(0, 16);
  }

  /**
   * Check if event already exported (idempotency)
   */
  private async isAlreadyExported(tenantId: string, eventId: string): Promise<boolean> {
    const result = await pg.readMany(
      `SELECT 1 FROM siem_export_idempotency
       WHERE tenant_id = $1 AND event_id = $2`,
      [tenantId, eventId]
    );
    return result.rows.length > 0;
  }

  /**
   * Record export for idempotency
   */
  private async recordExport(
    tenantId: string,
    eventId: string,
    signal: SecuritySignalExport
  ): Promise<void> {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signal))
      .digest('hex');

    await pg.readMany(
      `INSERT INTO siem_export_idempotency (id, tenant_id, event_id, exported_at, hash)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (tenant_id, event_id) DO NOTHING`,
      [uuidv4(), tenantId, eventId, hash]
    );
  }

  /**
   * Utility: Sleep for milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const siemExportService = new SIEMExportService();
