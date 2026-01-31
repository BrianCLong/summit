import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { CorrelationCriteria } from './types';

const logger = pino({ name: 'event-correlator' });

/**
 * Event correlator for cross-stream correlation
 */
export class EventCorrelator extends EventEmitter {
  private correlationGroups: Map<string, CorrelationGroup> = new Map();

  constructor(private criteria: CorrelationCriteria) {
    super();
    this.startCleanup();
  }

  /**
   * Add event to correlation
   */
  addEvent(stream: string, event: any): CorrelatedEvents[] {
    if (!this.criteria.streams.includes(stream)) {
      return [];
    }

    const correlationKey = this.criteria.correlationKey(event);
    let group = this.correlationGroups.get(correlationKey);

    if (!group) {
      group = {
        key: correlationKey,
        events: new Map(),
        startTime: Date.now(),
      };
      this.correlationGroups.set(correlationKey, group);
    }

    // Add event to stream
    if (!group.events.has(stream)) {
      group.events.set(stream, []);
    }
    group.events.get(stream)!.push({
      stream,
      event,
      timestamp: Date.now(),
    });

    // Check if correlation is complete
    if (this.isCorrelationComplete(group)) {
      return [this.createCorrelatedEvents(group)];
    }

    return [];
  }

  /**
   * Check if correlation is complete
   */
  private isCorrelationComplete(group: CorrelationGroup): boolean {
    // Check if minimum streams have events
    const streamCount = group.events.size;

    if (streamCount < this.criteria.minimumMatches) {
      return false;
    }

    // Check time window
    const elapsed = Date.now() - group.startTime;
    if (elapsed > this.criteria.timeWindow) {
      return true; // Consider complete even if partial
    }

    return streamCount >= this.criteria.streams.length;
  }

  /**
   * Create correlated events result
   */
  private createCorrelatedEvents(group: CorrelationGroup): CorrelatedEvents {
    const events: StreamEvent[] = [];

    for (const [stream, streamEvents] of group.events) {
      events.push(...streamEvents);
    }

    return {
      correlationKey: group.key,
      events,
      streamCount: group.events.size,
      startTime: group.startTime,
      endTime: Date.now(),
    };
  }

  /**
   * Cleanup old correlation groups
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [key, group] of this.correlationGroups) {
        if (now - group.startTime > this.criteria.timeWindow * 2) {
          this.correlationGroups.delete(key);
        }
      }
    }, this.criteria.timeWindow);
  }
}

interface CorrelationGroup {
  key: string;
  events: Map<string, StreamEvent[]>;
  startTime: number;
}

interface StreamEvent {
  stream: string;
  event: any;
  timestamp: number;
}

export interface CorrelatedEvents {
  correlationKey: string;
  events: StreamEvent[];
  streamCount: number;
  startTime: number;
  endTime: number;
}
