import { query } from '../postgres.js';
import { logger } from '../../utils/logger.js';
import type { AuditLogEntry } from '../../types/index.js';

const log = logger.child({ module: 'AuditRepository' });

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value: unknown;
  new_value: unknown;
  tenant_id: string | null;
  user_id: string;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: Date;
}

function rowToAuditEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type as AuditLogEntry['entityType'],
    entityId: row.entity_id,
    action: row.action as AuditLogEntry['action'],
    previousValue: row.previous_value,
    newValue: row.new_value,
    tenantId: row.tenant_id,
    userId: row.user_id,
    userEmail: row.user_email,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
  };
}

export interface AuditContext {
  userId: string;
  userEmail?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditRepository {
  /**
   * Log an audit entry.
   */
  async log(
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    action: AuditLogEntry['action'],
    context: AuditContext,
    previousValue?: unknown,
    newValue?: unknown,
  ): Promise<AuditLogEntry> {
    const result = await query<AuditLogRow>(
      `INSERT INTO config_audit_log (
        entity_type, entity_id, action, previous_value, new_value,
        tenant_id, user_id, user_email, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        entityType,
        entityId,
        action,
        previousValue ? JSON.stringify(previousValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        context.tenantId || null,
        context.userId,
        context.userEmail || null,
        context.ipAddress || null,
        context.userAgent || null,
      ],
    );

    const entry = rowToAuditEntry(result.rows[0]);
    log.debug(
      { entityType, entityId, action, userId: context.userId },
      'Audit entry logged',
    );
    return entry;
  }

  /**
   * Get audit history for an entity.
   */
  async getEntityHistory(
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM config_audit_log
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId],
    );

    const result = await query<AuditLogRow>(
      `SELECT * FROM config_audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY timestamp DESC
       LIMIT $3 OFFSET $4`,
      [entityType, entityId, limit, offset],
    );

    return {
      entries: result.rows.map(rowToAuditEntry),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get audit logs by tenant.
   */
  async getByTenant(
    tenantId: string | null,
    options?: {
      entityType?: AuditLogEntry['entityType'];
      action?: AuditLogEntry['action'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const conditions: string[] = ['tenant_id IS NOT DISTINCT FROM $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options?.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(options.entityType);
    }

    if (options?.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(options.action);
    }

    if (options?.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options?.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM config_audit_log ${whereClause}`,
      params,
    );

    const result = await query<AuditLogRow>(
      `SELECT * FROM config_audit_log ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );

    return {
      entries: result.rows.map(rowToAuditEntry),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get recent audit logs by user.
   */
  async getByUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM config_audit_log WHERE user_id = $1`,
      [userId],
    );

    const result = await query<AuditLogRow>(
      `SELECT * FROM config_audit_log
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      entries: result.rows.map(rowToAuditEntry),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Prune old audit logs.
   */
  async prune(retentionDays: number): Promise<number> {
    const result = await query(
      `DELETE FROM config_audit_log
       WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays],
    );

    const deleted = result.rowCount ?? 0;
    if (deleted > 0) {
      log.info({ deleted, retentionDays }, 'Pruned old audit logs');
    }
    return deleted;
  }
}

export const auditRepository = new AuditRepository();
