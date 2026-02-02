import { createHash } from 'node:crypto';
import { stableStringify } from './stable_json.js';

export interface ChainEvent {
  seq: number;
  prev_hash: string;
  type: string;
  payload: any;
  event_hash: string;
}

export class HashChain {
  private events: ChainEvent[] = [];

  constructor(events?: ChainEvent[]) {
    if (events && events.length > 0) {
      this.events = events;
    } else {
      // Genesis block
      this.events.push({
        seq: 0,
        prev_hash: '',
        type: 'GENESIS',
        payload: {},
        event_hash: '0'.repeat(64)
      });
    }
  }

  addEvent(type: string, payload: any): ChainEvent {
    const lastEvent = this.events[this.events.length - 1];
    const seq = lastEvent.seq + 1;
    const prev_hash = lastEvent.event_hash;

    // Hash content: seq + prev_hash + type + stable_payload
    const content = `${seq}:${prev_hash}:${type}:${stableStringify(payload)}`;
    const event_hash = createHash('sha256').update(content).digest('hex');

    const event: ChainEvent = {
      seq,
      prev_hash,
      type,
      payload,
      event_hash
    };

    this.events.push(event);
    return event;
  }

  getChain(): ChainEvent[] {
    return this.events;
  }

  verify(): boolean {
    // Check Genesis
    if (this.events.length === 0) return false;
    const genesis = this.events[0];
    if (genesis.seq !== 0 || genesis.event_hash !== '0'.repeat(64)) return false;

    for (let i = 1; i < this.events.length; i++) {
      const event = this.events[i];
      const prev = this.events[i-1];

      if (event.prev_hash !== prev.event_hash) return false;
      if (event.seq !== prev.seq + 1) return false;

      const content = `${event.seq}:${event.prev_hash}:${event.type}:${stableStringify(event.payload)}`;
      const calculatedHash = createHash('sha256').update(content).digest('hex');

      if (calculatedHash !== event.event_hash) return false;
    }
    return true;
  }
}
