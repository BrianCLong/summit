"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventConsumer = void 0;
const kafkajs_1 = require("kafkajs");
const crypto_1 = require("crypto");
const types_js_1 = require("./types.js");
class EventConsumer {
    kafka;
    consumer;
    eventStore;
    logger;
    isRunning = false;
    constructor(brokers, groupId, eventStore, logger) {
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'streaming-ingest',
            brokers,
        });
        this.consumer = this.kafka.consumer({ groupId });
        this.eventStore = eventStore;
        this.logger = logger.child({ component: 'EventConsumer' });
    }
    /**
     * Start consuming events from Kafka
     */
    async start(topics) {
        await this.consumer.connect();
        await this.consumer.subscribe({ topics, fromBeginning: false });
        this.isRunning = true;
        await this.consumer.run({
            eachMessage: async (payload) => {
                await this.processMessage(payload);
            },
        });
        this.logger.info({ topics }, 'Event consumer started');
    }
    /**
     * Process individual message with schema validation and provenance
     */
    async processMessage(payload) {
        const { topic, partition, message } = payload;
        try {
            // Parse and validate event
            const rawEvent = JSON.parse(message.value?.toString() || '{}');
            // Add provenance metadata
            const eventWithProvenance = this.enrichWithProvenance(rawEvent, topic);
            // Validate against schema
            const validatedEvent = types_js_1.EventSchema.parse(eventWithProvenance);
            // Append to event store
            await this.eventStore.append(validatedEvent, partition, message.offset);
            this.logger.debug({
                eventId: validatedEvent.id,
                type: validatedEvent.type,
                partition,
                offset: message.offset,
            }, 'Event processed and stored');
        }
        catch (error) {
            this.logger.error({
                error,
                topic,
                partition,
                offset: message.offset,
            }, 'Failed to process event');
            // In production, you might want to send to a dead-letter queue
            throw error;
        }
    }
    /**
     * Enrich event with provenance metadata
     */
    enrichWithProvenance(rawEvent, topic) {
        const now = Date.now();
        // Ensure event has required structure
        const event = {
            id: rawEvent.id || (0, crypto_1.randomUUID)(),
            type: rawEvent.type,
            source: rawEvent.source || topic,
            timestamp: rawEvent.timestamp || now,
            data: rawEvent.data || {},
            metadata: rawEvent.metadata || {},
            provenance: rawEvent.provenance || {},
        };
        // Calculate content hash
        const contentHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ type: event.type, data: event.data }))
            .digest('hex');
        // Enrich provenance
        event.provenance = {
            hash: contentHash,
            signature: event.provenance.signature,
            policyTags: event.provenance.policyTags || [],
            classification: event.provenance.classification || 'UNCLASSIFIED',
            source: event.source,
            ingestionTime: now,
            transformations: event.provenance.transformations || [],
        };
        return event;
    }
    /**
     * Stop consuming
     */
    async stop() {
        this.isRunning = false;
        await this.consumer.disconnect();
        this.logger.info('Event consumer stopped');
    }
    /**
     * Batch processing for high throughput
     */
    async startBatch(topics, batchSize = 100) {
        await this.consumer.connect();
        await this.consumer.subscribe({ topics, fromBeginning: false });
        this.isRunning = true;
        await this.consumer.run({
            eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
                const events = [];
                for (const message of batch.messages) {
                    try {
                        const rawEvent = JSON.parse(message.value?.toString() || '{}');
                        const eventWithProvenance = this.enrichWithProvenance(rawEvent, batch.topic);
                        const validatedEvent = types_js_1.EventSchema.parse(eventWithProvenance);
                        events.push({
                            event: validatedEvent,
                            partition: batch.partition,
                            offset: message.offset,
                        });
                        // Commit offset after processing
                        resolveOffset(message.offset);
                    }
                    catch (error) {
                        this.logger.error({ error, offset: message.offset }, 'Failed to process event in batch');
                    }
                }
                // Batch append to event store
                if (events.length > 0) {
                    await this.eventStore.batchAppend(events);
                }
                // Send heartbeat to keep consumer alive
                await heartbeat();
                this.logger.debug({ topic: batch.topic, partition: batch.partition, count: events.length }, 'Batch processed');
            },
        });
        this.logger.info({ topics, batchSize }, 'Event consumer started in batch mode');
    }
}
exports.EventConsumer = EventConsumer;
