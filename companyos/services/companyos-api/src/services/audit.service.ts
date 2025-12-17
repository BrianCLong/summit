/**
 * CompanyOS Audit Service
 *
 * Implements A3: Tenant & Role-Aware Audit Log Viewer
 */

import { v4 as uuidv4 } from 'uuid';
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

export class AuditService {
  // In-memory store for demo (replace with actual DB in production)
  private events: AuditEvent[] = [];
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

    this.events.push(event);

    logger.debug('Audit event recorded', {
      eventType: event.eventType,
      actorId: event.actorId,
      tenantId: event.tenantId,
      resourceType: event.resourceType,
    });

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
    let filteredEvents = [...this.events];

    // Apply filters
    if (filter.tenantId) {
      filteredEvents = filteredEvents.filter((e) => e.tenantId === filter.tenantId);
    }
    if (filter.actorId) {
      filteredEvents = filteredEvents.filter((e) => e.actorId === filter.actorId);
    }
    if (filter.eventType) {
      filteredEvents = filteredEvents.filter((e) => e.eventType === filter.eventType);
    }
    if (filter.eventCategory) {
      filteredEvents = filteredEvents.filter((e) => e.eventCategory === filter.eventCategory);
    }
    if (filter.resourceType) {
      filteredEvents = filteredEvents.filter((e) => e.resourceType === filter.resourceType);
    }
    if (filter.resourceId) {
      filteredEvents = filteredEvents.filter((e) => e.resourceId === filter.resourceId);
    }
    if (filter.outcome) {
      filteredEvents = filteredEvents.filter((e) => e.outcome === filter.outcome);
    }
    if (filter.fromDate) {
      filteredEvents = filteredEvents.filter((e) => e.occurredAt >= filter.fromDate!);
    }
    if (filter.toDate) {
      filteredEvents = filteredEvents.filter((e) => e.occurredAt <= filter.toDate!);
    }
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredEvents = filteredEvents.filter(
        (e) =>
          e.eventType.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.resourceName?.toLowerCase().includes(query) ||
          e.actorId?.toLowerCase().includes(query)
      );
    }

    // Sort by occurredAt descending (most recent first)
    filteredEvents.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const totalCount = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async getEvent(eventId: string): Promise<AuditEvent | null> {
    return this.events.find((e) => e.id === eventId) || null;
  }

  async getEventsByCorrelation(correlationId: string): Promise<AuditEvent[]> {
    return this.events.filter((e) => e.correlationId === correlationId);
  }

  async getRecentEventsByTenant(
    tenantId: string,
    limit = 100
  ): Promise<AuditEvent[]> {
    return this.events
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  async getEventsByActor(
    actorId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<AuditEvent[]> {
    let events = this.events.filter((e) => e.actorId === actorId);

    if (fromDate) {
      events = events.filter((e) => e.occurredAt >= fromDate);
    }
    if (toDate) {
      events = events.filter((e) => e.occurredAt <= toDate);
    }

    return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getEventCounts(
    tenantId?: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<Record<string, number>> {
    let events = [...this.events];

    if (tenantId) {
      events = events.filter((e) => e.tenantId === tenantId);
    }
    if (fromDate) {
      events = events.filter((e) => e.occurredAt >= fromDate);
    }
    if (toDate) {
      events = events.filter((e) => e.occurredAt <= toDate);
    }

    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }

    return counts;
  }

  async getCategoryBreakdown(
    tenantId?: string
  ): Promise<Record<AuditEventCategory, number>> {
    let events = [...this.events];

    if (tenantId) {
      events = events.filter((e) => e.tenantId === tenantId);
    }

    const breakdown: Record<string, number> = {};
    for (const event of events) {
      breakdown[event.eventCategory] = (breakdown[event.eventCategory] || 0) + 1;
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
    const now = new Date();
    const initialCount = this.events.length;

    this.events = this.events.filter((event) => {
      const expirationDate = new Date(event.recordedAt);
      expirationDate.setDate(expirationDate.getDate() + event.retentionDays);
      return expirationDate > now;
    });

    const deletedCount = initialCount - this.events.length;
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
