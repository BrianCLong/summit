"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationProcessor = void 0;
const StreamProcessor_js_1 = require("./StreamProcessor.js");
const StateStore_js_1 = require("./StateStore.js");
class AggregationProcessor extends StreamProcessor_js_1.StreamProcessor {
    stateStore;
    constructor(consumer, producer, sourceTopic, destTopic, name, stateStore) {
        super(consumer, producer, sourceTopic, destTopic, name);
        this.stateStore = stateStore || new StateStore_js_1.InMemoryStateStore();
    }
    async process(message) {
        // Expecting CloudEvent structure
        const entityId = message.subject || message.data?.id;
        if (!entityId)
            return null;
        // Idempotency check (deduplication)
        // Assumes message.id is unique per event
        if (message.id) {
            const processedKey = `proc:${entityId}:${message.id}`;
            const isProcessed = await this.stateStore.get(processedKey);
            if (isProcessed) {
                this.logger.info(`Duplicate message ${message.id} for entity ${entityId} ignored`);
                return null;
            }
            // Mark as processed for 1 hour
            await this.stateStore.set(processedKey, '1', 3600);
        }
        // Use State Store for persistence
        const key = `agg:${entityId}`;
        const newCount = await this.stateStore.increment(key, 1);
        this.logger.info(`Entity ${entityId} count: ${newCount}`);
        // Emit an update every 5 events
        if (newCount % 5 === 0) {
            return {
                type: 'AGGREGATION_UPDATE',
                entityId,
                count: newCount,
                timestamp: new Date().toISOString(),
            };
        }
        return null;
    }
}
exports.AggregationProcessor = AggregationProcessor;
