/**
 * Event Service - Handles operational events
 * @module @intelgraph/control-tower-service/services/EventService
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  OperationalEvent,
  EventFilterInput,
  EventConnection,
  EventStatus,
  Severity,
  ServiceContext,
  RelatedEntity,
  AISuggestion,
  GovernanceInfo,
  EventMetadata,
} from '../types/index.js';

export interface EventRepository {
  findById(id: string): Promise<OperationalEvent | null>;
  findMany(filter: EventFilterInput, limit: number, cursor?: string): Promise<EventConnection>;
  create(event: Omit<OperationalEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<OperationalEvent>;
  update(id: string, updates: Partial<OperationalEvent>): Promise<OperationalEvent>;
  findCorrelated(eventId: string, depth: number): Promise<OperationalEvent[]>;
  count(filter: EventFilterInput): Promise<number>;
}

export interface GraphService {
  getRelatedEntities(eventId: string, depth: number): Promise<RelatedEntity[]>;
  getContextGraph(eventId: string, depth: number, entityTypes?: string[]): Promise<{
    nodes: Array<{ id: string; type: string; label: string; properties?: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string; type: string; properties?: Record<string, unknown> }>;
  }>;
}

export interface AIService {
  getSuggestions(event: OperationalEvent): Promise<AISuggestion[]>;
}

export class EventService {
  constructor(
    private readonly repository: EventRepository,
    private readonly graphService: GraphService,
    private readonly aiService: AIService,
  ) {}

  /**
   * Get event by ID with full details
   */
  async getEvent(id: string, context: ServiceContext): Promise<OperationalEvent | null> {
    const event = await this.repository.findById(id);

    if (!event) {
      return null;
    }

    // Enrich with related entities
    event.relatedEntities = await this.graphService.getRelatedEntities(id, 1);

    // Get AI suggestions
    event.suggestions = await this.aiService.getSuggestions(event);

    return event;
  }

  /**
   * Get event timeline with filtering and pagination
   */
  async getEventTimeline(
    filter: EventFilterInput,
    first: number,
    after?: string,
    context?: ServiceContext,
  ): Promise<EventConnection> {
    // Apply default time range if not specified
    const effectiveFilter: EventFilterInput = {
      ...filter,
      startTime: filter.startTime ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: filter.endTime ?? new Date(),
    };

    return this.repository.findMany(effectiveFilter, first, after);
  }

  /**
   * Get correlated events for pattern detection
   */
  async getCorrelatedEvents(
    eventId: string,
    depth: number = 1,
    context?: ServiceContext,
  ): Promise<OperationalEvent[]> {
    return this.repository.findCorrelated(eventId, depth);
  }

  /**
   * Get context graph for visualization
   */
  async getEventContextGraph(
    eventId: string,
    depth: number = 2,
    entityTypes?: string[],
    context?: ServiceContext,
  ): Promise<{
    nodes: Array<{ id: string; type: string; label: string; properties?: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string; type: string; properties?: Record<string, unknown> }>;
  }> {
    return this.graphService.getContextGraph(eventId, depth, entityTypes);
  }

  /**
   * Acknowledge an event
   */
  async acknowledgeEvent(
    eventId: string,
    notes: string | undefined,
    context: ServiceContext,
  ): Promise<OperationalEvent> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    if (event.status === EventStatus.RESOLVED || event.status === EventStatus.DISMISSED) {
      throw new Error(`Cannot acknowledge event in status: ${event.status}`);
    }

    return this.repository.update(eventId, {
      status: EventStatus.ACKNOWLEDGED,
      acknowledgedBy: context.user,
      acknowledgedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update event status
   */
  async updateEventStatus(
    eventId: string,
    status: EventStatus,
    notes: string | undefined,
    context: ServiceContext,
  ): Promise<OperationalEvent> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Validate status transition
    this.validateStatusTransition(event.status, status);

    const updates: Partial<OperationalEvent> = {
      status,
      updatedAt: new Date(),
    };

    // Auto-set acknowledgedBy if transitioning to acknowledged
    if (status === EventStatus.ACKNOWLEDGED && !event.acknowledgedBy) {
      updates.acknowledgedBy = context.user;
      updates.acknowledgedAt = new Date();
    }

    return this.repository.update(eventId, updates);
  }

  /**
   * Assign event to user
   */
  async assignEvent(
    eventId: string,
    userId: string,
    context: ServiceContext,
  ): Promise<OperationalEvent> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // In a real implementation, we'd look up the user
    const assignee = {
      id: userId,
      name: 'Assigned User',
      email: 'user@example.com',
    };

    return this.repository.update(eventId, {
      assignedTo: assignee,
      updatedAt: new Date(),
    });
  }

  /**
   * Ingest a new event from external source
   */
  async ingestEvent(
    source: string,
    payload: Record<string, unknown>,
    context?: ServiceContext,
  ): Promise<OperationalEvent> {
    // Transform external payload to internal format
    const event = this.transformExternalEvent(source, payload);

    // Create the event
    const created = await this.repository.create(event);

    // Trigger async enrichment
    this.enrichEventAsync(created.id).catch(console.error);

    return created;
  }

  /**
   * Get event count by category
   */
  async getEventCategories(
    timeRange: string = '24h',
    context?: ServiceContext,
  ): Promise<Array<{ category: string; count: number; criticalCount: number }>> {
    const startTime = this.parseTimeRange(timeRange);

    // This would be a database aggregation in real implementation
    return [
      { category: 'PAYMENT', count: 12, criticalCount: 2 },
      { category: 'SUPPORT', count: 47, criticalCount: 1 },
      { category: 'SALES', count: 8, criticalCount: 0 },
      { category: 'PRODUCT', count: 15, criticalCount: 3 },
      { category: 'INFRASTRUCTURE', count: 5, criticalCount: 1 },
    ];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateStatusTransition(currentStatus: EventStatus, newStatus: EventStatus): void {
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.ACTIVE]: [EventStatus.ACKNOWLEDGED, EventStatus.INVESTIGATING, EventStatus.RESOLVED, EventStatus.DISMISSED],
      [EventStatus.ACKNOWLEDGED]: [EventStatus.INVESTIGATING, EventStatus.RESOLVED, EventStatus.DISMISSED],
      [EventStatus.INVESTIGATING]: [EventStatus.RESOLVED, EventStatus.DISMISSED],
      [EventStatus.RESOLVED]: [], // Terminal state
      [EventStatus.DISMISSED]: [], // Terminal state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private transformExternalEvent(
    source: string,
    payload: Record<string, unknown>,
  ): Omit<OperationalEvent, 'id' | 'createdAt' | 'updatedAt'> {
    // Source-specific transformation logic
    const transformers: Record<string, (p: Record<string, unknown>) => Partial<OperationalEvent>> = {
      stripe: this.transformStripeEvent.bind(this),
      zendesk: this.transformZendeskEvent.bind(this),
      salesforce: this.transformSalesforceEvent.bind(this),
      datadog: this.transformDatadogEvent.bind(this),
    };

    const transformer = transformers[source.toLowerCase()];
    const transformed = transformer ? transformer(payload) : {};

    return {
      title: (payload.title as string) || 'Unknown Event',
      description: payload.description as string | undefined,
      severity: this.inferSeverity(payload),
      status: EventStatus.ACTIVE,
      category: this.inferCategory(source, payload),
      source,
      sourceId: payload.id as string | undefined,
      sourceUrl: payload.url as string | undefined,
      occurredAt: new Date((payload.occurred_at as string) || Date.now()),
      receivedAt: new Date(),
      payload,
      metadata: this.extractMetadata(payload),
      relatedEntities: [],
      correlatedEvents: [],
      actions: [],
      suggestions: [],
      governance: this.createGovernanceInfo(source),
      ...transformed,
    };
  }

  private transformStripeEvent(payload: Record<string, unknown>): Partial<OperationalEvent> {
    const type = payload.type as string;
    const data = payload.data as Record<string, unknown> | undefined;

    return {
      title: `Stripe: ${type?.replace(/_/g, ' ')}`,
      category: 'PAYMENT' as any,
      metadata: {
        tags: ['payment', 'stripe'],
        properties: data,
        impactEstimate: {
          revenueAtRisk: (data?.amount as number) || 0,
        },
      },
    };
  }

  private transformZendeskEvent(payload: Record<string, unknown>): Partial<OperationalEvent> {
    return {
      title: `Support Ticket: ${payload.subject || 'No subject'}`,
      category: 'SUPPORT' as any,
      metadata: {
        tags: ['support', 'zendesk'],
        properties: payload,
      },
    };
  }

  private transformSalesforceEvent(payload: Record<string, unknown>): Partial<OperationalEvent> {
    return {
      title: `Sales: ${payload.type || 'Activity'}`,
      category: 'SALES' as any,
      metadata: {
        tags: ['sales', 'salesforce'],
        properties: payload,
        impactEstimate: {
          revenueAtRisk: (payload.amount as number) || 0,
        },
      },
    };
  }

  private transformDatadogEvent(payload: Record<string, unknown>): Partial<OperationalEvent> {
    return {
      title: `Infrastructure: ${payload.title || 'Alert'}`,
      category: 'INFRASTRUCTURE' as any,
      metadata: {
        tags: ['infrastructure', 'datadog'],
        properties: payload,
        errorDetails: {
          code: payload.error_code as string,
          message: payload.message as string,
        },
      },
    };
  }

  private inferSeverity(payload: Record<string, unknown>): Severity {
    const severity = (payload.severity as string)?.toUpperCase();
    const priority = (payload.priority as string)?.toUpperCase();

    if (severity === 'CRITICAL' || priority === 'P1' || priority === 'URGENT') {
      return Severity.CRITICAL;
    }
    if (severity === 'WARNING' || severity === 'HIGH' || priority === 'P2') {
      return Severity.WARNING;
    }
    if (severity === 'INFO' || severity === 'LOW') {
      return Severity.INFO;
    }
    if (severity === 'SUCCESS' || payload.status === 'success') {
      return Severity.SUCCESS;
    }
    return Severity.NORMAL;
  }

  private inferCategory(source: string, payload: Record<string, unknown>): any {
    const sourceCategories: Record<string, string> = {
      stripe: 'PAYMENT',
      zendesk: 'SUPPORT',
      salesforce: 'SALES',
      datadog: 'INFRASTRUCTURE',
      github: 'PRODUCT',
      pagerduty: 'INFRASTRUCTURE',
      churnzero: 'CUSTOMER_HEALTH',
    };

    return sourceCategories[source.toLowerCase()] || 'GENERAL';
  }

  private extractMetadata(payload: Record<string, unknown>): EventMetadata {
    return {
      tags: (payload.tags as string[]) || [],
      properties: payload.metadata as Record<string, unknown>,
      impactEstimate: payload.impact as ImpactEstimate | undefined,
      errorDetails: payload.error as ErrorDetails | undefined,
    };
  }

  private createGovernanceInfo(source: string): GovernanceInfo {
    return {
      origin: source,
      sensitivity: 'INTERNAL',
      clearance: 'STANDARD',
      legalBasis: 'LEGITIMATE_INTEREST',
      retentionClass: 'OPERATIONAL_90D',
      policyLabels: ['ops-events-standard'],
      provenanceChain: [
        {
          id: uuidv4(),
          timestamp: new Date(),
          transformType: 'INGEST',
          actorId: 'control-tower-service',
          config: { source },
        },
      ],
    };
  }

  private async enrichEventAsync(eventId: string): Promise<void> {
    // Async enrichment: correlations, AI suggestions, entity linking
    // This would be implemented with a job queue in production
  }

  private parseTimeRange(timeRange: string): Date {
    const match = timeRange.match(/^(\d+)([hdwm])$/);
    if (!match) {
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() - value * multipliers[unit]);
  }
}

interface ImpactEstimate {
  revenueAtRisk?: number;
  customersAffected?: number;
  usersAffected?: number;
  severityScore?: number;
  confidence?: number;
}

interface ErrorDetails {
  code?: string;
  message?: string;
  stackTrace?: string;
  affectedService?: string;
  count?: number;
  errorRate?: number;
}
