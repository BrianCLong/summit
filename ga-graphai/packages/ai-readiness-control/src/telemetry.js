"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentTelemetry = exports.InMemoryEventBus = void 0;
class InMemoryEventBus {
    subscribers = new Map();
    publish(topic, envelope) {
        const handlers = this.subscribers.get(topic) ?? [];
        handlers.forEach((handler) => handler(envelope));
    }
    subscribe(topic, handler) {
        const handlers = this.subscribers.get(topic) ?? [];
        handlers.push(handler);
        this.subscribers.set(topic, handlers);
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
class IntentTelemetry {
    bus;
    events = [];
    allowedIntents = ['request', 'approve', 'escalate', 'undo', 'preview'];
    constructor(bus = new InMemoryEventBus()) {
        this.bus = bus;
    }
    log(event) {
        if (!this.allowedIntents.includes(event.intent)) {
            throw new Error(`Unsupported intent verb: ${event.intent}`);
        }
        if (!event.actor || !event.targetEntity || !event.targetId || !event.tenantId) {
            throw new Error('Intent events must include actor, targetEntity, targetId, and tenantId');
        }
        this.events.push(event);
        this.bus.publish(event.intent, { event });
    }
    subscribe(intent, handler) {
        this.bus.subscribe(intent, (envelope) => handler(envelope.event));
    }
    getRecorded() {
        return [...this.events];
    }
}
exports.IntentTelemetry = IntentTelemetry;
