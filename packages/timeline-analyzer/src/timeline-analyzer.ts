import { Timeline, TimelineAnalysis, TemporalCorrelation } from './types.js';
import crypto from 'crypto';

/**
 * Analyzer for detecting patterns and anomalies in timelines
 */
export class TimelineAnalyzer {
  /**
   * Analyze a timeline
   */
  analyze(timeline: Timeline): TimelineAnalysis {
    const correlations = this.detectCorrelations(timeline);
    const anomalies = this.detectAnomalies(timeline);
    const patterns = this.detectPatterns(timeline);
    const gaps = this.detectGaps(timeline);

    return {
      id: this.generateId(),
      createdAt: new Date(),
      timeline,
      correlations,
      anomalies,
      patterns,
      gaps,
    };
  }

  /**
   * Detect temporal correlations between events
   */
  private detectCorrelations(timeline: Timeline): TemporalCorrelation[] {
    const correlations: TemporalCorrelation[] = [];
    const events = timeline.events;

    // Detect sequences (events happening in order)
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();

      // If events happen within 1 minute and are from same artifact
      if (timeDiff < 60000 && current.artifactId === next.artifactId) {
        correlations.push({
          id: this.generateId(),
          eventIds: [current.id, next.id],
          correlationType: 'sequence',
          confidence: 0.9,
          evidence: `Events occurred ${timeDiff}ms apart from same artifact`,
        });
      }

      // If events happen concurrently (within 1 second)
      if (timeDiff < 1000) {
        correlations.push({
          id: this.generateId(),
          eventIds: [current.id, next.id],
          correlationType: 'concurrent',
          confidence: 0.95,
          evidence: `Events occurred within 1 second`,
        });
      }
    }

    // Detect periodic patterns
    const periodicEvents = this.detectPeriodicEvents(events);
    for (const pattern of periodicEvents) {
      correlations.push({
        id: this.generateId(),
        eventIds: pattern.eventIds,
        correlationType: 'periodic',
        confidence: pattern.confidence,
        evidence: `Events repeat every ${pattern.period}ms`,
        pattern: `${pattern.period}ms interval`,
      });
    }

    return correlations;
  }

  /**
   * Detect anomalies in the timeline
   */
  private detectAnomalies(timeline: Timeline): TimelineAnalysis['anomalies'] {
    const anomalies: TimelineAnalysis['anomalies'] = [];
    const events = timeline.events;

    // Detect timestamp reversals (modified before created)
    const byArtifact = new Map<string, typeof events>();
    for (const event of events) {
      if (!byArtifact.has(event.artifactId)) {
        byArtifact.set(event.artifactId, []);
      }
      byArtifact.get(event.artifactId)!.push(event);
    }

    for (const [artifactId, artifactEvents] of byArtifact) {
      const created = artifactEvents.find(e => e.eventType === 'created');
      const modified = artifactEvents.find(e => e.eventType === 'modified');

      if (created && modified && modified.timestamp < created.timestamp) {
        anomalies.push({
          type: 'temporal_reversal',
          severity: 'high',
          description: 'Modified timestamp is before creation timestamp',
          eventIds: [created.id, modified.id],
          evidence: { created: created.timestamp, modified: modified.timestamp },
        });
      }
    }

    // Detect unusual activity bursts
    const bursts = this.detectBursts(events);
    for (const burst of bursts) {
      anomalies.push({
        type: 'activity_burst',
        severity: 'medium',
        description: `Unusually high activity: ${burst.count} events in ${burst.duration}ms`,
        eventIds: burst.eventIds,
        evidence: burst,
      });
    }

    return anomalies;
  }

  /**
   * Detect patterns in the timeline
   */
  private detectPatterns(timeline: Timeline): TimelineAnalysis['patterns'] {
    const patterns: TimelineAnalysis['patterns'] = [];

    // Detect event type patterns
    const eventTypeCounts = new Map<string, number>();
    for (const event of timeline.events) {
      eventTypeCounts.set(event.eventType, (eventTypeCounts.get(event.eventType) || 0) + 1);
    }

    for (const [eventType, count] of eventTypeCounts) {
      if (count > 1) {
        const eventIds = timeline.events
          .filter(e => e.eventType === eventType)
          .map(e => e.id);

        patterns.push({
          type: 'event_repetition',
          description: `${eventType} events repeated ${count} times`,
          occurrences: count,
          eventIds,
          confidence: 0.9,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect gaps in the timeline
   */
  private detectGaps(timeline: Timeline): TimelineAnalysis['gaps'] {
    const gaps: TimelineAnalysis['gaps'] = [];
    const events = timeline.events;

    const totalDuration = timeline.endTime.getTime() - timeline.startTime.getTime();
    const averageInterval = totalDuration / events.length;

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];
      const gap = next.timestamp.getTime() - current.timestamp.getTime();

      // If gap is significantly larger than average
      if (gap > averageInterval * 5) {
        gaps.push({
          startTime: current.timestamp,
          endTime: next.timestamp,
          duration: gap,
          severity: gap > averageInterval * 10 ? 'high' : 'medium',
        });
      }
    }

    return gaps;
  }

  /**
   * Detect periodic events
   */
  private detectPeriodicEvents(events: typeof Timeline.events): Array<{
    eventIds: string[];
    period: number;
    confidence: number;
  }> {
    const patterns: Array<{
      eventIds: string[];
      period: number;
      confidence: number;
    }> = [];

    if (events.length < 3) return patterns;

    // Group by event type
    const byType = new Map<string, typeof events>();
    for (const event of events) {
      if (!byType.has(event.eventType)) {
        byType.set(event.eventType, []);
      }
      byType.get(event.eventType)!.push(event);
    }

    // Check for periodicity in each type
    for (const typeEvents of byType.values()) {
      if (typeEvents.length < 3) continue;

      const intervals: number[] = [];
      for (let i = 0; i < typeEvents.length - 1; i++) {
        const interval = typeEvents[i + 1].timestamp.getTime() - typeEvents[i].timestamp.getTime();
        intervals.push(interval);
      }

      // Check if intervals are similar (within 10% variance)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev / avgInterval < 0.1) {
        // Intervals are consistent - likely periodic
        patterns.push({
          eventIds: typeEvents.map(e => e.id),
          period: avgInterval,
          confidence: 1 - (stdDev / avgInterval),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect activity bursts
   */
  private detectBursts(events: typeof Timeline.events): Array<{
    count: number;
    duration: number;
    eventIds: string[];
  }> {
    const bursts: Array<{
      count: number;
      duration: number;
      eventIds: string[];
    }> = [];

    // Sliding window to detect bursts
    const windowSize = 60000; // 1 minute
    const threshold = 10; // 10 events in 1 minute

    for (let i = 0; i < events.length; i++) {
      const windowStart = events[i].timestamp.getTime();
      const windowEnd = windowStart + windowSize;

      const windowEvents = [];
      for (let j = i; j < events.length; j++) {
        if (events[j].timestamp.getTime() <= windowEnd) {
          windowEvents.push(events[j]);
        } else {
          break;
        }
      }

      if (windowEvents.length >= threshold) {
        bursts.push({
          count: windowEvents.length,
          duration: windowSize,
          eventIds: windowEvents.map(e => e.id),
        });
      }
    }

    return bursts;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
