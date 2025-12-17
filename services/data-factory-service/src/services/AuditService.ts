/**
 * Data Factory Service - Audit Service
 *
 * Provides comprehensive audit logging for all operations in the data factory.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { AuditEntry } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'audit-service' });

export interface AuditLogRequest {
  entityType: 'dataset' | 'sample' | 'label' | 'export' | 'workflow' | 'labeling_queue' | 'labeling_job';
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async log(request: AuditLogRequest): Promise<AuditEntry> {
    const id = uuidv4();
    const timestamp = new Date();

    await query(
      `INSERT INTO audit_log (
        id, entity_type, entity_id, action, actor_id, actor_role,
        timestamp, previous_state, new_state, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        request.entityType,
        request.entityId,
        request.action,
        request.actorId,
        request.actorRole,
        timestamp,
        request.previousState ? JSON.stringify(request.previousState) : null,
        request.newState ? JSON.stringify(request.newState) : null,
        JSON.stringify(request.metadata || {}),
      ]
    );

    logger.debug(
      {
        auditId: id,
        entityType: request.entityType,
        entityId: request.entityId,
        action: request.action,
        actorId: request.actorId,
      },
      'Audit entry created'
    );

    return {
      id,
      entityType: request.entityType as AuditEntry['entityType'],
      entityId: request.entityId,
      action: request.action,
      actorId: request.actorId,
      actorRole: request.actorRole,
      timestamp,
      previousState: request.previousState,
      newState: request.newState,
      metadata: request.metadata || {},
    };
  }

  async getByEntity(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditEntry[]> {
    const result = await query<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      actor_id: string;
      actor_role: string;
      timestamp: Date;
      previous_state: string | null;
      new_state: string | null;
      metadata: string;
    }>(
      `SELECT * FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [entityType, entityId, limit]
    );

    return result.rows.map((row) => this.mapRowToEntry(row));
  }

  async getByActor(actorId: string, limit: number = 100): Promise<AuditEntry[]> {
    const result = await query<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      actor_id: string;
      actor_role: string;
      timestamp: Date;
      previous_state: string | null;
      new_state: string | null;
      metadata: string;
    }>(
      `SELECT * FROM audit_log
       WHERE actor_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [actorId, limit]
    );

    return result.rows.map((row) => this.mapRowToEntry(row));
  }

  async search(
    filters: {
      entityType?: string;
      action?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }
    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      values.push(filters.actorId);
    }
    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      actor_id: string;
      actor_role: string;
      timestamp: Date;
      previous_state: string | null;
      new_state: string | null;
      metadata: string;
    }>(
      `SELECT * FROM audit_log ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex}`,
      [...values, limit]
    );

    return result.rows.map((row) => this.mapRowToEntry(row));
  }

  async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEntries: number;
    byEntityType: Record<string, number>;
    byAction: Record<string, number>;
    byActor: Array<{ actorId: string; count: number }>;
  }> {
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2`,
      [startDate, endDate]
    );

    const entityTypeResult = await query<{ entity_type: string; count: string }>(
      `SELECT entity_type, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY entity_type`,
      [startDate, endDate]
    );

    const actionResult = await query<{ action: string; count: string }>(
      `SELECT action, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY action`,
      [startDate, endDate]
    );

    const actorResult = await query<{ actor_id: string; count: string }>(
      `SELECT actor_id, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY actor_id
       ORDER BY count DESC
       LIMIT 20`,
      [startDate, endDate]
    );

    const byEntityType: Record<string, number> = {};
    for (const row of entityTypeResult.rows) {
      byEntityType[row.entity_type] = parseInt(row.count, 10);
    }

    const byAction: Record<string, number> = {};
    for (const row of actionResult.rows) {
      byAction[row.action] = parseInt(row.count, 10);
    }

    return {
      totalEntries: parseInt(totalResult.rows[0].count, 10),
      byEntityType,
      byAction,
      byActor: actorResult.rows.map((row) => ({
        actorId: row.actor_id,
        count: parseInt(row.count, 10),
      })),
    };
  }

  private mapRowToEntry(row: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    actor_id: string;
    actor_role: string;
    timestamp: Date;
    previous_state: string | null;
    new_state: string | null;
    metadata: string;
  }): AuditEntry {
    return {
      id: row.id,
      entityType: row.entity_type as AuditEntry['entityType'],
      entityId: row.entity_id,
      action: row.action,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      timestamp: row.timestamp,
      previousState: row.previous_state ? JSON.parse(row.previous_state) : undefined,
      newState: row.new_state ? JSON.parse(row.new_state) : undefined,
      metadata: JSON.parse(row.metadata),
    };
  }
}
