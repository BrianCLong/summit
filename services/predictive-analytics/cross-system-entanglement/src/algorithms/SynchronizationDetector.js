"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynchronizationDetector = void 0;
const pino_1 = __importDefault(require("pino"));
const SynchronizationEvent_js_1 = require("../models/SynchronizationEvent.js");
const logger = (0, pino_1.default)({ name: 'SynchronizationDetector' });
class SynchronizationDetector {
    syncThreshold;
    windowSizes;
    minSystemCount;
    constructor(config = {}) {
        this.syncThreshold = config.syncThreshold ?? 0.7;
        this.windowSizes = config.windowSizes ?? [100, 1000, 5000, 30000];
        this.minSystemCount = config.minSystemCount ?? 2;
    }
    /**
     * Detect synchronization events across multiple systems
     */
    async detectSynchronization(events) {
        logger.info({ eventCount: events.length }, 'Starting synchronization detection');
        const syncEvents = [];
        // Sort events by timestamp
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        // Analyze each window size
        for (const windowSize of this.windowSizes) {
            const windowEvents = this.findSyncEvents(sortedEvents, windowSize);
            syncEvents.push(...windowEvents);
        }
        // Deduplicate and merge overlapping events
        const deduplicated = this.deduplicateEvents(syncEvents);
        logger.info({ syncEventsFound: deduplicated.length }, 'Synchronization detection complete');
        return deduplicated;
    }
    /**
     * Find synchronization events within a specific window size
     */
    findSyncEvents(events, windowSize) {
        const syncEvents = [];
        if (events.length === 0) {
            return syncEvents;
        }
        let windowStart = events[0].timestamp;
        let windowEnd = new Date(windowStart.getTime() + windowSize);
        while (windowStart.getTime() <= events[events.length - 1].timestamp.getTime()) {
            const windowEvents = this.getEventsInWindow(events, windowStart, windowEnd);
            if (windowEvents.length >= this.minSystemCount) {
                const syncEvent = this.analyzeWindow(windowEvents, windowSize);
                if (syncEvent && syncEvent.synchronizationScore >= this.syncThreshold) {
                    syncEvents.push(syncEvent);
                }
            }
            // Slide window forward by 1/4 of window size for overlap detection
            windowStart = new Date(windowStart.getTime() + windowSize / 4);
            windowEnd = new Date(windowStart.getTime() + windowSize);
        }
        return syncEvents;
    }
    /**
     * Get events within a time window
     */
    getEventsInWindow(events, startTime, endTime) {
        const startMs = startTime.getTime();
        const endMs = endTime.getTime();
        return events.filter((event) => {
            const eventMs = event.timestamp.getTime();
            return eventMs >= startMs && eventMs <= endMs;
        });
    }
    /**
     * Analyze a window of events for synchronization
     */
    analyzeWindow(events, windowSize) {
        // Group events by system
        const eventsBySystem = new Map();
        for (const event of events) {
            const systemEvents = eventsBySystem.get(event.systemId) || [];
            systemEvents.push(event);
            eventsBySystem.set(event.systemId, systemEvents);
        }
        const systems = Array.from(eventsBySystem.keys());
        if (systems.length < this.minSystemCount) {
            return null;
        }
        // Calculate synchronization score
        const timestamps = events.map((e) => e.timestamp);
        const score = (0, SynchronizationEvent_js_1.calculateSynchronizationScore)(timestamps, windowSize);
        if (score < this.syncThreshold) {
            return null;
        }
        // Merge metrics from all events
        const mergedMetrics = this.mergeEventMetrics(events);
        // Classify event type
        const eventType = this.classifyEventType(events, mergedMetrics);
        // Use median timestamp as event timestamp
        const medianTimestamp = this.getMedianTimestamp(timestamps);
        return (0, SynchronizationEvent_js_1.createSynchronizationEvent)(systems, eventType, score, windowSize, mergedMetrics);
    }
    /**
     * Merge metrics from multiple events
     */
    mergeEventMetrics(events) {
        const merged = {};
        const counts = {};
        for (const event of events) {
            for (const [key, value] of Object.entries(event.metrics)) {
                const normalizedKey = `${event.systemId}.${key}`;
                merged[normalizedKey] = (merged[normalizedKey] || 0) + value;
                counts[normalizedKey] = (counts[normalizedKey] || 0) + 1;
            }
        }
        // Average the values
        for (const key of Object.keys(merged)) {
            merged[key] = merged[key] / counts[key];
        }
        return merged;
    }
    /**
     * Classify event type based on event patterns and metrics
     */
    classifyEventType(events, metrics) {
        // Check event names for patterns
        const hasFailure = events.some((e) => e.eventName.toLowerCase().includes('error') ||
            e.eventName.toLowerCase().includes('failure') ||
            e.eventName.toLowerCase().includes('exception'));
        const hasStateChange = events.some((e) => e.eventName.toLowerCase().includes('state') ||
            e.eventName.toLowerCase().includes('status') ||
            e.eventName.toLowerCase().includes('transition'));
        const hasPerformance = events.some((e) => e.eventName.toLowerCase().includes('latency') ||
            e.eventName.toLowerCase().includes('throughput') ||
            e.eventName.toLowerCase().includes('performance'));
        if (hasFailure) {
            return 'FAILURE_CASCADE';
        }
        if (hasStateChange) {
            return 'STATE_CHANGE';
        }
        if (hasPerformance) {
            return 'PERFORMANCE_SHIFT';
        }
        // Fallback to metric-based classification
        return (0, SynchronizationEvent_js_1.classifyEventType)(metrics);
    }
    /**
     * Get median timestamp from array
     */
    getMedianTimestamp(timestamps) {
        const sorted = timestamps
            .map((t) => t.getTime())
            .sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return new Date((sorted[mid - 1] + sorted[mid]) / 2);
        }
        else {
            return new Date(sorted[mid]);
        }
    }
    /**
     * Deduplicate overlapping synchronization events
     */
    deduplicateEvents(events) {
        if (events.length === 0) {
            return [];
        }
        // Sort by timestamp and score
        const sorted = [...events].sort((a, b) => {
            const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
            if (timeDiff !== 0)
                return timeDiff;
            return b.synchronizationScore - a.synchronizationScore;
        });
        const deduplicated = [];
        const seen = new Set();
        for (const event of sorted) {
            const key = this.getEventKey(event);
            if (!seen.has(key)) {
                deduplicated.push(event);
                seen.add(key);
            }
            else {
                // If we've seen similar event, only keep if it has higher score
                const existingIndex = deduplicated.findIndex((e) => this.getEventKey(e) === key);
                if (existingIndex >= 0 &&
                    event.synchronizationScore >
                        deduplicated[existingIndex].synchronizationScore) {
                    deduplicated[existingIndex] = event;
                }
            }
        }
        return deduplicated;
    }
    /**
     * Generate unique key for event deduplication
     */
    getEventKey(event) {
        const systemsKey = event.systems.sort().join('-');
        const timeWindow = Math.floor(event.timestamp.getTime() / event.timeWindow);
        return `${systemsKey}-${timeWindow}-${event.eventType}`;
    }
    /**
     * Build temporal event matrix for pattern mining
     */
    buildEventMatrix(events, windowSize, bucketSize) {
        const matrix = new Map();
        if (events.length === 0) {
            return matrix;
        }
        const minTime = Math.min(...events.map((e) => e.timestamp.getTime()));
        const maxTime = Math.max(...events.map((e) => e.timestamp.getTime()));
        const numBuckets = Math.ceil((maxTime - minTime) / bucketSize);
        // Initialize matrix
        const systems = new Set(events.map((e) => e.systemId));
        for (const system of systems) {
            matrix.set(system, new Array(numBuckets).fill(0));
        }
        // Fill matrix
        for (const event of events) {
            const bucket = Math.floor((event.timestamp.getTime() - minTime) / bucketSize);
            const row = matrix.get(event.systemId);
            if (row) {
                row[bucket] = 1;
            }
        }
        return matrix;
    }
    /**
     * Find recurring synchronization patterns using simple pattern matching
     */
    findRecurringPatterns(events, minOccurrences = 3) {
        const patterns = new Map();
        for (const event of events) {
            const key = `${event.systems.sort().join('-')}-${event.eventType}`;
            if (patterns.has(key)) {
                patterns.get(key).count++;
            }
            else {
                patterns.set(key, {
                    systems: event.systems,
                    count: 1,
                    eventType: event.eventType,
                });
            }
        }
        return Array.from(patterns.values()).filter((pattern) => pattern.count >= minOccurrences);
    }
}
exports.SynchronizationDetector = SynchronizationDetector;
