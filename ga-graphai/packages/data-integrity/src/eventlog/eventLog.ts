import { stableHash } from "../canonical/canonicalizer.js";

export interface CanonicalEvent {
  id: string;
  type: string;
  scope: string;
  actor: string;
  timestamp: string;
  payload: unknown;
  payloadHash: string;
  prevHash?: string;
  signature?: string;
}

export interface EventLogOptions {
  signer?: (payloadHash: string) => string;
}

export class EventLog {
  private events: CanonicalEvent[] = [];
  constructor(private readonly options: EventLogOptions = {}) {}

  append(event: Omit<CanonicalEvent, "payloadHash" | "prevHash" | "signature">): CanonicalEvent {
    const payloadHash = stableHash(event.payload);
    const prevHash = this.events.at(-1)?.payloadHash;
    const signature = this.options.signer ? this.options.signer(payloadHash) : undefined;
    const canonical: CanonicalEvent = { ...event, payloadHash, prevHash, signature };
    this.events.push(canonical);
    return canonical;
  }

  list(cursor = 0, limit = 20): CanonicalEvent[] {
    return this.events.slice(cursor, cursor + limit);
  }

  verify(scope: string, start = 0, end?: number): { valid: boolean; tamperedAt?: number } {
    const slice = this.events
      .filter((event) => event.scope === scope)
      .slice(start, end ?? undefined);
    for (let i = 0; i < slice.length; i += 1) {
      const current = slice[i];
      const expectedHash = stableHash(current.payload);
      if (current.payloadHash !== expectedHash) {
        return { valid: false, tamperedAt: i + start };
      }
      if (i > 0) {
        const prev = slice[i - 1];
        if (current.prevHash !== prev.payloadHash) {
          return { valid: false, tamperedAt: i + start };
        }
      }
    }
    return { valid: true };
  }
}
