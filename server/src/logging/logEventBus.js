"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEventBus = exports.LogEventBus = void 0;
const events_1 = require("events");
class LogEventBus extends events_1.EventEmitter {
    capacity;
    buffer = [];
    constructor(capacity = 500) {
        super();
        this.capacity = capacity;
    }
    publish(event) {
        const enriched = {
            ...event,
            timestamp: event.timestamp ?? new Date().toISOString(),
        };
        this.buffer.push(enriched);
        if (this.buffer.length > this.capacity) {
            this.buffer.shift();
        }
        this.emit('log', enriched);
    }
    subscribe(listener) {
        this.on('log', listener);
        return () => this.off('log', listener);
    }
    recent(limit = 100) {
        return this.buffer.slice(-limit);
    }
    reset() {
        this.buffer.splice(0, this.buffer.length);
    }
}
exports.LogEventBus = LogEventBus;
exports.logEventBus = new LogEventBus(1000);
