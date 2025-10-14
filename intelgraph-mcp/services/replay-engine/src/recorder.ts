import { randomUUID, createHash } from 'crypto';
import { Recording, IOEvent } from './model';

export class Recorder {
  start(sessionId: string, seed: string, meta?: Record<string, unknown>): Recording {
    return {
      id: `rec_${randomUUID()}`,
      sessionId,
      seed,
      events: [],
      version: '1',
      meta,
      startedAt: new Date().toISOString()
    };
  }

  push(rec: Recording, ev: Omit<IOEvent, 'hash'>): IOEvent {
    const hashed: IOEvent = {
      ...ev,
      hash: hashPayload(ev.payload)
    };
    rec.events.push(hashed);
    return hashed;
  }
}

function hashPayload(payload: unknown): string {
  const h = createHash('sha256');
  h.update(JSON.stringify(payload));
  return h.digest('hex');
}
