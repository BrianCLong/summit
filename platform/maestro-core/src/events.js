"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    listeners = new Map();
    subscribe(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)?.push(handler);
    }
    emit(event) {
        const handlers = this.listeners.get(event.type) || [];
        handlers.forEach((h) => h(event));
    }
}
exports.EventBus = EventBus;
