"use strict";
/**
 * Activity Service
 * Manages activity logging, timeline views, and engagement tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityService = exports.ActivityService = void 0;
const events_1 = require("events");
class ActivityService extends events_1.EventEmitter {
    activities = new Map();
    timeline = new Map();
    constructor() {
        super();
    }
    /**
     * Log a new activity
     */
    async log(input, userId) {
        const id = this.generateId();
        const now = new Date();
        const activity = {
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
    async logCall(contactIds, subject, outcome, durationMinutes, notes, userId, companyId, dealId) {
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
    async logMeeting(contactIds, subject, scheduledAt, durationMinutes, notes, userId, companyId, dealId, completed = false) {
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
    async logNote(content, contactIds, companyId, dealId, userId) {
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
    async getById(id) {
        return this.activities.get(id) || null;
    }
    /**
     * Update activity
     */
    async update(id, updates) {
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
    async complete(id, outcome) {
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
    async delete(id) {
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
    async search(params) {
        let results = Array.from(this.activities.values());
        if (params.types?.length) {
            results = results.filter((a) => params.types.includes(a.type));
        }
        if (params.ownerId) {
            results = results.filter((a) => a.ownerId === params.ownerId);
        }
        if (params.contactId) {
            results = results.filter((a) => a.contactIds.includes(params.contactId));
        }
        if (params.companyId) {
            results = results.filter((a) => a.companyId === params.companyId);
        }
        if (params.dealId) {
            results = results.filter((a) => a.dealId === params.dealId);
        }
        if (params.dateFrom) {
            results = results.filter((a) => a.createdAt >= params.dateFrom);
        }
        if (params.dateTo) {
            results = results.filter((a) => a.createdAt <= params.dateTo);
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
    async getTimeline(params) {
        const key = `${params.entityType}:${params.entityId}`;
        let entries = this.timeline.get(key) || [];
        if (params.eventTypes?.length) {
            entries = entries.filter((e) => params.eventTypes.includes(e.eventType));
        }
        if (params.dateFrom) {
            entries = entries.filter((e) => e.timestamp >= params.dateFrom);
        }
        if (params.dateTo) {
            entries = entries.filter((e) => e.timestamp <= params.dateTo);
        }
        // Sort by most recent
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const limit = params.limit || 100;
        return entries.slice(0, limit);
    }
    /**
     * Add timeline entry
     */
    async addTimelineEntry(entry) {
        const id = this.generateId();
        const timelineEntry = { ...entry, id };
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
    async getEngagementStats(entityType, entityId) {
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
        const byType = {};
        for (const activity of activities) {
            byType[activity.type] = (byType[activity.type] || 0) + 1;
        }
        const sortedActivities = [...activities].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Calculate engagement score (0-100)
        let engagementScore = 0;
        if (activities.length > 0) {
            engagementScore += Math.min(activities.length * 5, 30); // Activity count
            if (byType['call']) {
                engagementScore += Math.min(byType['call'] * 5, 20);
            }
            if (byType['meeting']) {
                engagementScore += Math.min(byType['meeting'] * 10, 30);
            }
            if (byType['email']) {
                engagementScore += Math.min(byType['email'] * 2, 20);
            }
            // Recency bonus
            if (sortedActivities[0]) {
                const daysSinceActivity = Math.floor((Date.now() - sortedActivities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceActivity <= 7) {
                    engagementScore += 20;
                }
                else if (daysSinceActivity <= 30) {
                    engagementScore += 10;
                }
            }
        }
        return {
            totalActivities: activities.length,
            byType: byType,
            avgResponseTime: 0, // Would need email tracking data
            lastActivityDate: sortedActivities[0]?.createdAt,
            engagementScore: Math.min(engagementScore, 100),
        };
    }
    /**
     * Get upcoming activities
     */
    async getUpcoming(userId, days = 7) {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return Array.from(this.activities.values())
            .filter((a) => a.ownerId === userId &&
            a.scheduledAt &&
            a.scheduledAt >= now &&
            a.scheduledAt <= future &&
            !a.completedAt)
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }
    /**
     * Get overdue activities
     */
    async getOverdue(userId) {
        const now = new Date();
        return Array.from(this.activities.values())
            .filter((a) => a.ownerId === userId &&
            a.scheduledAt &&
            a.scheduledAt < now &&
            !a.completedAt)
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }
    /**
     * Get activity summary for period
     */
    async getSummary(userId, startDate, endDate) {
        const activities = Array.from(this.activities.values()).filter((a) => a.ownerId === userId &&
            a.createdAt >= startDate &&
            a.createdAt <= endDate);
        const byType = {};
        const byOutcome = {};
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
    async createTimelineEntries(activity) {
        const baseEntry = {
            eventType: 'activity',
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
    generateId() {
        return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ActivityService = ActivityService;
exports.activityService = new ActivityService();
