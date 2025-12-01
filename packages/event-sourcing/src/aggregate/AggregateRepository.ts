/**
 * AggregateRepository - Manage aggregate lifecycle and persistence
 *
 * Load, save, and manage aggregates with event sourcing
 */

import { EventStore } from '../store/EventStore.js';
import { SnapshotStore } from '../snapshot/SnapshotStore.js';
import pino from 'pino';
import type {
  DomainEvent,
  AggregateRoot,
  Snapshot
} from '../store/types.js';

export interface AggregateConstructor<T> {
  new (id: string): Aggregate<T>;
}

export abstract class Aggregate<T = any> {
  public readonly id: string;
  public readonly type: string;
  public version: number = 0;
  protected state: T;
  private uncommittedEvents: DomainEvent[] = [];

  constructor(id: string, type: string, initialState: T) {
    this.id = id;
    this.type = type;
    this.state = initialState;
  }

  /**
   * Apply an event to the aggregate
   */
  protected applyEvent(event: DomainEvent): void {
    this.apply(event);
    this.version = event.version;
  }

  /**
   * Raise a new event
   */
  protected raiseEvent(eventType: string, payload: any): void {
    const event: DomainEvent = {
      eventId: '',
      eventType,
      aggregateId: this.id,
      aggregateType: this.type,
      version: this.version + 1,
      timestamp: new Date(),
      payload
    };

    this.applyEvent(event);
    this.uncommittedEvents.push(event);
  }

  /**
   * Apply event to state (must be implemented by subclasses)
   */
  protected abstract apply(event: DomainEvent): void;

  /**
   * Get current state
   */
  getState(): T {
    return this.state;
  }

  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Clear uncommitted events
   */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Load from snapshot
   */
  loadFromSnapshot(snapshot: Snapshot<T>): void {
    this.state = snapshot.state;
    this.version = snapshot.version;
  }
}

export class AggregateRepository<T, A extends Aggregate<T>> {
  private eventStore: EventStore;
  private snapshotStore?: SnapshotStore;
  private aggregateConstructor: AggregateConstructor<T>;
  private logger: pino.Logger;
  private snapshotInterval: number;

  constructor(
    eventStore: EventStore,
    aggregateConstructor: AggregateConstructor<T>,
    snapshotStore?: SnapshotStore,
    snapshotInterval: number = 100
  ) {
    this.eventStore = eventStore;
    this.snapshotStore = snapshotStore;
    this.aggregateConstructor = aggregateConstructor;
    this.snapshotInterval = snapshotInterval;
    this.logger = pino({ name: 'AggregateRepository' });
  }

  /**
   * Load aggregate by ID
   */
  async load(aggregateId: string): Promise<A> {
    const aggregate = new this.aggregateConstructor(aggregateId) as A;

    let fromVersion = 0;

    // Try to load from snapshot
    if (this.snapshotStore) {
      const snapshot = await this.snapshotStore.getLatestSnapshot<T>(
        aggregateId
      );

      if (snapshot) {
        aggregate.loadFromSnapshot(snapshot);
        fromVersion = snapshot.version;

        this.logger.debug(
          { aggregateId, version: snapshot.version },
          'Loaded from snapshot'
        );
      }
    }

    // Load events since snapshot
    const stream = await this.eventStore.getEventStream(
      aggregateId,
      fromVersion
    );

    for (const event of stream.events) {
      (aggregate as any).applyEvent(event);
    }

    this.logger.debug(
      { aggregateId, version: aggregate.version, events: stream.events.length },
      'Aggregate loaded'
    );

    return aggregate;
  }

  /**
   * Save aggregate
   */
  async save(aggregate: A, expectedVersion?: number): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();

    if (uncommittedEvents.length === 0) {
      return;
    }

    // Append events to store
    await this.eventStore.appendEvents(
      aggregate.id,
      aggregate.type,
      uncommittedEvents,
      expectedVersion
    );

    aggregate.clearUncommittedEvents();

    // Create snapshot if needed
    if (
      this.snapshotStore &&
      aggregate.version % this.snapshotInterval === 0
    ) {
      await this.snapshotStore.saveSnapshot({
        aggregateId: aggregate.id,
        aggregateType: aggregate.type,
        version: aggregate.version,
        timestamp: new Date(),
        state: aggregate.getState()
      });

      this.logger.debug(
        { aggregateId: aggregate.id, version: aggregate.version },
        'Snapshot created'
      );
    }

    this.logger.debug(
      {
        aggregateId: aggregate.id,
        version: aggregate.version,
        events: uncommittedEvents.length
      },
      'Aggregate saved'
    );
  }

  /**
   * Check if aggregate exists
   */
  async exists(aggregateId: string): Promise<boolean> {
    const stream = await this.eventStore.getEventStream(aggregateId);
    return stream.events.length > 0;
  }
}
