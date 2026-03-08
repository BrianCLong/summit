"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true },
    },
});
class LoadTester {
    kafka;
    producer;
    config;
    eventsSent = 0;
    startTime = 0;
    constructor(config) {
        this.config = config;
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'load-tester',
            brokers: config.brokers,
        });
        this.producer = this.kafka.producer({
            idempotent: true,
            maxInFlightRequests: 5,
            transactionalId: `load-tester-${(0, crypto_1.randomUUID)()}`,
        });
    }
    async run() {
        await this.producer.connect();
        logger.info({ config: this.config }, 'Load test starting');
        this.startTime = Date.now();
        const endTime = this.startTime + this.config.duration * 1000;
        const intervalMs = (this.config.batchSize / this.config.targetThroughput) * 1000;
        const interval = setInterval(async () => {
            if (Date.now() >= endTime) {
                clearInterval(interval);
                await this.finish();
                return;
            }
            await this.sendBatch();
        }, intervalMs);
    }
    async sendBatch() {
        const messages = [];
        for (let i = 0; i < this.config.batchSize; i++) {
            messages.push({
                key: (0, crypto_1.randomUUID)(),
                value: JSON.stringify(this.generateEvent()),
            });
        }
        try {
            await this.producer.send({
                topic: this.config.topic,
                messages,
            });
            this.eventsSent += messages.length;
            const elapsed = (Date.now() - this.startTime) / 1000;
            const currentThroughput = Math.round(this.eventsSent / elapsed);
            if (this.eventsSent % 1000 === 0) {
                logger.info({
                    sent: this.eventsSent,
                    elapsed: elapsed.toFixed(1),
                    throughput: currentThroughput,
                    target: this.config.targetThroughput,
                }, 'Progress');
            }
        }
        catch (error) {
            logger.error({ error }, 'Failed to send batch');
        }
    }
    generateEvent() {
        const eventTypes = [
            'entity.created',
            'entity.updated',
            'relationship.created',
            'analytics.completed',
            'audit.logged',
        ];
        const sources = [
            'intelligence-platform',
            'copilot-service',
            'data-ingestion',
            'external-feed',
        ];
        return {
            id: (0, crypto_1.randomUUID)(),
            type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            timestamp: Date.now(),
            data: {
                entityId: `entity-${(0, crypto_1.randomUUID)()}`,
                value: Math.random(),
                metadata: {
                    randomField1: Math.random().toString(36),
                    randomField2: Math.floor(Math.random() * 1000),
                },
            },
            metadata: {
                version: '1.0.0',
                userId: `user-${Math.floor(Math.random() * 100)}`,
                tenantId: `tenant-${Math.floor(Math.random() * 10)}`,
            },
            provenance: {
                policyTags: ['LOAD_TEST'],
                classification: 'UNCLASSIFIED',
                source: 'load-tester',
            },
        };
    }
    async finish() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const actualThroughput = Math.round(this.eventsSent / elapsed);
        logger.info({
            totalEvents: this.eventsSent,
            duration: elapsed.toFixed(1),
            targetThroughput: this.config.targetThroughput,
            actualThroughput,
            efficiency: ((actualThroughput / this.config.targetThroughput) * 100).toFixed(1) + '%',
        }, 'Load test completed');
        await this.producer.disconnect();
        process.exit(0);
    }
}
// Run load test
const config = {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'events',
    targetThroughput: parseInt(process.env.TARGET_THROUGHPUT || '10000', 10),
    duration: parseInt(process.env.DURATION || '60', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
};
const tester = new LoadTester(config);
tester.run().catch((error) => {
    logger.error({ error }, 'Load test failed');
    process.exit(1);
});
