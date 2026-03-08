"use strict";
/**
 * EventReplayer - Replay events for rebuilding read models
 *
 * Stream and replay events with progress tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReplayer = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class EventReplayer extends events_1.EventEmitter {
    eventStore;
    logger;
    handlers = new Map();
    catchAllHandlers = [];
    constructor(eventStore) {
        super();
        this.eventStore = eventStore;
        this.logger = (0, pino_1.default)({ name: 'EventReplayer' });
    }
    /**
     * Register event handler for specific event type
     */
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
        return this;
    }
    /**
     * Register catch-all handler for all events
     */
    onAny(handler) {
        this.catchAllHandlers.push(handler);
        return this;
    }
    /**
     * Replay all events
     */
    async replay(options = {}) {
        const startTime = new Date();
        let processedEvents = 0;
        let totalEvents = 0;
        this.logger.info({ options }, 'Starting event replay');
        this.emit('replay:started');
        try {
            const batchSize = options.batchSize || 1000;
            const eventBatches = await this.eventStore.getAllEvents(options.fromTimestamp, batchSize);
            for await (const events of eventBatches) {
                // Filter events by version and timestamp
                const filteredEvents = events.filter(event => {
                    if (options.fromVersion !== undefined &&
                        event.version < options.fromVersion) {
                        return false;
                    }
                    if (options.toVersion !== undefined &&
                        event.version > options.toVersion) {
                        return false;
                    }
                    if (options.fromTimestamp &&
                        event.timestamp < options.fromTimestamp) {
                        return false;
                    }
                    if (options.toTimestamp &&
                        event.timestamp > options.toTimestamp) {
                        return false;
                    }
                    return true;
                });
                totalEvents += filteredEvents.length;
                // Process events in batch
                for (const event of filteredEvents) {
                    await this.processEvent(event);
                    processedEvents++;
                    if (processedEvents % 1000 === 0) {
                        const progress = this.calculateProgress(startTime, totalEvents, processedEvents);
                        this.emit('replay:progress', progress);
                        this.logger.info(progress, 'Replay progress');
                    }
                }
            }
            const finalProgress = this.calculateProgress(startTime, totalEvents, processedEvents);
            this.emit('replay:completed', finalProgress);
            this.logger.info(finalProgress, 'Replay completed');
            return finalProgress;
        }
        catch (err) {
            this.logger.error({ err }, 'Replay failed');
            this.emit('replay:failed', err);
            throw err;
        }
    }
    /**
     * Replay events for specific aggregate
     */
    async replayAggregate(aggregateId, fromVersion = 0) {
        this.logger.info({ aggregateId, fromVersion }, 'Replaying aggregate');
        const stream = await this.eventStore.getEventStream(aggregateId, fromVersion);
        for (const event of stream.events) {
            await this.processEvent(event);
        }
        return stream.events.length;
    }
    /**
     * Process a single event
     */
    async processEvent(event) {
        try {
            // Call type-specific handlers
            const handlers = this.handlers.get(event.eventType) || [];
            for (const handler of handlers) {
                await handler(event);
            }
            // Call catch-all handlers
            for (const handler of this.catchAllHandlers) {
                await handler(event);
            }
            this.emit('event:processed', event);
        }
        catch (err) {
            this.logger.error({ err, eventId: event.eventId, eventType: event.eventType }, 'Event processing failed');
            this.emit('event:failed', { event, error: err });
            throw err;
        }
    }
    /**
     * Calculate replay progress
     */
    calculateProgress(startTime, totalEvents, processedEvents) {
        const elapsedMs = Date.now() - startTime.getTime();
        const eventsPerSecond = processedEvents / (elapsedMs / 1000);
        return {
            totalEvents,
            processedEvents,
            startTime,
            elapsedMs,
            eventsPerSecond
        };
    }
}
exports.EventReplayer = EventReplayer;
