"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
class EventPublisher {
    events = [];
    publish(event) {
        this.events.push(event);
    }
}
exports.EventPublisher = EventPublisher;
