/**
 * CompanyOS Audit Service
 *
 * Handles audit logging for tenant operations
 */

import { pool } from '../db/postgres.js';
import type { TenantAuditEvent, AuditAction } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEventInput {
  tenantId?: string;
  eventType: string;
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  actorIp?: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function rowToAuditEvent(row: any): TenantAuditEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    action: row.action,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorIp: row.actor_ip,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    changes: row.changes || {},
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
  };
}

export class AuditService {
  /**
   * Log an audit event
   */
  async logEvent(input: AuditEventInput): Promise<TenantAuditEvent> {
    const query = `
      INSERT INTO companyos_tenant_audit (
        id, tenant_id, event_type, action, actor_id, actor_email, actor_ip,
        resource_type, resource_id, changes, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      uuidv4(),
      input.tenantId || null,
      input.eventType,
      input.action,
      input.actorId || null,
      input.actorEmail || null,
      input.actorIp || null,
      input.resourceType,
      input.resourceId || null,
      JSON.stringify(input.changes || {}),
      JSON.stringify(input.metadata || {}),
      new Date(),
    ];

    const result = await pool.query(query, values);
    return rowToAuditEvent(result.rows[0]);
  }

  /**
   * Log tenant creation
   */
  async logTenantCreated(
    tenantId: string,
    tenantData: Record<string, unknown>,
    actor: { id?: string; email?: string; ip?: string },
  ): Promise<TenantAuditEvent> {
    return this.logEvent({
      tenantId,
      eventType: 'tenant_created',
      action: 'create',
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp: actor.ip,
      resourceType: 'tenant',
      resourceId: tenantId,
      changes: { after: tenantData },
      metadata: { source: 'tenant-api' },
    });
  }

  /**
   * Log tenant update
   */
  async logTenantUpdated(
    tenantId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    actor: { id?: string; email?: string; ip?: string },
  ): Promise<TenantAuditEvent> {
    return this.logEvent({
      tenantId,
      eventType: 'tenant_updated',
      action: 'update',
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp: actor.ip,
      resourceType: 'tenant',
      resourceId: tenantId,
      changes: { before, after },
      metadata: { source: 'tenant-api' },
    });
  }

  /**
   * Log tenant deletion
   */
  async logTenantDeleted(
    tenantId: string,
    actor: { id?: string; email?: string; ip?: string },
  ): Promise<TenantAuditEvent> {
    return this.logEvent({
      tenantId,
      eventType: 'tenant_deleted',
      action: 'delete',
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp: actor.ip,
      resourceType: 'tenant',
      resourceId: tenantId,
      changes: {},
      metadata: { source: 'tenant-api' },
    });
  }

  /**
   * Log feature flag change
   */
  async logFeatureFlagChanged(
    tenantId: string,
    flagName: string,
    enabled: boolean,
    actor: { id?: string; email?: string; ip?: string },
  ): Promise<TenantAuditEvent> {
    return this.logEvent({
      tenantId,
      eventType: 'feature_flag_changed',
      action: enabled ? 'enable' : 'disable',
      actorId: actor.id,
      actorEmail: actor.email,
      actorIp: actor.ip,
      resourceType: 'feature_flag',
      resourceId: flagName,
      changes: { flagName, enabled },
      metadata: { source: 'tenant-api' },
    });
  }

  /**
   * Query audit events for a tenant
   */
  async getAuditEvents(options: {
    tenantId?: string;
    eventType?: string;
    action?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: TenantAuditEvent[]; totalCount: number }> {
    const { limit = 100, offset = 0 } = options;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(options.tenantId);
    }
    if (options.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(options.eventType);
    }
    if (options.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(options.action);
    }
    if (options.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      values.push(options.actorId);
    }
    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM companyos_tenant_audit ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT * FROM companyos_tenant_audit
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const dataResult = await pool.query(dataQuery, [...values, limit, offset]);
    const events = dataResult.rows.map(rowToAuditEvent);

    return { events, totalCount };
  }
}

export const auditService = new AuditService();
