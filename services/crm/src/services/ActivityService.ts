/**
 * Activity Service
 * Manages activity logging, timeline views, and engagement tracking
 */

import { EventEmitter } from 'events';
import type {
  Activity,
  ActivityType,
  ActivityOutcome,
  TimelineEntry,
  TimelineEventType,
  FilterGroup,
} from '../models/types';

export interface ActivityCreateInput {
  type: ActivityType;
  subType?: string;
  subject: string;
  description?: string;
  outcome?: ActivityOutcome;
  durationMinutes?: number;
  scheduledAt?: Date;
  completedAt?: Date;
  contactIds?: string[];
  companyId?: string;
  dealId?: string;
  ownerId: string;
  metadata?: Record<string, unknown>;
}

export interface ActivitySearchParams {
  types?: ActivityType[];
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  completed?: boolean;
  page?: number;
  limit?: number;
}

export interface ActivitySearchResult {
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
}

export interface TimelineSearchParams {
  entityType: 'contact' | 'company' | 'deal';
  entityId: string;
  eventTypes?: TimelineEventType[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface EngagementStats {
  totalActivities: number;
  byType: Record<ActivityType, number>;
  avgResponseTime: number;
  lastActivityDate?: Date;
  engagementScore: number;
}

export class ActivityService extends EventEmitter {
  private activities: Map<string, Activity> = new Map();
  private timeline: Map<string, TimelineEntry[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Log a new activity
   */
  async log(input: ActivityCreateInput, userId: string): Promise<Activity> {
    const id = this.generateId();
    const now = new Date();

    const activity: Activity = {
      id,
      type: input.type,
      subType: input.subType,
      subject: input.subject,
      description: input.description,
      outcome: input.outcome,
      durationMinutes: input.durationMinutes,
      scheduledAt: input.scheduledAt,
      completedAt: input.completedAt || (input.outcome ? now : undefined),
      contactIds: input.contactIds || [],
      companyId: input.companyId,
      dealId: input.dealId,
      ownerId: input.ownerId,
      participants: [],
      attachments: [],
      metadata: input.metadata || {},
      isAutomated: false,
      createdAt: now,
      updatedAt: now,
    };

    this.activities.set(id, activity);

    // Create timeline entries for all associated entities
    await this.createTimelineEntries(activity);

    this.emit('activity:logged', activity);

    return activity;
  }

  /**
   * Log a call
   */
  async logCall(
    contactIds: string[],
    subject: string,
    outcome: ActivityOutcome,
    durationMinutes: number,
    notes?: string,
    userId?: string,
    companyId?: string,
    dealId?: string
  ): Promise<Activity> {
    return this.log({
      type: 'call',
      subject,
      description: notes,
      outcome,
      durationMinutes,
      contactIds,
      companyId,
      dealId,
      ownerId: userId || 'system',
    }, userId || 'system');
  }

  /**
   * Log a meeting
   */
  async logMeeting(
    contactIds: string[],
    subject: string,
    scheduledAt: Date,
    durationMinutes: number,
    notes?: string,
    userId?: string,
    companyId?: string,
    dealId?: string,
    completed = false
  ): Promise<Activity> {
    return this.log({
      type: 'meeting',
      subject,
      description: notes,
      scheduledAt,
      durationMinutes,
      outcome: completed ? 'completed' : undefined,
      completedAt: completed ? new Date() : undefined,
      contactIds,
      companyId,
      dealId,
      ownerId: userId || 'system',
    }, userId || 'system');
  }

  /**
   * Log a note
   */
  async logNote(
    content: string,
    contactIds?: string[],
    companyId?: string,
    dealId?: string,
    userId?: string
  ): Promise<Activity> {
    return this.log({
      type: 'note',
      subject: 'Note',
      description: content,
      contactIds: contactIds || [],
      companyId,
      dealId,
      ownerId: userId || 'system',
    }, userId || 'system');
  }

  /**
   * Get activity by ID
   */
  async getById(id: string): Promise<Activity | null> {
    return this.activities.get(id) || null;
  }

  /**
   * Update activity
   */
  async update(
    id: string,
    updates: Partial<ActivityCreateInput>
  ): Promise<Activity> {
    const activity = await this.getById(id);
    if (!activity) {
      throw new Error(`Activity ${id} not found`);
    }

    const updatedActivity = {
      ...activity,
      ...updates,
      updatedAt: new Date(),
    };

    this.activities.set(id, updatedActivity);
    this.emit('activity:updated', updatedActivity);

    return updatedActivity;
  }

  /**
   * Mark activity as completed
   */
  async complete(id: string, outcome?: ActivityOutcome): Promise<Activity> {
    const activity = await this.getById(id);
    if (!activity) {
      throw new Error(`Activity ${id} not found`);
    }

    activity.completedAt = new Date();
    activity.outcome = outcome || 'completed';
    activity.updatedAt = new Date();

    this.activities.set(id, activity);
    this.emit('activity:completed', activity);

    return activity;
  }

  /**
   * Delete activity
   */
  async delete(id: string): Promise<void> {
    const activity = await this.getById(id);
    if (!activity) {
      throw new Error(`Activity ${id} not found`);
    }

    this.activities.delete(id);
    this.emit('activity:deleted', activity);
  }

  /**
   * Search activities
   */
  async search(params: ActivitySearchParams): Promise<ActivitySearchResult> {
    let results = Array.from(this.activities.values());

    if (params.types?.length) {
      results = results.filter((a) => params.types!.includes(a.type));
    }
    if (params.ownerId) {
      results = results.filter((a) => a.ownerId === params.ownerId);
    }
    if (params.contactId) {
      results = results.filter((a) => a.contactIds.includes(params.contactId!));
    }
    if (params.companyId) {
      results = results.filter((a) => a.companyId === params.companyId);
    }
    if (params.dealId) {
      results = results.filter((a) => a.dealId === params.dealId);
    }
    if (params.dateFrom) {
      results = results.filter((a) => a.createdAt >= params.dateFrom!);
    }
    if (params.dateTo) {
      results = results.filter((a) => a.createdAt <= params.dateTo!);
    }
    if (params.completed !== undefined) {
      results = results.filter((a) => (a.completedAt !== undefined) === params.completed);
    }

    // Sort by most recent
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;

    return {
      activities: results.slice(start, start + limit),
      total: results.length,
      page,
      limit,
    };
  }

  /**
   * Get timeline for entity
   */
  async getTimeline(params: TimelineSearchParams): Promise<TimelineEntry[]> {
    const key = `${params.entityType}:${params.entityId}`;
    let entries = this.timeline.get(key) || [];

    if (params.eventTypes?.length) {
      entries = entries.filter((e) => params.eventTypes!.includes(e.eventType));
    }
    if (params.dateFrom) {
      entries = entries.filter((e) => e.timestamp >= params.dateFrom!);
    }
    if (params.dateTo) {
      entries = entries.filter((e) => e.timestamp <= params.dateTo!);
    }

    // Sort by most recent
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = params.limit || 100;
    return entries.slice(0, limit);
  }

  /**
   * Add timeline entry
   */
  async addTimelineEntry(entry: Omit<TimelineEntry, 'id'>): Promise<TimelineEntry> {
    const id = this.generateId();
    const timelineEntry: TimelineEntry = { ...entry, id };

    const key = `${entry.entityType}:${entry.entityId}`;
    const entries = this.timeline.get(key) || [];
    entries.push(timelineEntry);
    this.timeline.set(key, entries);

    this.emit('timeline:entry', timelineEntry);

    return timelineEntry;
  }

  /**
   * Get engagement stats for entity
   */
  async getEngagementStats(
    entityType: 'contact' | 'company' | 'deal',
    entityId: string
  ): Promise<EngagementStats> {
    const activities = Array.from(this.activities.values()).filter((a) => {
      switch (entityType) {
        case 'contact':
          return a.contactIds.includes(entityId);
        case 'company':
          return a.companyId === entityId;
        case 'deal':
          return a.dealId === entityId;
      }
    });

    const byType: Record<string, number> = {};
    for (const activity of activities) {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
    }

    const sortedActivities = [...activities].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Calculate engagement score (0-100)
    let engagementScore = 0;
    if (activities.length > 0) {
      engagementScore += Math.min(activities.length * 5, 30); // Activity count
      if (byType['call']) engagementScore += Math.min(byType['call'] * 5, 20);
      if (byType['meeting']) engagementScore += Math.min(byType['meeting'] * 10, 30);
      if (byType['email']) engagementScore += Math.min(byType['email'] * 2, 20);

      // Recency bonus
      if (sortedActivities[0]) {
        const daysSinceActivity = Math.floor(
          (Date.now() - sortedActivities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivity <= 7) engagementScore += 20;
        else if (daysSinceActivity <= 30) engagementScore += 10;
      }
    }

    return {
      totalActivities: activities.length,
      byType: byType as Record<ActivityType, number>,
      avgResponseTime: 0, // Would need email tracking data
      lastActivityDate: sortedActivities[0]?.createdAt,
      engagementScore: Math.min(engagementScore, 100),
    };
  }

  /**
   * Get upcoming activities
   */
  async getUpcoming(userId: string, days = 7): Promise<Activity[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.activities.values())
      .filter(
        (a) =>
          a.ownerId === userId &&
          a.scheduledAt &&
          a.scheduledAt >= now &&
          a.scheduledAt <= future &&
          !a.completedAt
      )
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
  }

  /**
   * Get overdue activities
   */
  async getOverdue(userId: string): Promise<Activity[]> {
    const now = new Date();

    return Array.from(this.activities.values())
      .filter(
        (a) =>
          a.ownerId === userId &&
          a.scheduledAt &&
          a.scheduledAt < now &&
          !a.completedAt
      )
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
  }

  /**
   * Get activity summary for period
   */
  async getSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    completed: number;
    byType: Record<string, number>;
    byOutcome: Record<string, number>;
  }> {
    const activities = Array.from(this.activities.values()).filter(
      (a) =>
        a.ownerId === userId &&
        a.createdAt >= startDate &&
        a.createdAt <= endDate
    );

    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const activity of activities) {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
      if (activity.outcome) {
        byOutcome[activity.outcome] = (byOutcome[activity.outcome] || 0) + 1;
      }
    }

    return {
      total: activities.length,
      completed: activities.filter((a) => a.completedAt).length,
      byType,
      byOutcome,
    };
  }

  private async createTimelineEntries(activity: Activity): Promise<void> {
    const baseEntry = {
      eventType: 'activity' as TimelineEventType,
      title: activity.subject,
      description: activity.description,
      metadata: { activityType: activity.type, activityId: activity.id },
      userId: activity.ownerId,
      timestamp: activity.createdAt,
      activityId: activity.id,
    };

    // Create entry for each associated contact
    for (const contactId of activity.contactIds) {
      await this.addTimelineEntry({
        ...baseEntry,
        entityType: 'contact',
        entityId: contactId,
      });
    }

    // Create entry for company
    if (activity.companyId) {
      await this.addTimelineEntry({
        ...baseEntry,
        entityType: 'company',
        entityId: activity.companyId,
      });
    }

    // Create entry for deal
    if (activity.dealId) {
      await this.addTimelineEntry({
        ...baseEntry,
        entityType: 'deal',
        entityId: activity.dealId,
      });
    }
  }

  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const activityService = new ActivityService();
