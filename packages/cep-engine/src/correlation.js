"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCorrelator = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'event-correlator' });
/**
 * Event correlator for cross-stream correlation
 */
class EventCorrelator extends eventemitter3_1.EventEmitter {
    criteria;
    correlationGroups = new Map();
    constructor(criteria) {
        super();
        this.criteria = criteria;
        this.startCleanup();
    }
    /**
     * Add event to correlation
     */
    addEvent(stream, event) {
        if (!this.criteria.streams.includes(stream)) {
            return [];
        }
        const correlationKey = this.criteria.correlationKey(event);
        let group = this.correlationGroups.get(correlationKey);
        if (!group) {
            group = {
                key: correlationKey,
                events: new Map(),
                startTime: Date.now(),
            };
            this.correlationGroups.set(correlationKey, group);
        }
        // Add event to stream
        if (!group.events.has(stream)) {
            group.events.set(stream, []);
        }
        group.events.get(stream).push({
            stream,
            event,
            timestamp: Date.now(),
        });
        // Check if correlation is complete
        if (this.isCorrelationComplete(group)) {
            return [this.createCorrelatedEvents(group)];
        }
        return [];
    }
    /**
     * Check if correlation is complete
     */
    isCorrelationComplete(group) {
        // Check if minimum streams have events
        const streamCount = group.events.size;
        if (streamCount < this.criteria.minimumMatches) {
            return false;
        }
        // Check time window
        const elapsed = Date.now() - group.startTime;
        if (elapsed > this.criteria.timeWindow) {
            return true; // Consider complete even if partial
        }
        return streamCount >= this.criteria.streams.length;
    }
    /**
     * Create correlated events result
     */
    createCorrelatedEvents(group) {
        const events = [];
        for (const [stream, streamEvents] of group.events) {
            events.push(...streamEvents);
        }
        return {
            correlationKey: group.key,
            events,
            streamCount: group.events.size,
            startTime: group.startTime,
            endTime: Date.now(),
        };
    }
    /**
     * Cleanup old correlation groups
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, group] of this.correlationGroups) {
                if (now - group.startTime > this.criteria.timeWindow * 2) {
                    this.correlationGroups.delete(key);
                }
            }
        }, this.criteria.timeWindow);
    }
}
exports.EventCorrelator = EventCorrelator;
