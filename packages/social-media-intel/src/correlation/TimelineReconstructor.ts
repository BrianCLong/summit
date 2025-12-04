/**
 * Timeline Reconstructor - Reconstructs activity timelines
 */

import type { SocialPost } from '../types/index.js';

export interface TimelineEvent {
  timestamp: Date;
  platform: string;
  type: 'post' | 'comment' | 'like' | 'share' | 'follow';
  content?: string;
  target?: string;
  metadata?: Record<string, any>;
}

export interface Timeline {
  events: TimelineEvent[];
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  platforms: string[];
  activityPattern: {
    hourly: number[];
    daily: number[];
    peakHour: number;
    peakDay: number;
  };
}

export class TimelineReconstructor {
  /**
   * Build comprehensive timeline from multiple sources
   */
  buildTimeline(posts: SocialPost[]): Timeline {
    const events: TimelineEvent[] = posts.map(post => ({
      timestamp: post.timestamp,
      platform: post.platform,
      type: 'post',
      content: post.content,
      metadata: {
        likes: post.likes,
        comments: post.comments,
        shares: post.shares
      }
    }));

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const startDate = events[0]?.timestamp || new Date();
    const endDate = events[events.length - 1]?.timestamp || new Date();
    const platforms = Array.from(new Set(events.map(e => e.platform)));

    return {
      events,
      startDate,
      endDate,
      totalEvents: events.length,
      platforms,
      activityPattern: this.analyzeActivityPattern(events)
    };
  }

  /**
   * Analyze activity patterns
   */
  private analyzeActivityPattern(events: TimelineEvent[]): {
    hourly: number[];
    daily: number[];
    peakHour: number;
    peakDay: number;
  } {
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      const day = event.timestamp.getDay();
      hourly[hour]++;
      daily[day]++;
    });

    const peakHour = hourly.indexOf(Math.max(...hourly));
    const peakDay = daily.indexOf(Math.max(...daily));

    return {
      hourly,
      daily,
      peakHour,
      peakDay
    };
  }

  /**
   * Detect gaps in activity
   */
  detectGaps(
    timeline: Timeline,
    thresholdDays: number = 7
  ): Array<{ start: Date; end: Date; durationDays: number }> {
    const gaps: Array<{ start: Date; end: Date; durationDays: number }> = [];
    const events = timeline.events;

    for (let i = 1; i < events.length; i++) {
      const prevTime = events[i - 1].timestamp.getTime();
      const currTime = events[i].timestamp.getTime();
      const gapDays = (currTime - prevTime) / (1000 * 60 * 60 * 24);

      if (gapDays >= thresholdDays) {
        gaps.push({
          start: events[i - 1].timestamp,
          end: events[i].timestamp,
          durationDays: gapDays
        });
      }
    }

    return gaps;
  }

  /**
   * Generate timeline visualization data
   */
  generateVisualizationData(timeline: Timeline): {
    timeSeriesData: Array<{ date: string; count: number }>;
    heatmapData: Array<{ hour: number; day: number; value: number }>;
  } {
    // Group events by date
    const dailyCounts = new Map<string, number>();
    timeline.events.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    const timeSeriesData = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate heatmap data (hour x day of week)
    const heatmapData: Array<{ hour: number; day: number; value: number }> = [];
    const heatmap = new Array(7).fill(0).map(() => new Array(24).fill(0));

    timeline.events.forEach(event => {
      const hour = event.timestamp.getHours();
      const day = event.timestamp.getDay();
      heatmap[day][hour]++;
    });

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({ hour, day, value: heatmap[day][hour] });
      }
    }

    return {
      timeSeriesData,
      heatmapData
    };
  }
}
