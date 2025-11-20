import { EventEmitter } from 'events';

export interface AnalyticsEvent {
  id: string;
  workspace_id: string;
  user_id: string;
  event_type: string;
  event_category: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface WorkspaceMetrics {
  workspaceId: string;
  period: { start: Date; end: Date };
  metrics: {
    activeUsers: number;
    totalUsers: number;
    documentsCreated: number;
    documentsUpdated: number;
    commentsCreated: number;
    tasksCreated: number;
    tasksCompleted: number;
    meetingsHeld: number;
    collaborationScore: number;
  };
  trends: {
    userGrowth: number;
    activityGrowth: number;
    completionRate: number;
  };
  topContributors: Array<{
    userId: string;
    actionsCount: number;
    contributionScore: number;
  }>;
}

export interface UserAnalytics {
  userId: string;
  workspaceId: string;
  period: { start: Date; end: Date };
  activity: {
    documentsCreated: number;
    documentsEdited: number;
    commentsPosted: number;
    tasksCreated: number;
    tasksCompleted: number;
    meetingsAttended: number;
    collaborationTime: number; // in minutes
  };
  engagement: {
    loginFrequency: number; // days per week
    avgSessionDuration: number; // in minutes
    featureUsage: Record<string, number>;
    responseTime: number; // avg response time in hours
  };
  productivity: {
    tasksCompletedOnTime: number;
    tasksOverdue: number;
    avgTaskDuration: number; // in days
    efficiencyScore: number; // 0-100
  };
}

export interface DocumentAnalytics {
  documentId: string;
  views: number;
  uniqueViewers: number;
  edits: number;
  contributors: string[];
  comments: number;
  shares: number;
  avgReadTime: number; // in minutes
  engagementScore: number; // 0-100
  trendingScore: number; // 0-100
  lastActivity: Date;
}

export interface TaskAnalytics {
  boardId: string;
  period: { start: Date; end: Date };
  metrics: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    blocked: number;
    completionRate: number;
    avgCompletionTime: number; // in days
    overdueCount: number;
  };
  velocityTrend: Array<{
    week: string;
    tasksCompleted: number;
    storyPoints: number;
  }>;
  bottlenecks: Array<{
    status: string;
    count: number;
    avgTimeInStatus: number; // in days
  }>;
}

/**
 * Collaboration Analytics Engine
 * Tracks and analyzes collaboration patterns and productivity
 */
export class CollaborationAnalytics extends EventEmitter {
  private events: AnalyticsEvent[] = [];

  constructor() {
    super();
  }

  /**
   * Track an analytics event
   */
  track(
    workspaceId: string,
    userId: string,
    eventType: string,
    category: string,
    properties?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      workspace_id: workspaceId,
      user_id: userId,
      event_type: eventType,
      event_category: category,
      properties: properties || {},
      timestamp: new Date()
    };

    this.events.push(event);
    this.emit('event', event);

    // Persist to analytics backend (e.g., ClickHouse, BigQuery)
    this.persistEvent(event);
  }

  /**
   * Get workspace metrics
   */
  async getWorkspaceMetrics(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkspaceMetrics> {
    const events = this.events.filter(
      e =>
        e.workspace_id === workspaceId &&
        e.timestamp >= startDate &&
        e.timestamp <= endDate
    );

    // Calculate metrics
    const uniqueUsers = new Set(events.map(e => e.user_id));
    const documents = events.filter(e => e.event_category === 'document');
    const comments = events.filter(e => e.event_category === 'comment');
    const tasks = events.filter(e => e.event_category === 'task');
    const meetings = events.filter(e => e.event_category === 'meeting');

    // Calculate contribution scores
    const contributorMap = new Map<string, number>();
    for (const event of events) {
      const current = contributorMap.get(event.user_id) || 0;
      contributorMap.set(event.user_id, current + 1);
    }

    const topContributors = Array.from(contributorMap.entries())
      .map(([userId, actionsCount]) => ({
        userId,
        actionsCount,
        contributionScore: this.calculateContributionScore(actionsCount, events.length)
      }))
      .sort((a, b) => b.contributionScore - a.contributionScore)
      .slice(0, 10);

    return {
      workspaceId,
      period: { start: startDate, end: endDate },
      metrics: {
        activeUsers: uniqueUsers.size,
        totalUsers: uniqueUsers.size, // Would query total from DB
        documentsCreated: documents.filter(e => e.event_type === 'created').length,
        documentsUpdated: documents.filter(e => e.event_type === 'updated').length,
        commentsCreated: comments.filter(e => e.event_type === 'created').length,
        tasksCreated: tasks.filter(e => e.event_type === 'created').length,
        tasksCompleted: tasks.filter(e => e.event_type === 'completed').length,
        meetingsHeld: meetings.filter(e => e.event_type === 'held').length,
        collaborationScore: this.calculateCollaborationScore(events)
      },
      trends: {
        userGrowth: 0, // Calculate from historical data
        activityGrowth: 0,
        completionRate:
          tasks.filter(e => e.event_type === 'created').length > 0
            ? (tasks.filter(e => e.event_type === 'completed').length /
                tasks.filter(e => e.event_type === 'created').length) *
              100
            : 0
      },
      topContributors
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    userId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserAnalytics> {
    const events = this.events.filter(
      e =>
        e.user_id === userId &&
        e.workspace_id === workspaceId &&
        e.timestamp >= startDate &&
        e.timestamp <= endDate
    );

    // Calculate feature usage
    const featureUsage: Record<string, number> = {};
    for (const event of events) {
      featureUsage[event.event_category] = (featureUsage[event.event_category] || 0) + 1;
    }

    return {
      userId,
      workspaceId,
      period: { start: startDate, end: endDate },
      activity: {
        documentsCreated: events.filter(
          e => e.event_category === 'document' && e.event_type === 'created'
        ).length,
        documentsEdited: events.filter(
          e => e.event_category === 'document' && e.event_type === 'updated'
        ).length,
        commentsPosted: events.filter(
          e => e.event_category === 'comment' && e.event_type === 'created'
        ).length,
        tasksCreated: events.filter(
          e => e.event_category === 'task' && e.event_type === 'created'
        ).length,
        tasksCompleted: events.filter(
          e => e.event_category === 'task' && e.event_type === 'completed'
        ).length,
        meetingsAttended: events.filter(
          e => e.event_category === 'meeting' && e.event_type === 'attended'
        ).length,
        collaborationTime: events.length * 5 // Rough estimate: 5 min per action
      },
      engagement: {
        loginFrequency: this.calculateLoginFrequency(events, startDate, endDate),
        avgSessionDuration: 45, // Would calculate from session data
        featureUsage,
        responseTime: this.calculateAvgResponseTime(events)
      },
      productivity: {
        tasksCompletedOnTime: events.filter(
          e =>
            e.event_category === 'task' &&
            e.event_type === 'completed' &&
            e.properties.onTime
        ).length,
        tasksOverdue: events.filter(
          e => e.event_category === 'task' && e.event_type === 'overdue'
        ).length,
        avgTaskDuration: 3.5, // Would calculate from task data
        efficiencyScore: this.calculateEfficiencyScore(events)
      }
    };
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(documentId: string): Promise<DocumentAnalytics> {
    const events = this.events.filter(
      e => e.properties.documentId === documentId
    );

    const views = events.filter(e => e.event_type === 'viewed');
    const edits = events.filter(e => e.event_type === 'updated');
    const comments = events.filter(
      e => e.event_category === 'comment' && e.properties.documentId === documentId
    );
    const shares = events.filter(e => e.event_type === 'shared');

    const uniqueViewers = new Set(views.map(e => e.user_id));
    const contributors = new Set(edits.map(e => e.user_id));

    return {
      documentId,
      views: views.length,
      uniqueViewers: uniqueViewers.size,
      edits: edits.length,
      contributors: Array.from(contributors),
      comments: comments.length,
      shares: shares.length,
      avgReadTime: 8, // Would calculate from session data
      engagementScore: this.calculateEngagementScore(views.length, comments.length, shares.length),
      trendingScore: this.calculateTrendingScore(events),
      lastActivity: events.length > 0 ? events[events.length - 1].timestamp : new Date()
    };
  }

  /**
   * Get task board analytics
   */
  async getTaskAnalytics(
    boardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaskAnalytics> {
    const events = this.events.filter(
      e =>
        e.event_category === 'task' &&
        e.properties.boardId === boardId &&
        e.timestamp >= startDate &&
        e.timestamp <= endDate
    );

    const totalTasks = new Set(events.map(e => e.properties.taskId)).size;
    const completed = events.filter(e => e.event_type === 'completed').length;
    const inProgress = events.filter(e => e.event_type === 'started').length;
    const blocked = events.filter(e => e.event_type === 'blocked').length;

    return {
      boardId,
      period: { start: startDate, end: endDate },
      metrics: {
        totalTasks,
        completed,
        inProgress,
        blocked,
        completionRate: totalTasks > 0 ? (completed / totalTasks) * 100 : 0,
        avgCompletionTime: 4.2, // Would calculate from task data
        overdueCount: events.filter(e => e.event_type === 'overdue').length
      },
      velocityTrend: this.calculateVelocityTrend(events, startDate, endDate),
      bottlenecks: this.identifyBottlenecks(events)
    };
  }

  /**
   * Detect anomalies in collaboration patterns
   */
  detectAnomalies(
    workspaceId: string,
    threshold: number = 2
  ): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: Date;
  }> {
    const anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      timestamp: Date;
    }> = [];

    const events = this.events.filter(e => e.workspace_id === workspaceId);

    // Check for unusual activity spikes
    const hourlyActivity = this.groupByHour(events);
    const avgActivity = hourlyActivity.reduce((sum, count) => sum + count, 0) / hourlyActivity.length;
    const stdDev = this.calculateStdDev(hourlyActivity, avgActivity);

    for (let i = 0; i < hourlyActivity.length; i++) {
      if (hourlyActivity[i] > avgActivity + threshold * stdDev) {
        anomalies.push({
          type: 'activity_spike',
          severity: 'medium',
          description: `Unusual activity spike detected: ${hourlyActivity[i]} events (avg: ${avgActivity.toFixed(1)})`,
          timestamp: new Date(Date.now() - (hourlyActivity.length - i) * 60 * 60 * 1000)
        });
      }
    }

    // Check for decreased collaboration
    const recentEvents = events.filter(
      e => e.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const previousEvents = events.filter(
      e =>
        e.timestamp <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
        e.timestamp > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    if (recentEvents.length < previousEvents.length * 0.5) {
      anomalies.push({
        type: 'decreased_activity',
        severity: 'high',
        description: `Collaboration activity decreased by ${((1 - recentEvents.length / previousEvents.length) * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    return anomalies;
  }

  // Private helper methods

  private calculateCollaborationScore(events: AnalyticsEvent[]): number {
    // Weighted score based on different collaboration activities
    const weights = {
      comment: 3,
      document: 2,
      task: 2,
      meeting: 5,
      share: 4
    };

    const score = events.reduce((sum, event) => {
      return sum + (weights[event.event_category as keyof typeof weights] || 1);
    }, 0);

    return Math.min(100, (score / events.length) * 10);
  }

  private calculateContributionScore(userActions: number, totalActions: number): number {
    return (userActions / totalActions) * 100;
  }

  private calculateLoginFrequency(
    events: AnalyticsEvent[],
    startDate: Date,
    endDate: Date
  ): number {
    const loginEvents = events.filter(e => e.event_type === 'login');
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const weeks = days / 7;

    return loginEvents.length / weeks;
  }

  private calculateAvgResponseTime(events: AnalyticsEvent[]): number {
    // Calculate average time between receiving a mention and responding
    const responseEvents = events.filter(
      e => e.event_category === 'comment' && e.properties.isResponse
    );

    if (responseEvents.length === 0) return 24; // Default 24 hours

    const totalResponseTime = responseEvents.reduce((sum, event) => {
      return sum + (event.properties.responseTime || 12);
    }, 0);

    return totalResponseTime / responseEvents.length;
  }

  private calculateEfficiencyScore(events: AnalyticsEvent[]): number {
    const taskEvents = events.filter(e => e.event_category === 'task');
    const created = taskEvents.filter(e => e.event_type === 'created').length;
    const completed = taskEvents.filter(e => e.event_type === 'completed').length;
    const onTime = taskEvents.filter(
      e => e.event_type === 'completed' && e.properties.onTime
    ).length;

    if (created === 0) return 0;

    const completionRate = completed / created;
    const onTimeRate = onTime / completed;

    return Math.min(100, (completionRate * 0.6 + onTimeRate * 0.4) * 100);
  }

  private calculateEngagementScore(views: number, comments: number, shares: number): number {
    return Math.min(100, views * 1 + comments * 5 + shares * 10);
  }

  private calculateTrendingScore(events: AnalyticsEvent[]): number {
    const recentEvents = events.filter(
      e => e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const totalEvents = events.length;

    if (totalEvents === 0) return 0;

    return Math.min(100, (recentEvents.length / totalEvents) * 200);
  }

  private calculateVelocityTrend(
    events: AnalyticsEvent[],
    startDate: Date,
    endDate: Date
  ): TaskAnalytics['velocityTrend'] {
    const weeks: TaskAnalytics['velocityTrend'] = [];
    const current = new Date(startDate);

    while (current < endDate) {
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekEvents = events.filter(
        e => e.timestamp >= current && e.timestamp < weekEnd && e.event_type === 'completed'
      );

      weeks.push({
        week: current.toISOString().split('T')[0],
        tasksCompleted: weekEvents.length,
        storyPoints: weekEvents.reduce((sum, e) => sum + (e.properties.storyPoints || 1), 0)
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  private identifyBottlenecks(events: AnalyticsEvent[]): TaskAnalytics['bottlenecks'] {
    const statusMap = new Map<string, { count: number; totalTime: number }>();

    for (const event of events) {
      if (event.event_type === 'status_changed') {
        const status = event.properties.newStatus;
        const timeInStatus = event.properties.timeInStatus || 0;

        const current = statusMap.get(status) || { count: 0, totalTime: 0 };
        statusMap.set(status, {
          count: current.count + 1,
          totalTime: current.totalTime + timeInStatus
        });
      }
    }

    return Array.from(statusMap.entries())
      .map(([status, data]) => ({
        status,
        count: data.count,
        avgTimeInStatus: data.count > 0 ? data.totalTime / data.count : 0
      }))
      .sort((a, b) => b.avgTimeInStatus - a.avgTimeInStatus)
      .slice(0, 5);
  }

  private groupByHour(events: AnalyticsEvent[]): number[] {
    const hourly: number[] = new Array(24).fill(0);

    for (const event of events) {
      const hour = event.timestamp.getHours();
      hourly[hour]++;
    }

    return hourly;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  private persistEvent(event: AnalyticsEvent): void {
    // Would persist to analytics backend
    // e.g., ClickHouse, BigQuery, Snowflake
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
