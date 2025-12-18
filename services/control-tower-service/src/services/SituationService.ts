/**
 * Situation Service - Manages operational situations (grouped events)
 * @module @intelgraph/control-tower-service/services/SituationService
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Situation,
  SituationStatus,
  Priority,
  Severity,
  CreateSituationInput,
  UpdateSituationInput,
  SituationConnection,
  ServiceContext,
  OperationalEvent,
  SituationImpact,
  SituationTimelineEntry,
  RecommendedAction,
  User,
  ActionType,
} from '../types/index.js';

export interface SituationRepository {
  findById(id: string): Promise<Situation | null>;
  findActive(limit: number, cursor?: string, filters?: { priority?: Priority[]; status?: SituationStatus[] }): Promise<SituationConnection>;
  create(situation: Omit<Situation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Situation>;
  update(id: string, updates: Partial<Situation>): Promise<Situation>;
  linkEvent(situationId: string, eventId: string): Promise<void>;
  unlinkEvent(situationId: string, eventId: string): Promise<void>;
  getEvents(situationId: string, limit: number, cursor?: string): Promise<OperationalEvent[]>;
  count(filters?: { priority?: Priority[]; status?: SituationStatus[] }): Promise<number>;
}

export interface CorrelationEngine {
  suggestCorrelations(event: OperationalEvent): Promise<string[]>;
  calculateImpact(situationId: string): Promise<SituationImpact>;
  getRecommendedActions(situation: Situation): Promise<RecommendedAction[]>;
}

export class SituationService {
  constructor(
    private readonly repository: SituationRepository,
    private readonly correlationEngine: CorrelationEngine,
  ) {}

  /**
   * Get situation by ID with full details
   */
  async getSituation(id: string, context: ServiceContext): Promise<Situation | null> {
    const situation = await this.repository.findById(id);

    if (!situation) {
      return null;
    }

    // Enrich with calculated impact
    situation.impact = await this.correlationEngine.calculateImpact(id);

    // Get recommended actions
    situation.recommendedActions = await this.correlationEngine.getRecommendedActions(situation);

    return situation;
  }

  /**
   * Get active situations with pagination
   */
  async getActiveSituations(
    first: number,
    after?: string,
    priority?: Priority[],
    status?: SituationStatus[],
    context?: ServiceContext,
  ): Promise<SituationConnection> {
    // Default to non-closed statuses
    const effectiveStatus = status ?? [SituationStatus.OPEN, SituationStatus.IN_PROGRESS];

    return this.repository.findActive(first, after, { priority, status: effectiveStatus });
  }

  /**
   * Create a new situation from events
   */
  async createSituation(
    input: CreateSituationInput,
    context: ServiceContext,
  ): Promise<Situation> {
    // Validate at least one event is provided
    if (!input.eventIds.length) {
      throw new Error('At least one event is required to create a situation');
    }

    // Determine severity from events
    const severity = await this.determineSeverityFromEvents(input.eventIds);

    const situation: Omit<Situation, 'id' | 'createdAt' | 'updatedAt'> = {
      title: input.title,
      description: input.description,
      status: SituationStatus.OPEN,
      priority: input.priority,
      severity,
      startedAt: new Date(),
      events: [],
      eventCount: input.eventIds.length,
      affectedEntities: [],
      impact: {
        affectedCustomers: [],
      },
      timeline: [
        {
          id: uuidv4(),
          timestamp: new Date(),
          entryType: 'created',
          description: 'Situation created',
          user: context.user,
        },
      ],
      recommendedActions: [],
      actions: [],
      team: input.ownerId ? [] : [context.user],
      owner: input.ownerId ? { id: input.ownerId, name: 'Owner', email: '' } : context.user,
    };

    const created = await this.repository.create(situation);

    // Link events to situation
    await Promise.all(
      input.eventIds.map(eventId => this.repository.linkEvent(created.id, eventId))
    );

    return created;
  }

  /**
   * Update a situation
   */
  async updateSituation(
    id: string,
    input: UpdateSituationInput,
    context: ServiceContext,
  ): Promise<Situation> {
    const situation = await this.repository.findById(id);

    if (!situation) {
      throw new Error(`Situation not found: ${id}`);
    }

    const updates: Partial<Situation> = {
      ...input,
      updatedAt: new Date(),
    };

    // Track status changes in timeline
    if (input.status && input.status !== situation.status) {
      const timelineEntry: SituationTimelineEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        entryType: 'status_change',
        description: `Status changed from ${situation.status} to ${input.status}`,
        user: context.user,
      };
      updates.timeline = [...(situation.timeline || []), timelineEntry];
    }

    // Handle owner change
    if (input.ownerId && input.ownerId !== situation.owner?.id) {
      updates.owner = { id: input.ownerId, name: 'New Owner', email: '' };

      const timelineEntry: SituationTimelineEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        entryType: 'reassigned',
        description: `Reassigned to new owner`,
        user: context.user,
      };
      updates.timeline = [...(updates.timeline || situation.timeline || []), timelineEntry];
    }

    return this.repository.update(id, updates);
  }

  /**
   * Link an event to a situation
   */
  async linkEventToSituation(
    eventId: string,
    situationId: string,
    context: ServiceContext,
  ): Promise<Situation> {
    const situation = await this.repository.findById(situationId);

    if (!situation) {
      throw new Error(`Situation not found: ${situationId}`);
    }

    await this.repository.linkEvent(situationId, eventId);

    // Add timeline entry
    const timelineEntry: SituationTimelineEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      entryType: 'event_linked',
      description: `Event linked to situation`,
      user: context.user,
    };

    return this.repository.update(situationId, {
      eventCount: situation.eventCount + 1,
      timeline: [...(situation.timeline || []), timelineEntry],
      updatedAt: new Date(),
    });
  }

  /**
   * Unlink an event from a situation
   */
  async unlinkEventFromSituation(
    eventId: string,
    situationId: string,
    context: ServiceContext,
  ): Promise<Situation> {
    const situation = await this.repository.findById(situationId);

    if (!situation) {
      throw new Error(`Situation not found: ${situationId}`);
    }

    await this.repository.unlinkEvent(situationId, eventId);

    // Add timeline entry
    const timelineEntry: SituationTimelineEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      entryType: 'event_unlinked',
      description: `Event unlinked from situation`,
      user: context.user,
    };

    return this.repository.update(situationId, {
      eventCount: Math.max(0, situation.eventCount - 1),
      timeline: [...(situation.timeline || []), timelineEntry],
      updatedAt: new Date(),
    });
  }

  /**
   * Resolve a situation
   */
  async resolveSituation(
    id: string,
    resolution: string,
    context: ServiceContext,
  ): Promise<Situation> {
    const situation = await this.repository.findById(id);

    if (!situation) {
      throw new Error(`Situation not found: ${id}`);
    }

    if (situation.status === SituationStatus.RESOLVED || situation.status === SituationStatus.CLOSED) {
      throw new Error(`Situation is already ${situation.status}`);
    }

    const resolvedAt = new Date();
    const duration = Math.floor((resolvedAt.getTime() - situation.startedAt.getTime()) / 1000);

    const timelineEntry: SituationTimelineEntry = {
      id: uuidv4(),
      timestamp: resolvedAt,
      entryType: 'resolved',
      description: `Situation resolved: ${resolution}`,
      user: context.user,
    };

    return this.repository.update(id, {
      status: SituationStatus.RESOLVED,
      resolvedAt,
      duration,
      timeline: [...(situation.timeline || []), timelineEntry],
      updatedAt: resolvedAt,
    });
  }

  /**
   * Auto-correlate events into situations
   */
  async autoCorrelate(event: OperationalEvent): Promise<string | null> {
    // Get suggested situation IDs for this event
    const suggestedSituationIds = await this.correlationEngine.suggestCorrelations(event);

    if (suggestedSituationIds.length > 0) {
      // Link to most relevant situation
      const situationId = suggestedSituationIds[0];
      await this.repository.linkEvent(situationId, event.id);
      return situationId;
    }

    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async determineSeverityFromEvents(eventIds: string[]): Promise<Severity> {
    // In a real implementation, we'd fetch events and determine max severity
    // For now, return a default
    return Severity.WARNING;
  }
}
