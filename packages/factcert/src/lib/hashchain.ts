import { createHash } from 'node:crypto';
import { stableJson } from './stable_json.js';

export interface ChainEvent<T = unknown> {
  index: number;
  prev_hash: string;
  data: T;
  hash: string;
}

export class HashChain {
  private events: ChainEvent[] = [];

  constructor(initialEvents: ChainEvent[] = []) {
    this.events = initialEvents;
  }

  get length(): number {
    return this.events.length;
  }

  get allEvents(): ChainEvent[] {
    return this.events;
  }

  get lastHash(): string {
    return this.events.length > 0
      ? this.events[this.events.length - 1].hash
      : '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash (32 bytes hex)
  }

  /**
   * Add a new event to the chain.
   * @param data The event data.
   * @returns The created event.
   */
  addEvent<T>(data: T): ChainEvent<T> {
    const prev_hash = this.lastHash;
    const index = this.events.length;

    // Construct the payload to hash.
    // We include index and prev_hash to bind position and history.
    const payload = {
      index,
      prev_hash,
      data
    };

    const hash = createHash('sha256').update(stableJson(payload)).digest('hex');

    const event: ChainEvent<T> = {
      index,
      prev_hash,
      data,
      hash
    };

    this.events.push(event as ChainEvent);
    return event;
  }

  /**
   * Verify the integrity of the chain.
   * @returns True if valid, false otherwise.
   */
  verify(): boolean {
    if (this.events.length === 0) return true;

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];

      // Check index
      if (event.index !== i) return false;

      // Check prev_hash linking
      if (event.prev_hash !== expectedPrevHash) return false;

      // Check hash integrity
      const payload = {
        index: event.index,
        prev_hash: event.prev_hash,
        data: event.data
      };
      const calculatedHash = createHash('sha256').update(stableJson(payload)).digest('hex');

      if (calculatedHash !== event.hash) return false;

      expectedPrevHash = event.hash;
    }

    return true;
  }
}
