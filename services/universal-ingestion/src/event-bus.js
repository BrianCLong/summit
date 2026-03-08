"use strict";
/**
 * Ingest Event Bus
 *
 * Abstract interface for emitting ingestion events.
 * Default implementation uses in-memory queue, can be replaced with Kafka adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaEventBus = exports.InMemoryEventBus = void 0;
/**
 * In-Memory Event Bus (for development/testing)
 */
class InMemoryEventBus {
    events = [];
    maxEvents;
    constructor(maxEvents = 10000) {
        this.maxEvents = maxEvents;
    }
    async emit(event) {
        this.events.push(event);
        // Simple overflow protection
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }
    }
    async emitBatch(events) {
        for (const event of events) {
            await this.emit(event);
        }
    }
    async flush() {
        // No-op for in-memory implementation
    }
    async close() {
        // No-op for in-memory implementation
    }
    /**
     * Get all emitted events (for testing)
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Clear all events (for testing)
     */
    clear() {
        this.events = [];
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
/**
 * Kafka Event Bus (future implementation)
 *
 * This would use a real Kafka client to emit events.
 */
class KafkaEventBus {
    kafkaConfig;
    constructor(kafkaConfig) {
        this.kafkaConfig = kafkaConfig;
        // In a real implementation, initialize Kafka producer here
        throw new Error('KafkaEventBus not yet implemented. Use InMemoryEventBus for now.');
    }
    async emit(event) {
        // Serialize and send to Kafka
        throw new Error('Not implemented');
    }
    async emitBatch(events) {
        // Batch send to Kafka
        throw new Error('Not implemented');
    }
    async flush() {
        // Flush Kafka producer
        throw new Error('Not implemented');
    }
    async close() {
        // Close Kafka producer
        throw new Error('Not implemented');
    }
}
exports.KafkaEventBus = KafkaEventBus;
