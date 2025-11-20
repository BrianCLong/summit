import { Logger } from 'pino';

/**
 * Event handler function
 */
export type EventHandler = (topic: string, data: any) => void;

/**
 * Event bus for publish-subscribe messaging
 */
export class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Publish an event to a topic
   */
  publish(topic: string, data: any): void {
    this.logger.debug({ topic }, 'Publishing event');

    // Notify subscribers to this specific topic
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.forEach(handler => {
        try {
          handler(topic, data);
        } catch (error) {
          this.logger.error({ error, topic }, 'Error in event handler');
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(handler => {
        try {
          handler(topic, data);
        } catch (error) {
          this.logger.error({ error, topic }, 'Error in wildcard event handler');
        }
      });
    }

    // Notify pattern subscribers (e.g., "risk.*")
    this.subscribers.forEach((handlers, pattern) => {
      if (pattern !== '*' && pattern !== topic && this.matchesPattern(topic, pattern)) {
        handlers.forEach(handler => {
          try {
            handler(topic, data);
          } catch (error) {
            this.logger.error({ error, topic, pattern }, 'Error in pattern event handler');
          }
        });
      }
    });
  }

  /**
   * Subscribe to events on a topic
   */
  subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }

    this.subscribers.get(topic)!.add(handler);

    this.logger.debug({ topic }, 'Subscribed to topic');

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  /**
   * Get subscriber count for a topic
   */
  getSubscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.size || 0;
  }

  /**
   * Get all topics with subscribers
   */
  getTopics(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }

  // Private methods

  private matchesPattern(topic: string, pattern: string): boolean {
    // Convert pattern to regex (support * wildcard)
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }
}
