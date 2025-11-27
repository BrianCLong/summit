/**
 * @fileoverview Case Audit Log - Immutable Hash-Chained Audit Trail
 *
 * Implements an append-only, tamper-evident audit log for case operations.
 * Each record is linked to the previous via SHA-256 hashing, creating a
 * blockchain-like structure that allows independent verification.
 *
 * Security Features:
 * - SHA-256 hash of record content + previous hash (chain integrity)
 * - Deterministic JSON serialization for reproducible hashes
 * - Append-only operations (no updates or deletes)
 * - Chain verification for tamper detection
 *
 * Compliance Features:
 * - Required reason-for-access on view operations
 * - Legal basis tracking
 * - Authority/warrant linkage
 * - Full session context (IP, user agent, correlation ID)
 *
 * @module cases/domain/CaseAuditLog
 */

import { createHash, randomUUID } from 'crypto';
import { Pool } from 'pg';
import {
  CaseAuditRecord,
  CaseAuditAction,
  AuditChainVerificationResult,
  ICaseAuditLogRepository,
  LegalBasis,
} from './CaseTypes.js';

/**
 * Input for creating an audit record (without computed fields)
 */
export interface CaseAuditRecordInput {
  caseId: string;
  tenantId: string;
  actorId: string;
  action: CaseAuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: {
    fieldChanged?: string;
    from?: unknown;
    to?: unknown;
    [key: string]: unknown;
  };
  reasonForAccess?: string;
  legalBasis?: LegalBasis;
  authorityId?: string;
  policyDecision?: {
    allow: boolean;
    reason: string;
  };
  sessionContext?: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  };
}

/**
 * Database row shape for audit records
 */
interface AuditRecordRow {
  audit_id: string;
  case_id: string;
  tenant_id: string;
  timestamp: Date;
  actor_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  reason_for_access: string | null;
  legal_basis: string | null;
  authority_id: string | null;
  policy_decision: { allow: boolean; reason: string } | null;
  session_context: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  } | null;
  prev_hash: string | null;
  hash: string;
}

/**
 * Case Audit Log Repository Implementation
 *
 * Provides append-only audit logging with hash-chain integrity
 */
export class CaseAuditLogRepository implements ICaseAuditLogRepository {
  private readonly tableName = 'maestro.case_audit_logs';

  /**
   * In-memory cache of last hash per case for performance
   * In production, this should be backed by Redis for multi-instance consistency
   */
  private lastHashCache: Map<string, string> = new Map();

  constructor(private readonly pool: Pool) {
    // Initialize cache on startup
    this.initializeHashCache().catch(err => {
      console.error('[CaseAuditLog] Failed to initialize hash cache:', err.message);
    });
  }

  /**
   * Initialize the hash cache from database
   */
  private async initializeHashCache(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT DISTINCT ON (case_id) case_id, hash
        FROM ${this.tableName}
        ORDER BY case_id, timestamp DESC
      `);

      for (const row of result.rows) {
        this.lastHashCache.set(row.case_id, row.hash);
      }
    } catch (error) {
      // Table might not exist yet - that's okay
      if ((error as NodeJS.ErrnoException).code !== '42P01') {
        throw error;
      }
    }
  }

  /**
   * Append a new audit record to the log
   *
   * @param input - Audit record input (without computed fields)
   * @returns The created audit record with hash and ID
   */
  async append(input: CaseAuditRecordInput): Promise<CaseAuditRecord> {
    const auditId = randomUUID();
    const timestamp = new Date().toISOString();

    // Get previous hash for this case
    const prevHash = await this.getLastHash(input.caseId);

    // Compute hash of this record
    const hash = this.computeHash({
      auditId,
      caseId: input.caseId,
      tenantId: input.tenantId,
      timestamp,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: input.details,
      reasonForAccess: input.reasonForAccess,
      legalBasis: input.legalBasis,
      authorityId: input.authorityId,
      prevHash,
    });

    // Insert into database
    const result = await this.pool.query(
      `
      INSERT INTO ${this.tableName} (
        audit_id, case_id, tenant_id, timestamp, actor_id, action,
        resource_type, resource_id, details, reason_for_access,
        legal_basis, authority_id, policy_decision, session_context,
        prev_hash, hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
      `,
      [
        auditId,
        input.caseId,
        input.tenantId,
        timestamp,
        input.actorId,
        input.action,
        input.resourceType || null,
        input.resourceId || null,
        input.details ? JSON.stringify(input.details) : null,
        input.reasonForAccess || null,
        input.legalBasis || null,
        input.authorityId || null,
        input.policyDecision ? JSON.stringify(input.policyDecision) : null,
        input.sessionContext ? JSON.stringify(input.sessionContext) : null,
        prevHash || null,
        hash,
      ]
    );

    // Update cache
    this.lastHashCache.set(input.caseId, hash);

    return this.mapRow(result.rows[0]);
  }

  /**
   * List audit records for a specific case
   *
   * @param caseId - Case identifier
   * @param limit - Maximum records to return (default 100)
   * @param offset - Offset for pagination (default 0)
   * @returns List of audit records ordered by timestamp DESC
   */
  async listByCase(
    caseId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<CaseAuditRecord[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
      `,
      [caseId, Math.min(limit, 10000), offset]
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * List audit records by actor (user)
   *
   * @param actorId - User identifier
   * @param tenantId - Tenant identifier (for isolation)
   * @param limit - Maximum records to return
   * @param offset - Offset for pagination
   * @returns List of audit records for this actor
   */
  async listByActor(
    actorId: string,
    tenantId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<CaseAuditRecord[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM ${this.tableName}
      WHERE actor_id = $1 AND tenant_id = $2
      ORDER BY timestamp DESC
      LIMIT $3 OFFSET $4
      `,
      [actorId, tenantId, Math.min(limit, 10000), offset]
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Get the hash of the last audit record for a case
   *
   * @param caseId - Case identifier
   * @returns Hash of the last record, or undefined if no records exist
   */
  async getLastHash(caseId: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.lastHashCache.get(caseId);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.pool.query(
      `
      SELECT hash FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
      `,
      [caseId]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const hash = result.rows[0].hash;
    this.lastHashCache.set(caseId, hash);
    return hash;
  }

  /**
   * Verify the integrity of the audit chain for a case
   *
   * This method independently recomputes all hashes and verifies
   * the chain linkage is intact. Use for compliance audits.
   *
   * @param caseId - Case identifier
   * @returns Verification result with detailed findings
   */
  async verifyChain(caseId: string): Promise<AuditChainVerificationResult> {
    // Get all records in chronological order
    const result = await this.pool.query(
      `
      SELECT * FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp ASC
      `,
      [caseId]
    );

    const records = result.rows.map(this.mapRow);

    if (records.length === 0) {
      return {
        ok: true,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
      };
    }

    const issues: AuditChainVerificationResult['issues'] = [];
    let validRecords = 0;
    let expectedPrevHash: string | undefined = undefined;

    for (const record of records) {
      // Check chain linkage
      if (expectedPrevHash !== undefined) {
        if (record.prevHash !== expectedPrevHash) {
          issues.push({
            auditId: record.auditId,
            issue: 'CHAIN_BROKEN',
            expected: expectedPrevHash,
            actual: record.prevHash || 'null',
          });
        }
      } else {
        // First record should have no prevHash
        if (record.prevHash) {
          issues.push({
            auditId: record.auditId,
            issue: 'CHAIN_BROKEN',
            expected: 'null',
            actual: record.prevHash,
          });
        }
      }

      // Recompute hash
      const computedHash = this.computeHash({
        auditId: record.auditId,
        caseId: record.caseId,
        tenantId: record.tenantId,
        timestamp: record.timestamp,
        actorId: record.actorId,
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        details: record.details,
        reasonForAccess: record.reasonForAccess,
        legalBasis: record.legalBasis,
        authorityId: record.authorityId,
        prevHash: record.prevHash,
      });

      if (computedHash !== record.hash) {
        issues.push({
          auditId: record.auditId,
          issue: 'HASH_MISMATCH',
          expected: computedHash,
          actual: record.hash,
        });
      } else {
        validRecords++;
      }

      // Update expected prev hash for next iteration
      expectedPrevHash = record.hash;
    }

    return {
      ok: issues.length === 0,
      totalRecords: records.length,
      validRecords,
      invalidRecords: issues.length,
      brokenAt: issues.length > 0 ? issues[0].auditId : undefined,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Query audit records with advanced filters
   *
   * @param filters - Query filters
   * @returns Matching audit records
   */
  async query(filters: {
    tenantId: string;
    caseId?: string;
    actorId?: string;
    action?: CaseAuditAction | CaseAuditAction[];
    startTime?: Date;
    endTime?: Date;
    legalBasis?: LegalBasis;
    authorityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CaseAuditRecord[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [filters.tenantId];
    let paramIndex = 2;

    if (filters.caseId) {
      conditions.push(`case_id = $${paramIndex++}`);
      params.push(filters.caseId);
    }

    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters.action) {
      if (Array.isArray(filters.action)) {
        conditions.push(`action = ANY($${paramIndex++})`);
        params.push(filters.action);
      } else {
        conditions.push(`action = $${paramIndex++}`);
        params.push(filters.action);
      }
    }

    if (filters.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.startTime.toISOString());
    }

    if (filters.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.endTime.toISOString());
    }

    if (filters.legalBasis) {
      conditions.push(`legal_basis = $${paramIndex++}`);
      params.push(filters.legalBasis);
    }

    if (filters.authorityId) {
      conditions.push(`authority_id = $${paramIndex++}`);
      params.push(filters.authorityId);
    }

    const limit = Math.min(filters.limit || 100, 10000);
    const offset = filters.offset || 0;

    params.push(limit, offset);

    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await this.pool.query(sql, params);
    return result.rows.map(this.mapRow);
  }

  /**
   * Get audit statistics for a case
   */
  async getStats(caseId: string): Promise<{
    totalRecords: number;
    uniqueActors: number;
    actionCounts: Record<string, number>;
    firstRecord?: string;
    lastRecord?: string;
    chainIntact: boolean;
  }> {
    const statsResult = await this.pool.query(
      `
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT actor_id) as unique_actors,
        MIN(timestamp) as first_record,
        MAX(timestamp) as last_record
      FROM ${this.tableName}
      WHERE case_id = $1
      `,
      [caseId]
    );

    const actionCountsResult = await this.pool.query(
      `
      SELECT action, COUNT(*) as count
      FROM ${this.tableName}
      WHERE case_id = $1
      GROUP BY action
      `,
      [caseId]
    );

    const actionCounts: Record<string, number> = {};
    for (const row of actionCountsResult.rows) {
      actionCounts[row.action] = parseInt(row.count, 10);
    }

    // Quick chain verification (just check we have continuous prev_hash linkage)
    const verification = await this.verifyChain(caseId);

    const stats = statsResult.rows[0];
    return {
      totalRecords: parseInt(stats.total_records, 10),
      uniqueActors: parseInt(stats.unique_actors, 10),
      actionCounts,
      firstRecord: stats.first_record?.toISOString(),
      lastRecord: stats.last_record?.toISOString(),
      chainIntact: verification.ok,
    };
  }

  /**
   * Compute SHA-256 hash for an audit record
   *
   * Uses deterministic JSON serialization to ensure reproducible hashes
   */
  private computeHash(data: {
    auditId: string;
    caseId: string;
    tenantId: string;
    timestamp: string;
    actorId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    reasonForAccess?: string;
    legalBasis?: string;
    authorityId?: string;
    prevHash?: string;
  }): string {
    // Create canonical representation with sorted keys
    const canonical = {
      auditId: data.auditId,
      caseId: data.caseId,
      tenantId: data.tenantId,
      timestamp: data.timestamp,
      actorId: data.actorId,
      action: data.action,
      resourceType: data.resourceType ?? null,
      resourceId: data.resourceId ?? null,
      details: data.details ? this.sortObjectKeys(data.details) : null,
      reasonForAccess: data.reasonForAccess ?? null,
      legalBasis: data.legalBasis ?? null,
      authorityId: data.authorityId ?? null,
      prevHash: data.prevHash ?? null,
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Recursively sort object keys for deterministic serialization
   */
  private sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item =>
        typeof item === 'object' && item !== null
          ? this.sortObjectKeys(item as Record<string, unknown>)
          : item
      ) as unknown as Record<string, unknown>;
    }

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const value = obj[key];
      sorted[key] =
        typeof value === 'object' && value !== null
          ? this.sortObjectKeys(value as Record<string, unknown>)
          : value;
    }
    return sorted;
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: AuditRecordRow): CaseAuditRecord {
    return {
      auditId: row.audit_id,
      caseId: row.case_id,
      tenantId: row.tenant_id,
      timestamp: row.timestamp.toISOString(),
      actorId: row.actor_id,
      action: row.action as CaseAuditAction,
      resourceType: row.resource_type || undefined,
      resourceId: row.resource_id || undefined,
      details: row.details || undefined,
      reasonForAccess: row.reason_for_access || undefined,
      legalBasis: (row.legal_basis as LegalBasis) || undefined,
      authorityId: row.authority_id || undefined,
      policyDecision: row.policy_decision || undefined,
      sessionContext: row.session_context || undefined,
      prevHash: row.prev_hash || undefined,
      hash: row.hash,
    };
  }
}

/**
 * Factory function to create CaseAuditLogRepository
 */
export function createCaseAuditLogRepository(pool: Pool): CaseAuditLogRepository {
  return new CaseAuditLogRepository(pool);
}

export default CaseAuditLogRepository;
