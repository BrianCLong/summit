"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    handlers = new Map();
    subscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType) ?? new Set();
        handlers.add(handler);
        this.handlers.set(eventType, handlers);
        return () => handlers.delete(handler);
    }
    async publish(envelopes) {
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
exports.EventBus = EventBus;
