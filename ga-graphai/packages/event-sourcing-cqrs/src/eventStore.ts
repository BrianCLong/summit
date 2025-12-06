import { randomUUID } from 'crypto';
import type { DomainEvent, EventEnvelope } from './types.js';

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

export interface EventStore {
  append(
    streamId: string,
    events: DomainEvent[],
    expectedVersion?: number,
  ): Promise<EventEnvelope[]>;
  loadStream(streamId: string, fromVersion?: number): Promise<EventEnvelope[]>;
  loadSince(timestamp: string): Promise<EventEnvelope[]>;
}

export class InMemoryEventStore implements EventStore {
  private readonly streams = new Map<string, EventEnvelope[]>();

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number = -1,
  ): Promise<EventEnvelope[]> {
    const currentEvents = this.streams.get(streamId) ?? [];
    const lastVersion = currentEvents.at(-1)?.version ?? -1;

    if (expectedVersion !== -2 && expectedVersion !== lastVersion) {
      throw new ConcurrencyError(
        `Version mismatch for ${streamId}: expected ${expectedVersion}, actual ${lastVersion}`,
      );
    }

    const appended = events.map((event, index) => {
      const version = lastVersion + index + 1;
      return {
        id: randomUUID(),
        streamId,
        version,
        timestamp: new Date().toISOString(),
        event,
      } satisfies EventEnvelope;
    });

    this.streams.set(streamId, [...currentEvents, ...appended]);
    return appended;
  }

  async loadStream(streamId: string, fromVersion = 0): Promise<EventEnvelope[]> {
    const events = this.streams.get(streamId) ?? [];
    return events.filter((event) => event.version >= fromVersion);
  }

  async loadSince(timestamp: string): Promise<EventEnvelope[]> {
    const threshold = new Date(timestamp).getTime();
    return Array.from(this.streams.values())
      .flat()
      .filter((entry) => new Date(entry.timestamp).getTime() >= threshold)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
