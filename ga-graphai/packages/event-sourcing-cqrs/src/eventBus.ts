import type { EventEnvelope, EventHandler } from './types.js';

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): () => void {
    const handlers = this.handlers.get(eventType) ?? new Set<EventHandler>();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);
    return () => handlers.delete(handler);
  }

  async publish(envelopes: EventEnvelope[]): Promise<void> {
    for (const envelope of envelopes) {
      const handlers = this.handlers.get(envelope.event.type);
      if (!handlers) {
        continue;
      }
      for (const handler of handlers) {
        await handler(envelope);
      }
    }
  }
}
