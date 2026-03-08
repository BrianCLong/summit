"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventualConsistencyCoordinator = void 0;
class EventualConsistencyCoordinator {
    eventStore;
    consumers = new Map();
    constructor(eventStore) {
        this.eventStore = eventStore;
    }
    register(consumerId, projection) {
        this.consumers.set(consumerId, { projection, offsets: new Map() });
    }
    async catchUp(streamId) {
        for (const consumer of this.consumers.values()) {
            const lastOffset = consumer.offsets.get(streamId) ?? -1;
            const events = await this.eventStore.loadStream(streamId, lastOffset + 1);
            this.applyEvents(consumer, streamId, events);
        }
    }
    applyEvents(consumer, streamId, events) {
        for (const event of events) {
            consumer.projection.apply(event);
            consumer.offsets.set(streamId, event.version);
        }
    }
}
exports.EventualConsistencyCoordinator = EventualConsistencyCoordinator;
