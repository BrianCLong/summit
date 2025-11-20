/**
 * Stored event
 */
export interface StoredEvent {
  id: string;
  topic: string;
  data: any;
  timestamp: Date;
}

/**
 * Event query options
 */
export interface EventQuery {
  topic?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

/**
 * Event store for persisting events
 */
export class EventStore {
  private events: StoredEvent[] = [];
  private eventIndex: Map<string, StoredEvent> = new Map();
  private topicIndex: Map<string, StoredEvent[]> = new Map();

  /**
   * Store an event
   */
  store(event: StoredEvent): void {
    this.events.push(event);
    this.eventIndex.set(event.id, event);

    // Update topic index
    if (!this.topicIndex.has(event.topic)) {
      this.topicIndex.set(event.topic, []);
    }
    this.topicIndex.get(event.topic)!.push(event);

    // Cleanup old events (keep last 10000)
    if (this.events.length > 10000) {
      const removed = this.events.shift()!;
      this.eventIndex.delete(removed.id);

      const topicEvents = this.topicIndex.get(removed.topic);
      if (topicEvents) {
        const idx = topicEvents.indexOf(removed);
        if (idx !== -1) {
          topicEvents.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Get event by ID
   */
  getById(id: string): StoredEvent | undefined {
    return this.eventIndex.get(id);
  }

  /**
   * Query events
   */
  query(options: EventQuery): StoredEvent[] {
    let results = this.events;

    // Filter by topic
    if (options.topic) {
      results = this.topicIndex.get(options.topic) || [];
    }

    // Filter by time range
    if (options.since) {
      results = results.filter(e => e.timestamp >= options.since!);
    }

    if (options.until) {
      results = results.filter(e => e.timestamp <= options.until!);
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(-options.limit);
    }

    return results;
  }

  /**
   * Get event statistics
   */
  getStatistics(): {
    totalEvents: number;
    topics: Array<{ topic: string; count: number }>;
    oldestEvent?: Date;
    newestEvent?: Date;
  } {
    const topics = Array.from(this.topicIndex.entries()).map(([topic, events]) => ({
      topic,
      count: events.length,
    }));

    return {
      totalEvents: this.events.length,
      topics,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.eventIndex.clear();
    this.topicIndex.clear();
  }
}
