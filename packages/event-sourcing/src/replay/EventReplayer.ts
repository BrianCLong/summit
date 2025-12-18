/**
 * EventReplayer - Replay events for rebuilding read models
 *
 * Stream and replay events with progress tracking
 */

import { EventEmitter } from 'events';
import { EventStore } from '../store/EventStore.js';
import pino from 'pino';
import type { DomainEvent, ReplayOptions } from '../store/types.js';

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export interface ReplayProgress {
  totalEvents: number;
  processedEvents: number;
  startTime: Date;
  elapsedMs: number;
  eventsPerSecond: number;
}

export class EventReplayer extends EventEmitter {
  private eventStore: EventStore;
  private logger: pino.Logger;
  private handlers: Map<string, EventHandler[]> = new Map();
  private catchAllHandlers: EventHandler[] = [];

  constructor(eventStore: EventStore) {
    super();
    this.eventStore = eventStore;
    this.logger = pino({ name: 'EventReplayer' });
  }

  /**
   * Register event handler for specific event type
   */
  on(eventType: string, handler: EventHandler): this {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return this;
  }

  /**
   * Register catch-all handler for all events
   */
  onAny(handler: EventHandler): this {
    this.catchAllHandlers.push(handler);
    return this;
  }

  /**
   * Replay all events
   */
  async replay(options: ReplayOptions = {}): Promise<ReplayProgress> {
    const startTime = new Date();
    let processedEvents = 0;
    let totalEvents = 0;

    this.logger.info({ options }, 'Starting event replay');
    this.emit('replay:started');

    try {
      const batchSize = options.batchSize || 1000;
      const eventBatches = await this.eventStore.getAllEvents(
        options.fromTimestamp,
        batchSize
      );

      for await (const events of eventBatches) {
        // Filter events by version and timestamp
        const filteredEvents = events.filter(event => {
          if (
            options.fromVersion !== undefined &&
            event.version < options.fromVersion
          ) {
            return false;
          }

          if (
            options.toVersion !== undefined &&
            event.version > options.toVersion
          ) {
            return false;
          }

          if (
            options.fromTimestamp &&
            event.timestamp < options.fromTimestamp
          ) {
            return false;
          }

          if (
            options.toTimestamp &&
            event.timestamp > options.toTimestamp
          ) {
            return false;
          }

          return true;
        });

        totalEvents += filteredEvents.length;

        // Process events in batch
        for (const event of filteredEvents) {
          await this.processEvent(event);
          processedEvents++;

          if (processedEvents % 1000 === 0) {
            const progress = this.calculateProgress(
              startTime,
              totalEvents,
              processedEvents
            );
            this.emit('replay:progress', progress);
            this.logger.info(progress, 'Replay progress');
          }
        }
      }

      const finalProgress = this.calculateProgress(
        startTime,
        totalEvents,
        processedEvents
      );

      this.emit('replay:completed', finalProgress);
      this.logger.info(finalProgress, 'Replay completed');

      return finalProgress;
    } catch (err) {
      this.logger.error({ err }, 'Replay failed');
      this.emit('replay:failed', err);
      throw err;
    }
  }

  /**
   * Replay events for specific aggregate
   */
  async replayAggregate(
    aggregateId: string,
    fromVersion: number = 0
  ): Promise<number> {
    this.logger.info({ aggregateId, fromVersion }, 'Replaying aggregate');

    const stream = await this.eventStore.getEventStream(
      aggregateId,
      fromVersion
    );

    for (const event of stream.events) {
      await this.processEvent(event);
    }

    return stream.events.length;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    try {
      // Call type-specific handlers
      const handlers = this.handlers.get(event.eventType) || [];
      for (const handler of handlers) {
        await handler(event);
      }

      // Call catch-all handlers
      for (const handler of this.catchAllHandlers) {
        await handler(event);
      }

      this.emit('event:processed', event);
    } catch (err) {
      this.logger.error(
        { err, eventId: event.eventId, eventType: event.eventType },
        'Event processing failed'
      );
      this.emit('event:failed', { event, error: err });
      throw err;
    }
  }

  /**
   * Calculate replay progress
   */
  private calculateProgress(
    startTime: Date,
    totalEvents: number,
    processedEvents: number
  ): ReplayProgress {
    const elapsedMs = Date.now() - startTime.getTime();
    const eventsPerSecond = processedEvents / (elapsedMs / 1000);

    return {
      totalEvents,
      processedEvents,
      startTime,
      elapsedMs,
      eventsPerSecond
    };
  }
}
