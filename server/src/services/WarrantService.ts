/**
 * Warrant Service
 *
 * Manages legal warrants and authorities for data access.
 * Provides warrant validation, usage tracking, and audit integration.
 */

import { Pool } from 'pg';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export interface Warrant {
  id: string;
  warrantNumber: string;
  warrantType: 'search_warrant' | 'subpoena' | 'court_order' | 'consent' | 'administrative';
  issuingAuthority: string;
  issuedDate: Date;
  expiryDate?: Date;
  jurisdiction: string;
  scopeDescription: string;
  scopeConstraints: WarrantScopeConstraints;
  tenantId: string;
  status: 'active' | 'expired' | 'revoked' | 'superseded';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface WarrantScopeConstraints {
  resourceTypes?: string[];
  allowedOperations?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  purposes?: string[];
  maxSensitivity?: string;
  jurisdictions?: string[];
}

export interface WarrantUsage {
  id?: string;
  warrantId: string;
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId?: string;
  operation: string;
  purpose: string;
  reasonForAccess: string;
  timestamp: Date;
  auditEventId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  accessGranted: boolean;
  denialReason?: string;
  metadata?: Record<string, any>;
}

export interface WarrantValidationResult {
  valid: boolean;
  reason?: string;
  details?: {
    warrantStatus?: string;
    expired?: boolean;
    resourceNotCovered?: boolean;
    operationNotAllowed?: boolean;
    purposeMismatch?: boolean;
    timeRangeViolation?: boolean;
    sensitivityExceeded?: boolean;
  };
}

export interface WarrantSearchParams {
  tenantId?: string;
  status?: string;
  warrantType?: string;
  jurisdiction?: string;
  searchText?: string;
  issuedAfter?: Date;
  expiringBefore?: Date;
  limit?: number;
  offset?: number;
}

export class WarrantService extends EventEmitter {
  constructor(
    private db: Pool,
    private logger: Logger,
  ) {
    super();
    this.logger = logger.child({ component: 'warrant-service' });
  }

  /**
   * Create a new warrant
   */
  async createWarrant(
    warrant: Omit<Warrant, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Warrant['status'] },
  ): Promise<Warrant> {
    const id = randomUUID();
    const now = new Date();
    const status = warrant.status || 'active';

    this.logger.info({
      warrantNumber: warrant.warrantNumber,
      warrantType: warrant.warrantType,
      tenantId: warrant.tenantId,
    }, 'Creating new warrant');

    const result = await this.db.query(
      `
      INSERT INTO warrants (
        id, warrant_number, warrant_type, issuing_authority, issued_date,
        expiry_date, jurisdiction, scope_description, scope_constraints,
        tenant_id, status, created_by, created_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        id,
        warrant.warrantNumber,
        warrant.warrantType,
        warrant.issuingAuthority,
        warrant.issuedDate,
        warrant.expiryDate || null,
        warrant.jurisdiction,
        warrant.scopeDescription,
        JSON.stringify(warrant.scopeConstraints),
        warrant.tenantId,
        status,
        warrant.createdBy,
        now,
        now,
        JSON.stringify(warrant.metadata || {}),
      ],
    );

    const created = this.deserializeWarrant(result.rows[0]);

    this.emit('warrantCreated', created);
    this.logger.info({
      warrantId: id,
      warrantNumber: warrant.warrantNumber,
    }, 'Warrant created successfully');

    return created;
  }

  /**
   * Get warrant by ID
   */
  async getWarrant(id: string): Promise<Warrant | null> {
    const result = await this.db.query(
      'SELECT * FROM warrants WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserializeWarrant(result.rows[0]);
  }

  /**
   * Get warrant by warrant number
   */
  async getWarrantByNumber(warrantNumber: string, tenantId?: string): Promise<Warrant | null> {
    const query = tenantId
      ? 'SELECT * FROM warrants WHERE warrant_number = $1 AND tenant_id = $2'
      : 'SELECT * FROM warrants WHERE warrant_number = $1';

    const params = tenantId ? [warrantNumber, tenantId] : [warrantNumber];

    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserializeWarrant(result.rows[0]);
  }

  /**
   * Validate warrant for a specific access request
   */
  async validateWarrant(
    warrantId: string,
    context: {
      resourceType: string;
      resourceId?: string;
      operation: string;
      purpose: string;
      sensitivity?: string;
      jurisdiction?: string;
    },
  ): Promise<WarrantValidationResult> {
    const warrant = await this.getWarrant(warrantId);

    if (!warrant) {
      return {
        valid: false,
        reason: 'Warrant not found',
        details: {},
      };
    }

    const details: WarrantValidationResult['details'] = {};

    // Check status
    if (warrant.status !== 'active') {
      details.warrantStatus = warrant.status;
      return {
        valid: false,
        reason: `Warrant is ${warrant.status}`,
        details,
      };
    }

    // Check expiry
    if (warrant.expiryDate && new Date() > warrant.expiryDate) {
      details.expired = true;
      return {
        valid: false,
        reason: 'Warrant has expired',
        details,
      };
    }

    // Check resource type constraints
    if (
      warrant.scopeConstraints.resourceTypes &&
      warrant.scopeConstraints.resourceTypes.length > 0 &&
      !warrant.scopeConstraints.resourceTypes.includes(context.resourceType)
    ) {
      details.resourceNotCovered = true;
      return {
        valid: false,
        reason: `Warrant does not cover resource type: ${context.resourceType}. Allowed: ${warrant.scopeConstraints.resourceTypes.join(', ')}`,
        details,
      };
    }

    // Check operation constraints
    if (
      warrant.scopeConstraints.allowedOperations &&
      warrant.scopeConstraints.allowedOperations.length > 0 &&
      !warrant.scopeConstraints.allowedOperations.includes(context.operation)
    ) {
      details.operationNotAllowed = true;
      return {
        valid: false,
        reason: `Warrant does not allow operation: ${context.operation}. Allowed: ${warrant.scopeConstraints.allowedOperations.join(', ')}`,
        details,
      };
    }

    // Check purpose constraints
    if (
      warrant.scopeConstraints.purposes &&
      warrant.scopeConstraints.purposes.length > 0 &&
      !warrant.scopeConstraints.purposes.includes(context.purpose)
    ) {
      details.purposeMismatch = true;
      return {
        valid: false,
        reason: `Warrant does not cover purpose: ${context.purpose}. Allowed: ${warrant.scopeConstraints.purposes.join(', ')}`,
        details,
      };
    }

    // Check time range
    if (warrant.scopeConstraints.timeRange) {
      const now = new Date();
      if (
        now < warrant.scopeConstraints.timeRange.start ||
        now > warrant.scopeConstraints.timeRange.end
      ) {
        details.timeRangeViolation = true;
        return {
          valid: false,
          reason: `Current time outside warrant time range (${warrant.scopeConstraints.timeRange.start.toISOString()} - ${warrant.scopeConstraints.timeRange.end.toISOString()})`,
          details,
        };
      }
    }

    // Check sensitivity level
    if (
      warrant.scopeConstraints.maxSensitivity &&
      context.sensitivity
    ) {
      const sensitivityLevels = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
      const maxIndex = sensitivityLevels.indexOf(warrant.scopeConstraints.maxSensitivity);
      const requestedIndex = sensitivityLevels.indexOf(context.sensitivity);

      if (requestedIndex > maxIndex) {
        details.sensitivityExceeded = true;
        return {
          valid: false,
          reason: `Requested sensitivity (${context.sensitivity}) exceeds warrant maximum (${warrant.scopeConstraints.maxSensitivity})`,
          details,
        };
      }
    }

    // Check jurisdiction
    if (
      warrant.scopeConstraints.jurisdictions &&
      warrant.scopeConstraints.jurisdictions.length > 0 &&
      context.jurisdiction &&
      !warrant.scopeConstraints.jurisdictions.includes(context.jurisdiction)
    ) {
      return {
        valid: false,
        reason: `Jurisdiction mismatch: ${context.jurisdiction} not covered by warrant`,
        details,
      };
    }

    return { valid: true };
  }

  /**
   * Record warrant usage
   */
  async recordWarrantUsage(usage: Omit<WarrantUsage, 'id'>): Promise<string> {
    const id = randomUUID();

    this.logger.debug({
      warrantId: usage.warrantId,
      userId: usage.userId,
      resourceType: usage.resourceType,
      operation: usage.operation,
      accessGranted: usage.accessGranted,
    }, 'Recording warrant usage');

    await this.db.query(
      `
      INSERT INTO warrant_usage (
        id, warrant_id, user_id, tenant_id, resource_type, resource_id,
        operation, purpose, reason_for_access, timestamp, audit_event_id,
        ip_address, user_agent, session_id, access_granted, denial_reason, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
      [
        id,
        usage.warrantId,
        usage.userId,
        usage.tenantId,
        usage.resourceType,
        usage.resourceId || null,
        usage.operation,
        usage.purpose,
        usage.reasonForAccess,
        usage.timestamp,
        usage.auditEventId || null,
        usage.ipAddress || null,
        usage.userAgent || null,
        usage.sessionId || null,
        usage.accessGranted,
        usage.denialReason || null,
        JSON.stringify(usage.metadata || {}),
      ],
    );

    this.emit('warrantUsed', { ...usage, id });
    return id;
  }

  /**
   * Get warrant usage history
   */
  async getWarrantUsage(warrantId: string, limit = 100, offset = 0): Promise<WarrantUsage[]> {
    const result = await this.db.query(
      `
      SELECT * FROM warrant_usage
      WHERE warrant_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
      `,
      [warrantId, limit, offset],
    );

    return result.rows.map(this.deserializeWarrantUsage);
  }

  /**
   * Get usage statistics for a warrant
   */
  async getWarrantUsageStats(warrantId: string): Promise<{
    totalUses: number;
    successfulUses: number;
    deniedUses: number;
    uniqueUsers: number;
    lastUsed?: Date;
    mostCommonPurpose?: string;
  }> {
    const result = await this.db.query(
      `
      SELECT
        COUNT(*) as total_uses,
        COUNT(*) FILTER (WHERE access_granted = true) as successful_uses,
        COUNT(*) FILTER (WHERE access_granted = false) as denied_uses,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(timestamp) as last_used,
        MODE() WITHIN GROUP (ORDER BY purpose) as most_common_purpose
      FROM warrant_usage
      WHERE warrant_id = $1
      `,
      [warrantId],
    );

    const row = result.rows[0];
    return {
      totalUses: parseInt(row.total_uses),
      successfulUses: parseInt(row.successful_uses),
      deniedUses: parseInt(row.denied_uses),
      uniqueUsers: parseInt(row.unique_users),
      lastUsed: row.last_used,
      mostCommonPurpose: row.most_common_purpose,
    };
  }

  /**
   * Search warrants
   */
  async searchWarrants(params: WarrantSearchParams): Promise<{
    warrants: Warrant[];
    total: number;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(params.tenantId);
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.warrantType) {
      conditions.push(`warrant_type = $${paramIndex++}`);
      values.push(params.warrantType);
    }

    if (params.jurisdiction) {
      conditions.push(`jurisdiction = $${paramIndex++}`);
      values.push(params.jurisdiction);
    }

    if (params.issuedAfter) {
      conditions.push(`issued_date >= $${paramIndex++}`);
      values.push(params.issuedAfter);
    }

    if (params.expiringBefore) {
      conditions.push(`expiry_date <= $${paramIndex++}`);
      values.push(params.expiringBefore);
    }

    if (params.searchText) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex++})`);
      values.push(params.searchText);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM warrants ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const result = await this.db.query(
      `
      SELECT * FROM warrants
      ${whereClause}
      ORDER BY issued_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
      [...values, limit, offset],
    );

    return {
      warrants: result.rows.map(this.deserializeWarrant),
      total,
    };
  }

  /**
   * List active warrants for a tenant
   */
  async listActiveWarrants(tenantId: string): Promise<Warrant[]> {
    const result = await this.db.query(
      `
      SELECT * FROM warrants
      WHERE tenant_id = $1 AND status = 'active'
      AND (expiry_date IS NULL OR expiry_date > NOW())
      ORDER BY issued_date DESC
      `,
      [tenantId],
    );

    return result.rows.map(this.deserializeWarrant);
  }

  /**
   * Update warrant status
   */
  async updateWarrantStatus(
    warrantId: string,
    status: Warrant['status'],
    updatedBy: string,
  ): Promise<void> {
    this.logger.info({
      warrantId,
      newStatus: status,
      updatedBy,
    }, 'Updating warrant status');

    await this.db.query(
      `
      UPDATE warrants
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [status, warrantId],
    );

    this.emit('warrantStatusChanged', { warrantId, status, updatedBy });
  }

  /**
   * Revoke a warrant
   */
  async revokeWarrant(warrantId: string, revokedBy: string, reason?: string): Promise<void> {
    await this.updateWarrantStatus(warrantId, 'revoked', revokedBy);

    this.logger.warn({
      warrantId,
      revokedBy,
      reason,
    }, 'Warrant revoked');

    this.emit('warrantRevoked', { warrantId, revokedBy, reason });
  }

  /**
   * Extend warrant expiry date
   */
  async extendWarrant(warrantId: string, newExpiryDate: Date, extendedBy: string): Promise<void> {
    this.logger.info({
      warrantId,
      newExpiryDate,
      extendedBy,
    }, 'Extending warrant expiry date');

    await this.db.query(
      `
      UPDATE warrants
      SET expiry_date = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [newExpiryDate, warrantId],
    );

    this.emit('warrantExtended', { warrantId, newExpiryDate, extendedBy });
  }

  /**
   * Expire old warrants (should be run periodically)
   */
  async expireOldWarrants(): Promise<number> {
    const result = await this.db.query(
      `
      UPDATE warrants
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date < NOW()
      RETURNING id
      `,
    );

    const expiredCount = result.rows.length;

    if (expiredCount > 0) {
      this.logger.info({ expiredCount }, 'Expired old warrants');
      this.emit('warrantsExpired', { count: expiredCount, warrantIds: result.rows.map(r => r.id) });
    }

    return expiredCount;
  }

  /**
   * Get warrants expiring soon
   */
  async getExpiringWarrants(daysAhead: number = 30): Promise<Warrant[]> {
    const result = await this.db.query(
      `
      SELECT * FROM warrants
      WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date <= NOW() + INTERVAL '${daysAhead} days'
      AND expiry_date > NOW()
      ORDER BY expiry_date ASC
      `,
    );

    return result.rows.map(this.deserializeWarrant);
  }

  /**
   * Delete warrant (use with caution - for testing only)
   */
  async deleteWarrant(warrantId: string): Promise<void> {
    this.logger.warn({ warrantId }, 'Deleting warrant - this should only be used for testing');

    await this.db.query('DELETE FROM warrants WHERE id = $1', [warrantId]);

    this.emit('warrantDeleted', { warrantId });
  }

  /**
   * Deserialize warrant from database row
   */
  private deserializeWarrant(row: any): Warrant {
    return {
      id: row.id,
      warrantNumber: row.warrant_number,
      warrantType: row.warrant_type,
      issuingAuthority: row.issuing_authority,
      issuedDate: row.issued_date,
      expiryDate: row.expiry_date,
      jurisdiction: row.jurisdiction,
      scopeDescription: row.scope_description,
      scopeConstraints: row.scope_constraints,
      tenantId: row.tenant_id,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata || {},
    };
  }

  /**
   * Deserialize warrant usage from database row
   */
  private deserializeWarrantUsage(row: any): WarrantUsage {
    return {
      id: row.id,
      warrantId: row.warrant_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      operation: row.operation,
      purpose: row.purpose,
      reasonForAccess: row.reason_for_access,
      timestamp: row.timestamp,
      auditEventId: row.audit_event_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      accessGranted: row.access_granted,
      denialReason: row.denial_reason,
      metadata: row.metadata || {},
    };
  }
}
