/**
 * Audit Access Log Repository - Immutable audit logging for case access
 * Implements append-only logging with reason-for-access and legal basis tracking
 */

// @ts-ignore - pg type imports
import { Pool } from 'pg';
import { randomUUID as uuidv4, createHash } from 'crypto';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'AuditAccessLogRepo' });

export type LegalBasis =
  | 'investigation'
  | 'law_enforcement'
  | 'regulatory_compliance'
  | 'court_order'
  | 'national_security'
  | 'legitimate_interest'
  | 'consent'
  | 'contract_performance'
  | 'vital_interests'
  | 'public_interest';

export interface AuditAccessLog {
  id: string;
  tenantId: string;
  caseId: string;
  userId: string;

  // Access details
  action: string;
  resourceType?: string;
  resourceId?: string;

  // Required fields for compliance
  reason: string;
  legalBasis: LegalBasis;

  // Warrant/authority tracking
  warrantId?: string;
  authorityReference?: string;
  approvalChain: Array<{
    approver: string;
    timestamp: Date;
    decision: 'approved' | 'rejected';
  }>;

  // Audit metadata
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;

  // Immutability support
  createdAt: Date;
  hash?: string;
  previousHash?: string;

  // Additional metadata
  metadata: Record<string, any>;
}

export interface AuditAccessLogInput {
  tenantId: string;
  caseId: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;

  // REQUIRED
  reason: string;
  legalBasis: LegalBasis;

  // Optional
  warrantId?: string;
  authorityReference?: string;
  approvalChain?: Array<{
    approver: string;
    timestamp: Date;
    decision: 'approved' | 'rejected';
  }>;

  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;

  metadata?: Record<string, any>;
}

interface AuditAccessLogRow {
  id: string;
  tenant_id: string;
  case_id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  reason: string;
  legal_basis: string;
  warrant_id: string | null;
  authority_reference: string | null;
  approval_chain: any;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  request_id: string | null;
  correlation_id: string | null;
  created_at: Date;
  hash: string | null;
  previous_hash: string | null;
  metadata: any;
}

export interface AuditQuery {
  tenantId: string;
  caseId?: string;
  userId?: string;
  action?: string;
  legalBasis?: LegalBasis;
  startTime?: Date;
  endTime?: Date;
  warrantId?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export class AuditAccessLogRepo {
  private lastHash: string = '';

  constructor(private pg: Pool) {
    this.initializeLastHash();
  }

  /**
   * Initialize the last hash from the database
   */
  private async initializeLastHash(): Promise<void> {
    try {
      const { rows } = await this.pg.query(
        `SELECT hash FROM maestro.audit_access_logs
         ORDER BY created_at DESC LIMIT 1`,
      );
      if (rows[0]?.hash) {
        this.lastHash = rows[0].hash;
      }
    } catch (error) {
      repoLogger.warn(
        { error: (error as Error).message },
        'Failed to initialize last hash',
      );
    }
  }

  /**
   * Log an access event - PRIMARY FUNCTION
   * This is the main entry point for recording access to cases
   */
  async logAccess(input: AuditAccessLogInput): Promise<AuditAccessLog> {
    // Validate required fields
    if (!input.reason || input.reason.trim() === '') {
      throw new Error(
        'Reason is required for audit logging. Access denied without proper justification.',
      );
    }

    if (!input.legalBasis) {
      throw new Error(
        'Legal basis is required for audit logging. Access denied without legal justification.',
      );
    }

    const id = uuidv4();

    // Calculate hash for integrity
    const hash = this.calculateHash({
      id,
      tenantId: input.tenantId,
      caseId: input.caseId,
      userId: input.userId,
      action: input.action,
      reason: input.reason,
      legalBasis: input.legalBasis,
      timestamp: new Date(),
    });

    const previousHash = this.lastHash || null;
    this.lastHash = hash;

    try {
      const { rows } = (await this.pg.query(
        `INSERT INTO maestro.audit_access_logs (
          id, tenant_id, case_id, user_id, action, resource_type, resource_id,
          reason, legal_basis, warrant_id, authority_reference, approval_chain,
          ip_address, user_agent, session_id, request_id, correlation_id,
          hash, previous_hash, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          id,
          input.tenantId,
          input.caseId,
          input.userId,
          input.action,
          input.resourceType || null,
          input.resourceId || null,
          input.reason,
          input.legalBasis,
          input.warrantId || null,
          input.authorityReference || null,
          JSON.stringify(input.approvalChain || []),
          input.ipAddress || null,
          input.userAgent || null,
          input.sessionId || null,
          input.requestId || null,
          input.correlationId || null,
          hash,
          previousHash,
          JSON.stringify(input.metadata || {}),
        ],
      )) as { rows: AuditAccessLogRow[] };

      const log = this.mapRow(rows[0]);

      repoLogger.info(
        {
          logId: id,
          tenantId: input.tenantId,
          caseId: input.caseId,
          userId: input.userId,
          action: input.action,
          legalBasis: input.legalBasis,
        },
        'Access logged to audit trail',
      );

      return log;
    } catch (error) {
      repoLogger.error(
        {
          error: (error as Error).message,
          input,
        },
        'Failed to log access',
      );
      throw error;
    }
  }

  /**
   * Query audit logs with advanced filtering
   */
  async query(query: AuditQuery): Promise<AuditAccessLog[]> {
    const params: any[] = [query.tenantId];
    let sql = `SELECT * FROM maestro.audit_access_logs WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (query.caseId) {
      sql += ` AND case_id = $${paramIndex}`;
      params.push(query.caseId);
      paramIndex++;
    }

    if (query.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(query.userId);
      paramIndex++;
    }

    if (query.action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(query.action);
      paramIndex++;
    }

    if (query.legalBasis) {
      sql += ` AND legal_basis = $${paramIndex}`;
      params.push(query.legalBasis);
      paramIndex++;
    }

    if (query.startTime) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(query.startTime);
      paramIndex++;
    }

    if (query.endTime) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(query.endTime);
      paramIndex++;
    }

    if (query.warrantId) {
      sql += ` AND warrant_id = $${paramIndex}`;
      params.push(query.warrantId);
      paramIndex++;
    }

    if (query.correlationId) {
      sql += ` AND correlation_id = $${paramIndex}`;
      params.push(query.correlationId);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC`;

    if (query.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(Math.min(query.limit, 10000));
      paramIndex++;
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(query.offset);
      paramIndex++;
    }

    const { rows } = (await this.pg.query(sql, params)) as {
      rows: AuditAccessLogRow[];
    };
    return rows.map(this.mapRow);
  }

  /**
   * Get audit logs for a specific case
   */
  async getLogsForCase(
    caseId: string,
    tenantId: string,
    limit = 100,
  ): Promise<AuditAccessLog[]> {
    return this.query({ tenantId, caseId, limit });
  }

  /**
   * Get audit logs for a specific user
   */
  async getLogsForUser(
    userId: string,
    tenantId: string,
    limit = 100,
  ): Promise<AuditAccessLog[]> {
    return this.query({ tenantId, userId, limit });
  }

  /**
   * Get audit logs by correlation ID (for tracking related operations)
   */
  async getLogsByCorrelationId(
    correlationId: string,
    tenantId: string,
  ): Promise<AuditAccessLog[]> {
    return this.query({ tenantId, correlationId });
  }

  /**
   * Count audit logs with filters
   */
  async count(query: Omit<AuditQuery, 'limit' | 'offset'>): Promise<number> {
    const params: any[] = [query.tenantId];
    let sql = `SELECT COUNT(*) as count FROM maestro.audit_access_logs WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (query.caseId) {
      sql += ` AND case_id = $${paramIndex}`;
      params.push(query.caseId);
      paramIndex++;
    }

    if (query.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(query.userId);
      paramIndex++;
    }

    if (query.action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(query.action);
      paramIndex++;
    }

    if (query.legalBasis) {
      sql += ` AND legal_basis = $${paramIndex}`;
      params.push(query.legalBasis);
      paramIndex++;
    }

    if (query.startTime) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(query.startTime);
      paramIndex++;
    }

    if (query.endTime) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(query.endTime);
      paramIndex++;
    }

    if (query.warrantId) {
      sql += ` AND warrant_id = $${paramIndex}`;
      params.push(query.warrantId);
      paramIndex++;
    }

    if (query.correlationId) {
      sql += ` AND correlation_id = $${paramIndex}`;
      params.push(query.correlationId);
      paramIndex++;
    }

    const { rows } = await this.pg.query(sql, params);
    return parseInt(rows[0]?.count || '0', 10);
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    valid: boolean;
    totalLogs: number;
    validLogs: number;
    invalidLogs: Array<{ id: string; issue: string }>;
  }> {
    const logs = await this.query({
      tenantId,
      startTime: startDate,
      endTime: endDate,
      limit: 10000,
    });

    let validLogs = 0;
    const invalidLogs: Array<{ id: string; issue: string }> = [];
    let expectedPreviousHash: string | undefined = undefined;

    for (const log of logs.reverse()) {
      // Verify hash
      const calculatedHash = this.calculateHash({
        id: log.id,
        tenantId: log.tenantId,
        caseId: log.caseId,
        userId: log.userId,
        action: log.action,
        reason: log.reason,
        legalBasis: log.legalBasis,
        timestamp: log.createdAt,
      });

      if (log.hash !== calculatedHash) {
        invalidLogs.push({
          id: log.id,
          issue: 'Hash mismatch - possible tampering',
        });
        continue;
      }

      // Verify chain integrity
      if (
        expectedPreviousHash !== undefined &&
        log.previousHash !== expectedPreviousHash
      ) {
        invalidLogs.push({
          id: log.id,
          issue: 'Chain integrity violation',
        });
      }

      expectedPreviousHash = log.hash;
      validLogs++;
    }

    const result = {
      valid: invalidLogs.length === 0,
      totalLogs: logs.length,
      validLogs,
      invalidLogs,
    };

    repoLogger.info(result, 'Audit trail integrity verification completed');

    return result;
  }

  /**
   * Calculate hash for integrity verification
   */
  private calculateHash(data: {
    id: string;
    tenantId: string;
    caseId: string;
    userId: string;
    action: string;
    reason: string;
    legalBasis: string;
    timestamp: Date;
  }): string {
    const hashableData = {
      id: data.id,
      tenantId: data.tenantId,
      caseId: data.caseId,
      userId: data.userId,
      action: data.action,
      reason: data.reason,
      legalBasis: data.legalBasis,
      timestamp: data.timestamp.toISOString(),
    };

    return createHash('sha256')
      .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
      .digest('hex');
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: AuditAccessLogRow): AuditAccessLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      caseId: row.case_id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type || undefined,
      resourceId: row.resource_id || undefined,
      reason: row.reason,
      legalBasis: row.legal_basis as LegalBasis,
      warrantId: row.warrant_id || undefined,
      authorityReference: row.authority_reference || undefined,
      approvalChain: row.approval_chain || [],
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      sessionId: row.session_id || undefined,
      requestId: row.request_id || undefined,
      correlationId: row.correlation_id || undefined,
      createdAt: row.created_at,
      hash: row.hash || undefined,
      previousHash: row.previous_hash || undefined,
      metadata: row.metadata || {},
    };
  }
}
