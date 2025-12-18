/**
 * Audit Service
 *
 * Provides comprehensive audit logging for all model hub operations:
 * - Model and version lifecycle events
 * - Deployment and routing changes
 * - Approval workflows
 * - Evaluation results
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { logger, createChildLogger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import {
  AuditEvent,
  AuditEventSchema,
  AuditEventType,
} from '../types/index.js';

// ============================================================================
// Database Row Type
// ============================================================================

interface AuditEventRow {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_type: string;
  tenant_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: Date;
}

// ============================================================================
// Row Transformation
// ============================================================================

function rowToAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    eventType: row.event_type as AuditEventType,
    entityType: row.entity_type as AuditEvent['entityType'],
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorType: row.actor_type as AuditEvent['actorType'],
    tenantId: row.tenant_id || undefined,
    changes: row.changes || undefined,
    metadata: row.metadata,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    timestamp: row.timestamp,
  };
}

// ============================================================================
// Audit Service Class
// ============================================================================

export interface RecordAuditEventInput {
  eventType: AuditEventType;
  entityType: AuditEvent['entityType'];
  entityId: string;
  actorId: string;
  actorType: AuditEvent['actorType'];
  tenantId?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListAuditEventsOptions {
  entityType?: AuditEvent['entityType'];
  entityId?: string;
  actorId?: string;
  eventType?: AuditEventType;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private readonly log = createChildLogger({ component: 'AuditService' });

  /**
   * Record an audit event
   */
  async recordEvent(input: RecordAuditEventInput, client?: PoolClient): Promise<AuditEvent> {
    const id = generateId();
    const now = new Date();

    const query = `
      INSERT INTO model_hub_audit_events (
        id, event_type, entity_type, entity_id, actor_id, actor_type,
        tenant_id, changes, metadata, ip_address, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      id,
      input.eventType,
      input.entityType,
      input.entityId,
      input.actorId,
      input.actorType,
      input.tenantId || null,
      input.changes || null,
      input.metadata || {},
      input.ipAddress || null,
      input.userAgent || null,
      now,
    ];

    const result = await db.query<AuditEventRow>(query, params, client);
    const event = rowToAuditEvent(result.rows[0]);

    this.log.debug({
      message: 'Audit event recorded',
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      actorId: event.actorId,
    });

    return event;
  }

  /**
   * Get an audit event by ID
   */
  async getAuditEvent(id: string, client?: PoolClient): Promise<AuditEvent> {
    const query = 'SELECT * FROM model_hub_audit_events WHERE id = $1';
    const result = await db.query<AuditEventRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('AuditEvent', id);
    }

    return rowToAuditEvent(result.rows[0]);
  }

  /**
   * List audit events with filtering
   */
  async listAuditEvents(options: ListAuditEventsOptions = {}): Promise<{
    events: AuditEvent[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(options.entityType);
    }

    if (options.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(options.entityId);
    }

    if (options.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(options.actorId);
    }

    if (options.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(options.eventType);
    }

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(options.tenantId);
    }

    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM model_hub_audit_events ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_audit_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<AuditEventRow>(query, [...params, limit, offset]);
    const events = result.rows.map(rowToAuditEvent);

    return { events, total };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: AuditEvent['entityType'],
    entityId: string,
    limit = 100,
  ): Promise<AuditEvent[]> {
    const { events } = await this.listAuditEvents({
      entityType,
      entityId,
      limit,
    });
    return events;
  }

  /**
   * Get recent activity for an actor
   */
  async getActorActivity(actorId: string, limit = 50): Promise<AuditEvent[]> {
    const { events } = await this.listAuditEvents({
      actorId,
      limit,
    });
    return events;
  }

  /**
   * Helper to record model lifecycle events
   */
  async recordModelEvent(
    eventType: AuditEventType,
    modelId: string,
    actorId: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    metadata?: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.recordEvent({
      eventType,
      entityType: 'model',
      entityId: modelId,
      actorId,
      actorType: 'user',
      changes,
      metadata,
    });
  }

  /**
   * Helper to record model version events
   */
  async recordModelVersionEvent(
    eventType: AuditEventType,
    modelVersionId: string,
    actorId: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    metadata?: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.recordEvent({
      eventType,
      entityType: 'model_version',
      entityId: modelVersionId,
      actorId,
      actorType: 'user',
      changes,
      metadata,
    });
  }

  /**
   * Helper to record deployment events
   */
  async recordDeploymentEvent(
    eventType: AuditEventType,
    deploymentId: string,
    actorId: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    metadata?: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.recordEvent({
      eventType,
      entityType: 'deployment',
      entityId: deploymentId,
      actorId,
      actorType: 'user',
      changes,
      metadata,
    });
  }

  /**
   * Helper to record approval events
   */
  async recordApprovalEvent(
    eventType: AuditEventType,
    approvalId: string,
    actorId: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    metadata?: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.recordEvent({
      eventType,
      entityType: 'approval',
      entityId: approvalId,
      actorId,
      actorType: 'user',
      changes,
      metadata,
    });
  }
}

// Export singleton instance
export const auditService = new AuditService();
