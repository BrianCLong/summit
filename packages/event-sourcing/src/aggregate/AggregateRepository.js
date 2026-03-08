"use strict";
/**
 * AggregateRepository - Manage aggregate lifecycle and persistence
 *
 * Load, save, and manage aggregates with event sourcing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRepository = exports.Aggregate = void 0;
const pino_1 = __importDefault(require("pino"));
class Aggregate {
    id;
    type;
    version = 0;
    state;
    uncommittedEvents = [];
    constructor(id, type, initialState) {
        this.id = id;
        this.type = type;
        this.state = initialState;
    }
    /**
     * Apply an event to the aggregate
     */
    applyEvent(event) {
        this.apply(event);
        this.version = event.version;
    }
    /**
     * Raise a new event
     */
    raiseEvent(eventType, payload) {
        const event = {
            eventId: '',
            eventType,
            aggregateId: this.id,
            aggregateType: this.type,
            version: this.version + 1,
            timestamp: new Date(),
            payload
        };
        this.applyEvent(event);
        this.uncommittedEvents.push(event);
    }
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Get uncommitted events
     */
    getUncommittedEvents() {
        return [...this.uncommittedEvents];
    }
    /**
     * Clear uncommitted events
     */
    clearUncommittedEvents() {
        this.uncommittedEvents = [];
    }
    /**
     * Load from snapshot
     */
    loadFromSnapshot(snapshot) {
        this.state = snapshot.state;
        this.version = snapshot.version;
    }
}
exports.Aggregate = Aggregate;
class AggregateRepository {
    eventStore;
    snapshotStore;
    aggregateConstructor;
    logger;
    snapshotInterval;
    constructor(eventStore, aggregateConstructor, snapshotStore, snapshotInterval = 100) {
        this.eventStore = eventStore;
        this.snapshotStore = snapshotStore;
        this.aggregateConstructor = aggregateConstructor;
        this.snapshotInterval = snapshotInterval;
        this.logger = (0, pino_1.default)({ name: 'AggregateRepository' });
    }
    /**
     * Load aggregate by ID
     */
    async load(aggregateId) {
        const aggregate = new this.aggregateConstructor(aggregateId);
        let fromVersion = 0;
        // Try to load from snapshot
        if (this.snapshotStore) {
            const snapshot = await this.snapshotStore.getLatestSnapshot(aggregateId);
            if (snapshot) {
                aggregate.loadFromSnapshot(snapshot);
                fromVersion = snapshot.version;
                this.logger.debug({ aggregateId, version: snapshot.version }, 'Loaded from snapshot');
            }
        }
        // Load events since snapshot
        const stream = await this.eventStore.getEventStream(aggregateId, fromVersion);
        for (const event of stream.events) {
            aggregate.applyEvent(event);
        }
        this.logger.debug({ aggregateId, version: aggregate.version, events: stream.events.length }, 'Aggregate loaded');
        return aggregate;
    }
    /**
     * Save aggregate
     */
    async save(aggregate, expectedVersion) {
        const uncommittedEvents = aggregate.getUncommittedEvents();
        if (uncommittedEvents.length === 0) {
            return;
        }
        // Append events to store
        await this.eventStore.appendEvents(aggregate.id, aggregate.type, uncommittedEvents, expectedVersion);
        aggregate.clearUncommittedEvents();
        // Create snapshot if needed
        if (this.snapshotStore &&
            aggregate.version % this.snapshotInterval === 0) {
            await this.snapshotStore.saveSnapshot({
                aggregateId: aggregate.id,
                aggregateType: aggregate.type,
                version: aggregate.version,
                timestamp: new Date(),
                state: aggregate.getState()
            });
            this.logger.debug({ aggregateId: aggregate.id, version: aggregate.version }, 'Snapshot created');
        }
        this.logger.debug({
            aggregateId: aggregate.id,
            version: aggregate.version,
            events: uncommittedEvents.length
        }, 'Aggregate saved');
    }
    /**
     * Check if aggregate exists
     */
    async exists(aggregateId) {
        const stream = await this.eventStore.getEventStream(aggregateId);
        return stream.events.length > 0;
    }
}
exports.AggregateRepository = AggregateRepository;
