/**
 * EventNotification - Event notification pattern
 *
 * Domain events with flexible subscription and filtering
 */

import { EventEmitter } from 'events';
import { EventBus } from '@intelgraph/event-bus';
import pino from 'pino';

export interface DomainEventNotification<T = any> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  timestamp: Date;
  version?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export type EventSubscriber<T = any> = (
  event: DomainEventNotification<T>
) => Promise<void> | void;

export interface SubscriptionFilter {
  eventTypes?: string[];
  aggregateTypes?: string[];
  aggregateIds?: string[];
}

export class EventNotificationService extends EventEmitter {
  private eventBus: EventBus;
  private logger: pino.Logger;
  private subscriptions: Map<string, {
    filter?: SubscriptionFilter;
    subscriber: EventSubscriber;
  }> = new Map();

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger = pino({ name: 'EventNotificationService' });
  }

  /**
   * Publish domain event notification
   */
  async publish<T = any>(
    event: DomainEventNotification<T>
  ): Promise<void> {
    this.logger.debug(
      { eventId: event.eventId, eventType: event.eventType },
      'Publishing event notification'
    );

    // Publish to general events topic
    await this.eventBus.publish('domain.events', event);

    // Publish to event-type specific topic
    await this.eventBus.publish(`domain.events.${event.eventType}`, event);

    // Publish to aggregate-type specific topic
    await this.eventBus.publish(
      `domain.events.${event.aggregateType}`,
      event
    );

    this.emit('event:published', event);
  }

  /**
   * Subscribe to events with optional filter
   */
  async subscribe<T = any>(
    subscriber: EventSubscriber<T>,
    filter?: SubscriptionFilter
  ): Promise<string> {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`;

    this.subscriptions.set(subscriptionId, {
      filter,
      subscriber: subscriber as EventSubscriber
    });

    // Subscribe to general events topic
    await this.eventBus.subscribe('domain.events', async (message) => {
      const event = message.payload as DomainEventNotification;

      if (this.matchesFilter(event, filter)) {
        try {
          await subscriber(event as any);
        } catch (err) {
          this.logger.error(
            { err, eventId: event.eventId },
            'Subscriber error'
          );
          this.emit('subscriber:error', { event, error: err });
        }
      }
    });

    this.logger.info({ subscriptionId, filter }, 'Subscription created');

    return subscriptionId;
  }

  /**
   * Subscribe to specific event types
   */
  async subscribeToEventTypes<T = any>(
    eventTypes: string[],
    subscriber: EventSubscriber<T>
  ): Promise<string> {
    return this.subscribe(subscriber, { eventTypes });
  }

  /**
   * Subscribe to specific aggregate types
   */
  async subscribeToAggregateTypes<T = any>(
    aggregateTypes: string[],
    subscriber: EventSubscriber<T>
  ): Promise<string> {
    return this.subscribe(subscriber, { aggregateTypes });
  }

  /**
   * Subscribe to specific aggregate instances
   */
  async subscribeToAggregates<T = any>(
    aggregateIds: string[],
    subscriber: EventSubscriber<T>
  ): Promise<string> {
    return this.subscribe(subscriber, { aggregateIds });
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(
    event: DomainEventNotification,
    filter?: SubscriptionFilter
  ): boolean {
    if (!filter) return true;

    if (
      filter.eventTypes &&
      !filter.eventTypes.includes(event.eventType)
    ) {
      return false;
    }

    if (
      filter.aggregateTypes &&
      !filter.aggregateTypes.includes(event.aggregateType)
    ) {
      return false;
    }

    if (
      filter.aggregateIds &&
      !filter.aggregateIds.includes(event.aggregateId)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Unsubscribe
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    this.logger.info({ subscriptionId }, 'Unsubscribed');
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
