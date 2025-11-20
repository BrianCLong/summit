/**
 * Report analytics and metrics tracking
 */

import { v4 as uuidv4 } from 'uuid';
import type { ReportAnalytics, DisseminationRecord } from './types.js';

export interface ViewEvent {
  reportId: string;
  userId: string;
  timestamp: Date;
  duration?: number; // seconds
  sectionsViewed?: string[];
}

export interface DownloadEvent {
  reportId: string;
  userId: string;
  timestamp: Date;
  format: string;
}

export interface FeedbackEvent {
  reportId: string;
  userId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
}

export class AnalyticsTracker {
  private analytics: Map<string, ReportAnalytics> = new Map();
  private dissemination: Map<string, DisseminationRecord[]> = new Map();
  private viewEvents: ViewEvent[] = [];
  private downloadEvents: DownloadEvent[] = [];
  private feedbackEvents: FeedbackEvent[] = [];

  /**
   * Initialize analytics for a report
   */
  initializeAnalytics(reportId: string): ReportAnalytics {
    const analytics: ReportAnalytics = {
      reportId,
      views: 0,
      downloads: 0,
      uniqueViewers: 0,
      engagement: {
        opened: 0,
        sectionsViewed: {},
        attachmentsOpened: {}
      }
    };

    this.analytics.set(reportId, analytics);
    return analytics;
  }

  /**
   * Track a view event
   */
  trackView(event: ViewEvent): void {
    this.viewEvents.push(event);

    const analytics = this.analytics.get(event.reportId);
    if (!analytics) {
      this.initializeAnalytics(event.reportId);
      return this.trackView(event);
    }

    analytics.views++;
    analytics.engagement.opened++;

    // Track unique viewers
    const uniqueViewers = new Set(
      this.viewEvents
        .filter(e => e.reportId === event.reportId)
        .map(e => e.userId)
    );
    analytics.uniqueViewers = uniqueViewers.size;

    // Update average time spent
    const durations = this.viewEvents
      .filter(e => e.reportId === event.reportId && e.duration)
      .map(e => e.duration!);

    if (durations.length > 0) {
      analytics.averageTimeSpent =
        durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // Track sections viewed
    if (event.sectionsViewed) {
      for (const section of event.sectionsViewed) {
        const count = analytics.engagement.sectionsViewed?.[section] || 0;
        analytics.engagement.sectionsViewed = {
          ...analytics.engagement.sectionsViewed,
          [section]: count + 1
        };
      }
    }
  }

  /**
   * Track a download event
   */
  trackDownload(event: DownloadEvent): void {
    this.downloadEvents.push(event);

    const analytics = this.analytics.get(event.reportId);
    if (!analytics) {
      this.initializeAnalytics(event.reportId);
      return this.trackDownload(event);
    }

    analytics.downloads++;
  }

  /**
   * Track feedback
   */
  trackFeedback(event: FeedbackEvent): void {
    this.feedbackEvents.push(event);

    const analytics = this.analytics.get(event.reportId);
    if (!analytics) {
      this.initializeAnalytics(event.reportId);
      return this.trackFeedback(event);
    }

    analytics.feedback = [
      ...(analytics.feedback || []),
      {
        userId: event.userId,
        rating: event.rating,
        comment: event.comment,
        timestamp: event.timestamp
      }
    ];
  }

  /**
   * Get analytics for a report
   */
  getAnalytics(reportId: string): ReportAnalytics | undefined {
    return this.analytics.get(reportId);
  }

  /**
   * Track dissemination
   */
  trackDissemination(record: Omit<DisseminationRecord, 'id'>): DisseminationRecord {
    const disseminationRecord: DisseminationRecord = {
      ...record,
      id: uuidv4()
    };

    const records = this.dissemination.get(record.reportId) || [];
    records.push(disseminationRecord);
    this.dissemination.set(record.reportId, records);

    return disseminationRecord;
  }

  /**
   * Update dissemination record (e.g., when accessed or downloaded)
   */
  updateDissemination(
    recordId: string,
    reportId: string,
    updates: Partial<DisseminationRecord>
  ): DisseminationRecord {
    const records = this.dissemination.get(reportId) || [];
    const record = records.find(r => r.id === recordId);

    if (!record) {
      throw new Error(`Dissemination record not found: ${recordId}`);
    }

    Object.assign(record, updates);
    return record;
  }

  /**
   * Get dissemination records for a report
   */
  getDisseminationRecords(reportId: string): DisseminationRecord[] {
    return this.dissemination.get(reportId) || [];
  }

  /**
   * Get engagement metrics
   */
  getEngagementMetrics(reportId: string): {
    viewRate: number;
    downloadRate: number;
    averageRating: number;
    completionRate: number;
  } {
    const analytics = this.analytics.get(reportId);
    if (!analytics) {
      return {
        viewRate: 0,
        downloadRate: 0,
        averageRating: 0,
        completionRate: 0
      };
    }

    const disseminationRecords = this.getDisseminationRecords(reportId);
    const totalDistributed = disseminationRecords.length;

    const viewRate = totalDistributed > 0
      ? analytics.views / totalDistributed
      : 0;

    const downloadRate = totalDistributed > 0
      ? analytics.downloads / totalDistributed
      : 0;

    const ratings = analytics.feedback?.map(f => f.rating) || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    // Completion rate based on unique viewers vs distributed
    const completionRate = totalDistributed > 0
      ? analytics.uniqueViewers / totalDistributed
      : 0;

    return {
      viewRate,
      downloadRate,
      averageRating,
      completionRate
    };
  }

  /**
   * Get popular reports
   */
  getPopularReports(limit: number = 10): Array<{
    reportId: string;
    views: number;
    downloads: number;
    rating: number;
  }> {
    return Array.from(this.analytics.values())
      .map(a => {
        const ratings = a.feedback?.map(f => f.rating) || [];
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;

        return {
          reportId: a.reportId,
          views: a.views,
          downloads: a.downloads,
          rating: avgRating
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}
