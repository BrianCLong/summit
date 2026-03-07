import { IntentEvent, IntentVerb } from "./types.js";

interface Envelope<T> {
  event: T;
}

export class InMemoryEventBus<T = IntentEvent> {
  private readonly subscribers = new Map<string, Array<(envelope: Envelope<T>) => void>>();

  publish(topic: string, envelope: Envelope<T>): void {
    const handlers = this.subscribers.get(topic) ?? [];
    handlers.forEach((handler) => handler(envelope));
  }

  subscribe(topic: string, handler: (envelope: Envelope<T>) => void): void {
    const handlers = this.subscribers.get(topic) ?? [];
    handlers.push(handler);
    this.subscribers.set(topic, handlers);
  }
}

export class IntentTelemetry {
  private readonly bus: InMemoryEventBus<IntentEvent>;
  private readonly events: IntentEvent[] = [];
  private readonly allowedIntents: IntentVerb[] = [
    "request",
    "approve",
    "escalate",
    "undo",
    "preview",
  ];

  constructor(bus: InMemoryEventBus<IntentEvent> = new InMemoryEventBus()) {
    this.bus = bus;
  }

  log(event: IntentEvent): void {
    if (!this.allowedIntents.includes(event.intent)) {
      throw new Error(`Unsupported intent verb: ${event.intent}`);
    }
    if (!event.actor || !event.targetEntity || !event.targetId || !event.tenantId) {
      throw new Error("Intent events must include actor, targetEntity, targetId, and tenantId");
    }
    this.events.push(event);
    this.bus.publish(event.intent, { event });
  }

  subscribe(intent: IntentVerb, handler: (event: IntentEvent) => void): void {
    this.bus.subscribe(intent, (envelope) => handler(envelope.event as IntentEvent));
  }

  getRecorded(): IntentEvent[] {
    return [...this.events];
  }
}
