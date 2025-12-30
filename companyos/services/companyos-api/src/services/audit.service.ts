/**
 * CompanyOS Audit Service
 *
 * Implements A3: Tenant & Role-Aware Audit Log Viewer
 * FIXED: Now uses PostgreSQL for persistent audit storage
 */

import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import {
  AuditEvent,
  AuditEventCategory,
  AuditEventOutcome,
  AuditEventFilter,
  PaginatedAuditEvents,
} from '../types/tenant.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('audit-service');

export interface AuditEventInput {
  eventType: string;
  eventCategory?: AuditEventCategory;
  eventAction?: string;
  tenantId?: string;
  actorId?: string;
  actorEmail?: string;
  actorType?: string;
  actorRoles?: string[];
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  description?: string;
  details?: Record<string, unknown>;
  outcome?: AuditEventOutcome;
  errorMessage?: string;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  };
}

export interface TenantEventInput {
  eventType: string;
  tenantId: string;
  actorId: string;
  details?: Record<string, unknown>;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  };
}

// ============================================================================
// POSTGRESQL DATABASE INTERFACE
// ============================================================================

export interface AuditDatabase {
  query(text: string, params: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

let auditDb: AuditDatabase | null = null;

/**
 * Set the audit database connection
 * MUST be called during application initialization
 */
export function setAuditDatabase(db: AuditDatabase): void {
  auditDb = db;
  logger.info('Audit database connection initialized');
}

function getAuditDatabase(): AuditDatabase {
  if (!auditDb) {
    throw new Error(
      'FATAL: Audit database not initialized. Call setAuditDatabase() with a ' +
      'PostgreSQL connection pool before using AuditService.'
    );
  }
  return auditDb;
}

// ============================================================================
// AUDIT SERVICE (PostgreSQL-backed)
// ============================================================================

export class AuditService {
  private retentionDays: number;

  constructor(retentionDays = 365) {
    this.retentionDays = retentionDays;
    logger.info('AuditService initialized', { retentionDays });
  }

  // ============================================================================
  // Event Logging
  // ============================================================================

  async logEvent(input: AuditEventInput): Promise<AuditEvent> {
    const now = new Date();
    const db = getAuditDatabase();

    // Parse event type to extract category and action
    const [category, action] = this.parseEventType(input.eventType);

    const event: AuditEvent = {
      id: uuidv4(),
      eventType: input.eventType,
      eventCategory: input.eventCategory || category,
      eventAction: input.eventAction || action,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorType: input.actorType || 'user',
      actorRoles: input.actorRoles,
      tenantId: input.tenantId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      description: input.description || this.generateDescription(input),
      details: input.details || {},
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      requestId: input.context?.requestId,
      correlationId: input.context?.correlationId,
      outcome: input.outcome || AuditEventOutcome.SUCCESS,
      errorMessage: input.errorMessage,
      occurredAt: now,
      recordedAt: now,
      retentionDays: this.retentionDays,
    };

    try {
      // Insert into PostgreSQL
      await db.query(
        `INSERT INTO companyos_audit_events (
          id, event_type, event_category, event_action,
          actor_id, actor_email, actor_type, actor_roles,
          tenant_id, resource_type, resource_id, resource_name,
          description, details, ip_address, user_agent,
          request_id, correlation_id, outcome, error_message,
          occurred_at, recorded_at, retention_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [
          event.id,
          event.eventType,
          event.eventCategory,
          event.eventAction,
          event.actorId,
          event.actorEmail,
          event.actorType,
          event.actorRoles,
          event.tenantId,
          event.resourceType,
          event.resourceId,
          event.resourceName,
          event.description,
          JSON.stringify(event.details),
          event.ipAddress,
          event.userAgent,
          event.requestId,
          event.correlationId,
          event.outcome,
          event.errorMessage,
          event.occurredAt,
          event.recordedAt,
          event.retentionDays,
        ]
      );

      logger.debug('Audit event recorded to PostgreSQL', {
        eventType: event.eventType,
        actorId: event.actorId,
        tenantId: event.tenantId,
        resourceType: event.resourceType,
      });
    } catch (error) {
      logger.error('CRITICAL: Failed to write audit event to database', {
        error: (error as Error).message,
        eventType: event.eventType,
        actorId: event.actorId,
        tenantId: event.tenantId,
      });
      // Re-throw to ensure audit failures are noticed
      throw new Error(`Audit logging failed: ${(error as Error).message}`);
    }

    return event;
  }

  async logTenantEvent(input: TenantEventInput): Promise<AuditEvent> {
    return this.logEvent({
      eventType: input.eventType,
      eventCategory: AuditEventCategory.TENANT_LIFECYCLE,
      tenantId: input.tenantId,
      actorId: input.actorId,
      resourceType: 'tenant',
      resourceId: input.tenantId,
      details: input.details,
      context: input.context,
    });
  }

  async logSecurityEvent(
    eventType: string,
    actorId: string,
    details: Record<string, unknown>,
    outcome: AuditEventOutcome = AuditEventOutcome.SUCCESS,
    context?: AuditEventInput['context']
  ): Promise<AuditEvent> {
    return this.logEvent({
      eventType,
      eventCategory: AuditEventCategory.SECURITY,
      actorId,
      details,
      outcome,
      context,
    });
  }

  async logFeatureFlagEvent(
    tenantId: string,
    flagName: string,
    oldValue: unknown,
    newValue: unknown,
    actorId: string,
    context?: AuditEventInput['context']
  ): Promise<AuditEvent> {
    return this.logEvent({
      eventType: 'feature_flag.changed',
      eventCategory: AuditEventCategory.FEATURE_FLAGS,
      tenantId,
      actorId,
      resourceType: 'feature_flag',
      resourceId: flagName,
      resourceName: flagName,
      details: { flagName, oldValue, newValue },
      context,
    });
  }

  // ============================================================================
  // Event Querying (A3: Audit Log Viewer)
  // ============================================================================

  async queryEvents(
    filter: AuditEventFilter,
    limit = 50,
    offset = 0
  ): Promise<PaginatedAuditEvents> {
    const db = getAuditDatabase();

    let query = 'SELECT * FROM companyos_audit_events WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
    if (filter.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(filter.tenantId);
      paramIndex++;
    }
    if (filter.actorId) {
      query += ` AND actor_id = $${paramIndex}`;
      params.push(filter.actorId);
      paramIndex++;
    }
    if (filter.eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(filter.eventType);
      paramIndex++;
    }
    if (filter.eventCategory) {
      query += ` AND event_category = $${paramIndex}`;
      params.push(filter.eventCategory);
      paramIndex++;
    }
    if (filter.resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(filter.resourceType);
      paramIndex++;
    }
    if (filter.resourceId) {
      query += ` AND resource_id = $${paramIndex}`;
      params.push(filter.resourceId);
      paramIndex++;
    }
    if (filter.outcome) {
      query += ` AND outcome = $${paramIndex}`;
      params.push(filter.outcome);
      paramIndex++;
    }
    if (filter.fromDate) {
      query += ` AND occurred_at >= $${paramIndex}`;
      params.push(filter.fromDate);
      paramIndex++;
    }
    if (filter.toDate) {
      query += ` AND occurred_at <= $${paramIndex}`;
      params.push(filter.toDate);
      paramIndex++;
    }
    if (filter.searchQuery) {
      query += ` AND (
        event_type ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        resource_name ILIKE $${paramIndex} OR
        actor_id ILIKE $${paramIndex}
      )`;
      params.push(`%${filter.searchQuery}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    // Add pagination and ordering
    query += ` ORDER BY occurred_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Map database rows to AuditEvent objects
    const events: AuditEvent[] = result.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      eventCategory: row.event_category,
      eventAction: row.event_action,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      actorType: row.actor_type,
      actorRoles: row.actor_roles,
      tenantId: row.tenant_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceName: row.resource_name,
      description: row.description,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      outcome: row.outcome,
      errorMessage: row.error_message,
      occurredAt: new Date(row.occurred_at),
      recordedAt: new Date(row.recorded_at),
      retentionDays: row.retention_days,
    }));

    return {
      events,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async getEvent(eventId: string): Promise<AuditEvent | null> {
    const db = getAuditDatabase();

    const result = await db.query(
      'SELECT * FROM companyos_audit_events WHERE id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      eventType: row.event_type,
      eventCategory: row.event_category,
      eventAction: row.event_action,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      actorType: row.actor_type,
      actorRoles: row.actor_roles,
      tenantId: row.tenant_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceName: row.resource_name,
      description: row.description,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      outcome: row.outcome,
      errorMessage: row.error_message,
      occurredAt: new Date(row.occurred_at),
      recordedAt: new Date(row.recorded_at),
      retentionDays: row.retention_days,
    };
  }

  async getEventsByCorrelation(correlationId: string): Promise<AuditEvent[]> {
    const result = await this.queryEvents({ correlationId }, 1000);
    return result.events;
  }

  async getRecentEventsByTenant(
    tenantId: string,
    limit = 100
  ): Promise<AuditEvent[]> {
    const result = await this.queryEvents({ tenantId }, limit);
    return result.events;
  }

  async getEventsByActor(
    actorId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<AuditEvent[]> {
    const result = await this.queryEvents({ actorId, fromDate, toDate }, 1000);
    return result.events;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getEventCounts(
    tenantId?: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Record<string, number>> {
    const db = getAuditDatabase();

    let query = 'SELECT event_type, COUNT(*) as count FROM companyos_audit_events WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }
    if (fromDate) {
      query += ` AND occurred_at >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      query += ` AND occurred_at <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    query += ' GROUP BY event_type';

    const result = await db.query(query, params);

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.event_type] = parseInt(row.count, 10);
    }

    return counts;
  }

  async getCategoryBreakdown(
    tenantId?: string
  ): Promise<Record<AuditEventCategory, number>> {
    const db = getAuditDatabase();

    let query = 'SELECT event_category, COUNT(*) as count FROM companyos_audit_events WHERE 1=1';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = $1';
      params.push(tenantId);
    }

    query += ' GROUP BY event_category';

    const result = await db.query(query, params);

    const breakdown: Record<string, number> = {};
    for (const row of result.rows) {
      breakdown[row.event_category] = parseInt(row.count, 10);
    }

    return breakdown as Record<AuditEventCategory, number>;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private parseEventType(eventType: string): [AuditEventCategory, string] {
    const parts = eventType.split('.');
    const categoryMap: Record<string, AuditEventCategory> = {
      tenant: AuditEventCategory.TENANT_LIFECYCLE,
      user: AuditEventCategory.USER_MANAGEMENT,
      feature_flag: AuditEventCategory.FEATURE_FLAGS,
      security: AuditEventCategory.SECURITY,
      billing: AuditEventCategory.BILLING,
      data: AuditEventCategory.DATA_ACCESS,
      config: AuditEventCategory.CONFIGURATION,
    };

    const category = categoryMap[parts[0]] || AuditEventCategory.TENANT_LIFECYCLE;
    const action = parts.slice(1).join('_') || 'unknown';

    return [category, action];
  }

  private generateDescription(input: AuditEventInput): string {
    const parts = input.eventType.split('.');
    const action = parts[parts.length - 1].replace(/_/g, ' ');
    const resource = input.resourceType || parts[0];

    let description = `${action} ${resource}`;

    if (input.resourceName) {
      description += ` "${input.resourceName}"`;
    } else if (input.resourceId) {
      description += ` (${input.resourceId})`;
    }

    if (input.actorId) {
      description = `User ${input.actorId} ${description}`;
    }

    return description.charAt(0).toUpperCase() + description.slice(1);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async cleanupExpiredEvents(): Promise<number> {
    const db = getAuditDatabase();

    const result = await db.query(
      `DELETE FROM companyos_audit_events
       WHERE recorded_at + (retention_days || ' days')::interval < NOW()
       RETURNING id`,
      []
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      logger.info('Cleaned up expired audit events', { deletedCount });
    }

    return deletedCount;
  }
}

// Export singleton
let auditServiceInstance: AuditService | null = null;

export function getAuditService(retentionDays?: number): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService(retentionDays);
  }
  return auditServiceInstance;
}

// Export database setter
export { setAuditDatabase };
