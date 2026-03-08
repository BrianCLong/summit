"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationService = exports.CorrelationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class CorrelationService {
    eventsByKey = new Map();
    windowMs;
    constructor(windowMs = 5 * 60 * 1000) {
        this.windowMs = windowMs;
    }
    correlate(events) {
        for (const e of events) {
            const key = this.getCorrelationKey(e);
            if (!this.eventsByKey.has(key)) {
                this.eventsByKey.set(key, []);
            }
            this.eventsByKey.get(key).push(e);
        }
        const incidents = [];
        for (const [key, list] of this.eventsByKey) {
            // Sort by timestamp
            list.sort((a, b) => a.timestamp - b.timestamp);
            let bucket = [];
            if (list.length === 0)
                continue;
            let start = list[0].timestamp;
            for (const ev of list) {
                if (ev.timestamp - start > this.windowMs) {
                    if (bucket.length > 0) {
                        incidents.push(this.makeIncident(key, bucket));
                    }
                    bucket = [];
                    start = ev.timestamp;
                }
                bucket.push(ev);
            }
            if (bucket.length > 0) {
                incidents.push(this.makeIncident(key, bucket));
            }
        }
        // Clear processed events or manage state in a real persistent way
        // For now, we clear the map to simulate processing a batch
        this.eventsByKey.clear();
        return incidents;
    }
    getCorrelationKey(event) {
        // Simple key based on sorted entities. In prod, use normalized IDs.
        return event.entities ? event.entities.sort().join('|') : 'global';
    }
    makeIncident(key, events) {
        const start = events[0].timestamp;
        const end = events[events.length - 1].timestamp;
        let severity = 'low';
        if (events.length >= 5)
            severity = 'critical';
        else if (events.length >= 3)
            severity = 'high';
        else if (events.length === 2)
            severity = 'medium';
        return {
            id: crypto_1.default.randomUUID(),
            key,
            start,
            end,
            events,
            severity
        };
    }
}
exports.CorrelationService = CorrelationService;
exports.correlationService = new CorrelationService();
