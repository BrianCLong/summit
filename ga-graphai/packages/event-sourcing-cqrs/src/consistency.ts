import type { EventStore } from './eventStore.js';
import type { Projection } from './queryModel.js';
import type { EventEnvelope } from './types.js';

interface ConsumerState {
  projection: Projection<unknown>;
  offsets: Map<string, number>;
}

export class EventualConsistencyCoordinator {
  private readonly consumers = new Map<string, ConsumerState>();

  constructor(private readonly eventStore: EventStore) {}

  register(consumerId: string, projection: Projection<unknown>): void {
    this.consumers.set(consumerId, { projection, offsets: new Map() });
  }

  async catchUp(streamId: string): Promise<void> {
    for (const consumer of this.consumers.values()) {
      const lastOffset = consumer.offsets.get(streamId) ?? -1;
      const events = await this.eventStore.loadStream(streamId, lastOffset + 1);
      this.applyEvents(consumer, streamId, events);
    }
  }

  private applyEvents(
    consumer: ConsumerState,
    streamId: string,
    events: EventEnvelope[],
  ): void {
    for (const event of events) {
      consumer.projection.apply(event);
      consumer.offsets.set(streamId, event.version);
    }
  }
}
