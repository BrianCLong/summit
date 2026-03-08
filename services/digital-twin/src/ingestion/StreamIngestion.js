"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamIngestion = void 0;
const kafkajs_1 = require("kafkajs");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'StreamIngestion' });
/**
 * Stream Ingestion Pipeline
 * Handles real-time data ingestion from Kafka topics
 */
class StreamIngestion {
    kafka;
    consumer;
    twinService;
    eventBus;
    running = false;
    topics = [
        'twin-data-updates',
        'iot-sensor-data',
        'entity-changes',
        'external-feeds',
    ];
    constructor(twinService, eventBus) {
        this.twinService = twinService;
        this.eventBus = eventBus;
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'twin-ingestion',
            brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
        });
        this.consumer = this.kafka.consumer({ groupId: 'twin-ingestion-group' });
    }
    async start() {
        await this.consumer.connect();
        for (const topic of this.topics) {
            try {
                await this.consumer.subscribe({ topic, fromBeginning: false });
                logger.info({ topic }, 'Subscribed to topic');
            }
            catch (error) {
                logger.warn({ topic, error }, 'Failed to subscribe to topic');
            }
        }
        await this.consumer.run({
            eachMessage: async (payload) => {
                await this.handleMessage(payload);
            },
        });
        this.running = true;
        logger.info('Stream ingestion started');
    }
    async stop() {
        this.running = false;
        await this.consumer.disconnect();
        logger.info('Stream ingestion stopped');
    }
    async handleMessage({ topic, message }) {
        if (!message.value) {
            return;
        }
        try {
            const data = JSON.parse(message.value.toString());
            logger.debug({ topic, twinId: data.twinId }, 'Processing message');
            // Route based on topic
            switch (topic) {
                case 'twin-data-updates':
                    await this.handleTwinUpdate(data);
                    break;
                case 'iot-sensor-data':
                    await this.handleSensorData(data);
                    break;
                case 'entity-changes':
                    await this.handleEntityChange(data);
                    break;
                case 'external-feeds':
                    await this.handleExternalFeed(data);
                    break;
                default:
                    logger.warn({ topic }, 'Unknown topic');
            }
        }
        catch (error) {
            logger.error({ topic, error }, 'Failed to process message');
        }
    }
    async handleTwinUpdate(data) {
        await this.twinService.updateState({
            twinId: data.twinId,
            properties: data.properties,
            source: data.source,
            confidence: 0.95,
        });
    }
    async handleSensorData(data) {
        // Transform sensor data format
        const transformed = {};
        for (const [key, value] of Object.entries(data.properties)) {
            transformed[`sensor_${key}`] = value;
        }
        await this.twinService.updateState({
            twinId: data.twinId,
            properties: transformed,
            source: `IOT:${data.source}`,
            confidence: 0.9,
        });
    }
    async handleEntityChange(data) {
        // Sync entity changes from main IntelGraph system
        await this.twinService.updateState({
            twinId: data.twinId,
            properties: data.properties,
            source: `ENTITY:${data.source}`,
            confidence: 0.99,
        });
    }
    async handleExternalFeed(data) {
        await this.twinService.updateState({
            twinId: data.twinId,
            properties: data.properties,
            source: `EXTERNAL:${data.source}`,
            confidence: 0.7, // Lower confidence for external data
        });
    }
}
exports.StreamIngestion = StreamIngestion;
